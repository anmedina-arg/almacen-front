import type { SupabaseClient } from '@supabase/supabase-js';
import type { Order, OrderWithItems } from '@/features/admin/types/order.types';
import type { CreateOrderSchemaInput, UpdateOrderSchemaInput } from '../schemas/orderSchemas';
import { NotFoundError, ValidationError } from '@/lib/api/errors';

/**
 * Service del núcleo de Orders (#119) — ver ADR-0013, mismo patrón que
 * productService.ts. Cada función recibe storeId explícito. Items, payments
 * y asignación de cliente quedan en features/admin/ hasta que migren en
 * #120; POS (#121) sigue llamando a create_order() por su cuenta.
 */

/** Un producto de la orden se quedó sin stock — create_order() ya devuelve la lista completa de faltantes, no solo el primero (ver reserve_order_stock.sql, #73). */
export class InsufficientStockError extends Error {
  constructor(public readonly products: Array<{ id: number; name: string; requested: number; available: number }>) {
    super('insufficient_stock');
  }
}

type OrderWithMargin = Order & { total_cost: number; margin: number; margin_pct: number };

export async function getOrders(supabase: SupabaseClient, storeId: number): Promise<OrderWithMargin[]> {
  const { data, error } = await supabase
    .from('orders')
    // Trae los ítems en la misma query (evita un segundo round-trip que
    // pueda fallar/devolver vacío de forma independiente del principal).
    .select('*, order_items(unit_cost, unit_price, subtotal, product_name), clients(id, barrio, manzana_lote, display_code), order_payments(id, method, amount)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Margen por orden a partir de sus ítems anidados. subtotal * (unit_cost /
  // unit_price) en vez de quantity * unit_cost — evita el error de 100x en
  // productos por peso, donde quantity está en gramos crudos pero
  // unit_price/unit_cost son por 100gr.
  return (data ?? []).map((order) => {
    const items: { unit_cost: number; unit_price: number; subtotal: number; product_name: string }[] =
      (order.order_items as unknown as { unit_cost: number; unit_price: number; subtotal: number; product_name: string }[]) ?? [];
    const total_cost = items.reduce((acc, item) => {
      const unitPrice = Number(item.unit_price);
      const itemCost = unitPrice > 0 ? Number(item.subtotal) * (Number(item.unit_cost) / unitPrice) : 0;
      return acc + itemCost;
    }, 0);
    const product_names = items.map((i) => i.product_name).filter(Boolean);
    const { order_items: _items, clients: client, order_payments, ...orderFields } = order;
    const total = Number(orderFields.total);
    const margin = total - total_cost;
    const margin_pct = total > 0 ? (margin / total) * 100 : 0;
    return { ...orderFields, total_cost, margin, margin_pct, client: client ?? null, order_payments: order_payments ?? [], product_names } as OrderWithMargin;
  });
}

export async function getOrderById(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from('orders')
    // order_item_variedades (#95): Variedades elegidas por línea de
    // Producto Surtido, si corresponde.
    .select('*, order_items(*, order_item_variedades(id, variedad_id, variedad_name))')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as OrderWithItems) ?? null;
}

export async function createOrder(
  supabase: SupabaseClient,
  storeId: number,
  input: CreateOrderSchemaInput
): Promise<{ order_id: number; total: number; status: string; items_count: number }> {
  const { notes, whatsapp_message, items } = input;

  // unit_cost se calcula server-side a partir del precio/costo vigente del
  // producto — el cliente solo manda unit_price (normalizado a
  // precio-por-unidad-base en el carrito). .eq('store_id', storeId): un
  // product_id de otra Store no matchea acá, así que cae al mismo fallback
  // (unit_cost 0) que un product_id inexistente.
  const productIds = items.map((i) => i.product_id);
  const { data: productsData } = await supabase
    .from('products')
    .select('id, price, cost')
    .eq('store_id', storeId)
    .in('id', productIds);
  const productMap = new Map<number, { price: number; cost: number }>(
    (productsData ?? []).map((p) => [p.id, { price: Number(p.price ?? 0), cost: Number(p.cost ?? 0) }])
  );

  const { data, error } = await supabase.rpc('create_order', {
    p_user_id: null,
    p_notes: notes || null,
    p_whatsapp_message: whatsapp_message,
    p_items: items.map((item) => {
      const prod = productMap.get(item.product_id);
      const unit_cost = prod && prod.price > 0 ? item.unit_price * (prod.cost / prod.price) : 0;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost,
        is_by_weight: item.is_by_weight,
        from_suggestion: item.from_suggestion ?? false,
      };
    }),
    p_store_id: storeId,
  });

  if (error) {
    // JSON.parse en su propio try/catch, sin throw adentro — un throw
    // dentro de un try lo intercepta su propio catch, no se propaga solo.
    let parsed: { error?: string; products?: InsufficientStockError['products'] } | null = null;
    try {
      parsed = JSON.parse(error.message);
    } catch {
      parsed = null;
    }
    if (parsed?.error === 'insufficient_stock') {
      throw new InsufficientStockError(parsed.products ?? []);
    }
    throw new Error(error.message);
  }

  // Producto Surtido (#95): paso adicional posterior a create_order(), a
  // propósito no forma parte de su cuerpo (#73). Best-effort — la orden ya
  // quedó creada completa arriba; un fallo acá solo se loguea, no rompe la
  // respuesta al caller. p_selections viaja en el mismo orden que items
  // (sin reordenar/filtrar), que es el mismo orden en el que create_order()
  // insertó los order_items correspondientes.
  const orderId = (data as { order_id?: number } | null)?.order_id;
  if (orderId != null) {
    const { error: variedadesError } = await supabase.rpc('add_order_item_variedades', {
      p_order_id: orderId,
      p_store_id: storeId,
      p_selections: items.map((item) => item.variedades ?? []),
    });
    if (variedadesError) {
      console.error(
        '[createOrder] RPC add_order_item_variedades error (orden ya creada, solo falta el detalle de Variedades):',
        JSON.stringify(variedadesError, null, 2)
      );
    }
  }

  return data;
}

export async function updateOrder(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  updates: UpdateOrderSchemaInput
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Orden no encontrada');
    throw new Error(error.message);
  }
  return data;
}

export async function deleteOrder(supabase: SupabaseClient, storeId: number, orderId: number): Promise<void> {
  // Sin .select(), un id de otra Store hubiera devuelto éxito sin borrar
  // nada (0 filas afectadas, sin error) — silencioso. order_items se
  // eliminan solos vía ON DELETE CASCADE; el stock NO se devuelve (borrado
  // permanente, no cancelación).
  const { data, error } = await supabase.from('orders').delete().eq('id', orderId).eq('store_id', storeId).select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new NotFoundError('Orden no encontrada');
}

export async function confirmOrder(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  confirmedBy: string | null
): Promise<{ order_id: number; status: string; confirmed_at: string; confirmed_by: string | null }> {
  // confirm_order es SECURITY DEFINER y bypassea RLS — la verificación de
  // que la orden pertenece a esta Store tiene que hacerse acá, antes de
  // invocar el RPC.
  const { data: order } = await supabase.from('orders').select('id').eq('id', orderId).eq('store_id', storeId).maybeSingle();
  if (!order) throw new NotFoundError('Orden no encontrada');

  const { data, error } = await supabase.rpc('confirm_order', {
    p_order_id: orderId,
    p_confirmed_by: confirmedBy,
  });

  if (error) {
    if (error.message.includes('not found')) throw new NotFoundError('Orden no encontrada');
    if (error.message.includes('not pending')) throw new ValidationError('Solo se pueden confirmar ordenes pendientes');
    throw new Error(error.message);
  }
  return data;
}

export async function cancelOrder(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number
): Promise<{ order_id: number; status: string; items_returned: number }> {
  // cancel_order es SECURITY DEFINER — mismo motivo que confirmOrder.
  const { data: order } = await supabase.from('orders').select('id').eq('id', orderId).eq('store_id', storeId).maybeSingle();
  if (!order) throw new NotFoundError('Orden no encontrada');

  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });

  if (error) {
    if (error.message.includes('not found')) throw new NotFoundError('Orden no encontrada');
    if (error.message.includes('already cancelled')) throw new ValidationError('La orden ya está cancelada');
    throw new Error(error.message);
  }
  return data;
}
