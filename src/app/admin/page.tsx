import { redirect } from 'next/navigation';
import { features } from '@/lib/features';

export default function AdminRootPage() {
  redirect(features.dashboard ? '/admin/dashboard' : '/admin/products');
}
