import AdminPanel from '@/components/AdminPanel';

/**
 * Página de administración para gestionar pedidos
 */
export default function AdminPage() {
	return (
		<div className="min-h-screen bg-gray-100">
			<div className="container mx-auto py-8">
				<AdminPanel />
			</div>
		</div>
	);
}
