import { CategoryManagement } from '@/features/admin/components/categories/CategoryManagement';
import { FamiliaManagement } from '@/features/admin/components/familias/FamiliaManagement';

// Familias es la tercera sección de este panel (#93, ver
// supabase/schema/producto-surtido/README.md) — no un tab nuevo.
export default function CategoriesPage() {
  return (
    <div className="space-y-10">
      <CategoryManagement />
      <hr className="border-gray-200" />
      <FamiliaManagement />
    </div>
  );
}
