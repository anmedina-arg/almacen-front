import { Metadata } from 'next';
import { POSView } from '@/features/admin/components/pos/POSView';

export const metadata: Metadata = {
  title: 'Punto de Venta — Admin',
};

export default function POSPage() {
  return <POSView />;
}
