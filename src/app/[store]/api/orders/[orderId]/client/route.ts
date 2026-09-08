import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireFlag } from '@/lib/store/requireFlag';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { assignClientSchema } from '@/features/orders/schemas/clientSchemas';
import { assignClient, unassignClient } from '@/features/orders/services/orderService';

/**
 * PATCH /api/orders/[orderId]/client
 * Find-or-create a client by barrio+manzana_lote, then assign to the
 * order. Admin only, requiere la flag 'clientes' (#120 — gap real: antes
 * funcionaba igual sin la flag, solo se ocultaba en la UI de OrdersTable).
 */
export const PATCH = createApiRoute<{ orderId: string }>(requireAdmin, requireFlag('clientes'))(async (ctx, { orderId: orderIdParam }) => {
  try {
    // orderId <= 0: la rutina original (parseOrderId) rechazaba 0 además de
    // NaN — un simple isNaN() lo dejaría pasar (code review de #120).
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = assignClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }

    const result = await assignClient(ctx.supabase, ctx.storeId, orderId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'PATCH /api/orders/[orderId]/client');
  }
});

/**
 * DELETE /api/orders/[orderId]/client
 * Remove client assignment from an order. Admin only, requiere la flag
 * 'clientes' (#120).
 */
export const DELETE = createApiRoute<{ orderId: string }>(requireAdmin, requireFlag('clientes'))(async (ctx, { orderId: orderIdParam }) => {
  try {
    // orderId <= 0: la rutina original (parseOrderId) rechazaba 0 además de
    // NaN — un simple isNaN() lo dejaría pasar (code review de #120).
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
    }

    await unassignClient(ctx.supabase, ctx.storeId, orderId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/orders/[orderId]/client');
  }
});
