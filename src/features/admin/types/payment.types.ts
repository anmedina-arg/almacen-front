export type PaymentMethod = 'efectivo' | 'transferencia';

export const PAYMENT_EMOJI: Record<PaymentMethod, string> = {
  efectivo: '💵',
  transferencia: '📱',
};

export interface OrderPayment {
  id: number;
  order_id: number;
  method: PaymentMethod;
  amount: number | null;
  created_at: string;
}

export interface SetPaymentsInput {
  payments: PaymentInput[];
}

export interface PaymentInput {
  method: PaymentMethod;
  amount?: number;
}
