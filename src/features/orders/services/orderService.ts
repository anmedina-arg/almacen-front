import type { SupabaseClient } from '@supabase/supabase-js';
import type { Order, OrderWithItems, OrderItem } from '@/features/admin/types/order.types';
import type { Client } from '@/features/admin/types/client.types';
import type { OrderPayment } from '@/features/admin/types/payment.types';
import type { CreateOrderSchemaInput, UpdateOrderSchemaInput, AddOrderItemSchemaInput, UpdateOrderItemSchemaInput } from '../schemas/orderSchemas';
import type { SetPaymentsSchema } from '../schemas/paymentSchemas';
import type { AssignClientSchema } from '../schemas/clientSchemas';
import { NotFoundError, ValidationError } from '@/lib/api/errors';

/**
 * Service de Orders (#119 núcleo + #120 items/payments/client) — ver
 * ADR-0013, mismo patrón que productService.ts. Cada función recibe
 * storeId explícito. POS (#121) sigue llamando a create_order() por su
 * cuenta, sin pasar por acá todavía.
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
    .select('*, order_items(unit_cost, unit_price, subtotal, product_name), clients(id, barrio, manzana_lote, display_code, created_at), order_payments(id, method, amount)')
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
      // price=0 (ej. promocional/regalo con costo real cargado) -> unit_cost
      // 0, no el costo real — así se comportaba ya el checkout de WhatsApp
      // antes de #121. POS antes mandaba el costo crudo del producto
      // directo (sin este guard), pero unificarlo acá es el objetivo del
      // ticket: mismo cálculo para las dos entradas al mismo dominio
      // (code review de #121, aceptado a propósito, no es un bug nuevo).
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
  await assertOrderInStore(supabase, storeId, orderId);

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
  await assertOrderInStore(supabase, storeId, orderId);

  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });

  if (error) {
    if (error.message.includes('not found')) throw new NotFoundError('Orden no encontrada');
    if (error.message.includes('already cancelled')) throw new ValidationError('La orden ya está cancelada');
    throw new Error(error.message);
  }
  return data;
}

/**
 * Chequeo compartido "¿esta orden existe y es de esta Store?" — usado por
 * confirm/cancel/payments/client (solo existencia) y assertOrderIsPending
 * (existencia + status). Extraído en el code review de #120: vivía
 * copiado, sin variar, en 5 funciones distintas de este archivo.
 */
async function assertOrderInStore(supabase: SupabaseClient, storeId: number, orderId: number): Promise<{ id: number; status: string }> {
  const { data: order } = await supabase.from('orders').select('id, status').eq('id', orderId).eq('store_id', storeId).maybeSingle();
  if (!order) throw new NotFoundError('Orden no encontrada');
  return order;
}

async function assertOrderIsPending(supabase: SupabaseClient, storeId: number, orderId: number): Promise<void> {
  const order = await assertOrderInStore(supabase, storeId, orderId);
  if (order.status !== 'pending') throw new ValidationError('Solo se pueden editar ordenes pendientes');
}

export async function addOrderItem(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  input: AddOrderItemSchemaInput
): Promise<OrderItem> {
  // #103: el producto tiene que pertenecer a esta Store — el trigger
  // validate_order_item_store ya lo bloquearía a nivel de base, pero acá
  // cortamos antes con un mensaje claro en vez de un 500 genérico. En
  // paralelo con el chequeo de la orden (independientes entre sí) —
  // code review de #120.
  const [, productResult] = await Promise.all([
    assertOrderIsPending(supabase, storeId, orderId),
    supabase.from('products').select('price, cost').eq('id', input.product_id).eq('store_id', storeId).maybeSingle(),
  ]);
  const product = productResult.data;
  if (!product) throw new ValidationError('Producto no encontrado en esta Store');

  const unit_cost = Number(product.price) > 0 ? input.unit_price * (Number(product.cost ?? 0) / Number(product.price)) : 0;

  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      product_id: input.product_id,
      product_name: input.product_name,
      quantity: input.quantity,
      unit_price: input.unit_price,
      unit_cost,
      is_by_weight: input.is_by_weight,
      store_id: storeId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateOrderItem(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  itemId: number,
  input: UpdateOrderItemSchemaInput
): Promise<OrderItem> {
  // Recalcula unit_cost desde el costo vigente del producto (corrige ítems
  // agregados sin costo en su momento). En paralelo con el chequeo de la
  // orden (independientes entre sí) — code review de #120.
  const [, existingItemResult] = await Promise.all([
    assertOrderIsPending(supabase, storeId, orderId),
    supabase.from('order_items').select('product_id, unit_price').eq('id', itemId).eq('order_id', orderId).maybeSingle(),
  ]);
  const existingItem = existingItemResult.data;

  let unit_cost: number | undefined;
  if (existingItem) {
    const { data: product } = await supabase.from('products').select('price, cost').eq('id', existingItem.product_id).eq('store_id', storeId).maybeSingle();
    if (product && Number(product.price) > 0) {
      const effectiveUnitPrice = input.unit_price ?? existingItem.unit_price;
      unit_cost = effectiveUnitPrice * (Number(product.cost ?? 0) / Number(product.price));
    } else {
      unit_cost = 0;
    }
  }

  // Si esto sube la cantidad, adjust_stock_on_item_update() (trigger, #73)
  // puede rechazar por stock insuficiente — ese error sigue cayendo acá
  // como Error genérico (500), sin caso especial: mismo comportamiento que
  // antes de esta migración, no es parte del alcance de #120.
  const { data, error } = await supabase
    .from('order_items')
    .update({ ...input, ...(unit_cost !== undefined && { unit_cost }) })
    .eq('id', itemId)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new NotFoundError('Item no encontrado');
    throw new Error(error.message);
  }
  return data;
}

/**
 * Devuelve el product_id del item borrado (#146, spec #139) — return_stock_on_item_delete
 * ya devuelve stock real al confirmar el borrado; el caller lo necesita
 * para invalidar el cache de stock de ese producto sin una query aparte
 * (.select() después de .delete() en la misma llamada).
 */
export async function removeOrderItem(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  itemId: number
): Promise<{ product_id: number | null } | null> {
  await assertOrderIsPending(supabase, storeId, orderId);

  const { data, error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)
    .eq('order_id', orderId)
    .select('product_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function setPayments(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  payments: SetPaymentsSchema['payments']
): Promise<OrderPayment[]> {
  await assertOrderInStore(supabase, storeId, orderId);

  // Replace: borrar todo e insertar de nuevo — operación admin-only, no
  // necesita una transacción real (RPC) para este volumen (0-2 filas).
  const { error: deleteError } = await supabase.from('order_payments').delete().eq('order_id', orderId);
  if (deleteError) throw new Error(deleteError.message);

  const { data, error: insertError } = await supabase
    .from('order_payments')
    .insert(payments.map((p) => ({ order_id: orderId, method: p.method, amount: p.amount ?? null, store_id: storeId })))
    .select('id, order_id, method, amount, created_at');

  if (insertError) throw new Error(insertError.message);
  return data;
}

export async function deletePayment(supabase: SupabaseClient, storeId: number, orderId: number, paymentId: number): Promise<void> {
  await assertOrderInStore(supabase, storeId, orderId);

  const { error: deleteError } = await supabase.from('order_payments').delete().eq('id', paymentId).eq('order_id', orderId);
  if (deleteError) throw new Error(deleteError.message);

  // Si queda un pago, se le limpia el monto (ahora cubre el total completo).
  const { error: clearError } = await supabase.from('order_payments').update({ amount: null }).eq('order_id', orderId);
  if (clearError) throw new Error(clearError.message);
}

export async function assignClient(
  supabase: SupabaseClient,
  storeId: number,
  orderId: number,
  input: AssignClientSchema
): Promise<{ id: number; client_id: number; client: Client }> {
  const { barrio, manzana_lote } = input;

  await assertOrderInStore(supabase, storeId, orderId);

  // Find-or-create, scoped a esta Store — barrio + manzana_lote no son
  // globalmente únicos entre Stores distintas. Partial unique indexes no
  // se pueden usar con upsert onConflict, de ahí el select-then-insert.
  let findQuery = supabase.from('clients').select('id, barrio, manzana_lote, display_code, created_at').eq('barrio', barrio).eq('store_id', storeId);
  findQuery = barrio === 'otros'
    ? (manzana_lote ? findQuery.eq('manzana_lote', manzana_lote) : findQuery.is('manzana_lote', null))
    : findQuery.eq('manzana_lote', manzana_lote!);

  const { data: existing, error: findError } = await findQuery.maybeSingle();
  if (findError) throw new Error(findError.message);

  let client: Client;
  if (existing) {
    client = existing;
  } else {
    const { data: created, error: insertError } = await supabase
      .from('clients')
      .insert({ barrio, manzana_lote: manzana_lote ?? null, store_id: storeId })
      .select('id, barrio, manzana_lote, display_code, created_at')
      .single();
    if (insertError) throw new Error(insertError.message);
    client = created;
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ client_id: client.id })
    .eq('id', orderId)
    .eq('store_id', storeId)
    .select('id, client_id')
    .single();
  if (updateError) throw new Error(updateError.message);

  return { ...updatedOrder, client };
}

export async function unassignClient(supabase: SupabaseClient, storeId: number, orderId: number): Promise<void> {
  // Mismo comportamiento que antes de #120: sin chequeo previo de
  // existencia — un orderId de otra Store no matchea el .eq('store_id'),
  // 0 filas afectadas sin error, "éxito" silencioso. No es parte de este
  // ticket cambiarlo.
  const { error } = await supabase.from('orders').update({ client_id: null }).eq('id', orderId).eq('store_id', storeId);
  if (error) throw new Error(error.message);
}
