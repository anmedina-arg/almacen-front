'use client';

import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useApi';

/**
 * Panel de administración para gestionar pedidos
 */
const AdminPanel: React.FC = () => {
	const {
		orders,
		loading,
		error,
		fetchOrders,
		updateOrderStatus,
		deleteOrder
	} = useOrders();

	const [selectedStatus, setSelectedStatus] = useState<string>('');
	const [showOrderDetails, setShowOrderDetails] = useState<string | null>(null);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	const handleStatusChange = async (orderId: string, newStatus: string) => {
		await updateOrderStatus(orderId, newStatus as any);
	};

	const handleDeleteOrder = async (orderId: string) => {
		if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
			await deleteOrder(orderId);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending': return 'bg-yellow-100 text-yellow-800';
			case 'confirmed': return 'bg-blue-100 text-blue-800';
			case 'completed': return 'bg-green-100 text-green-800';
			case 'cancelled': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'pending': return 'Pendiente';
			case 'confirmed': return 'Confirmado';
			case 'completed': return 'Completado';
			case 'cancelled': return 'Cancelado';
			default: return status;
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
				<span className="ml-2">Cargando pedidos...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
				<p className="text-red-600">Error al cargar los pedidos: {error}</p>
				<button
					onClick={() => fetchOrders()}
					className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
				>
					Reintentar
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto p-4">
			<div className="bg-white rounded-lg shadow-lg p-6">
				<h2 className="text-2xl font-bold mb-6 text-gray-800">
					Panel de Administración - Pedidos
				</h2>

				{/* Filtros */}
				<div className="mb-6 flex gap-4 items-center">
					<label className="text-sm font-medium text-gray-700">
						Filtrar por estado:
					</label>
					<select
						value={selectedStatus}
						onChange={(e) => setSelectedStatus(e.target.value)}
						className="border border-gray-300 rounded-md px-3 py-2 text-sm"
					>
						<option value="">Todos</option>
						<option value="pending">Pendiente</option>
						<option value="confirmed">Confirmado</option>
						<option value="completed">Completado</option>
						<option value="cancelled">Cancelado</option>
					</select>
					<button
						onClick={() => fetchOrders({ status: selectedStatus })}
						className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
					>
						Filtrar
					</button>
				</div>

				{/* Lista de pedidos */}
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									ID Pedido
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Fecha
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Total
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{orders.map((order) => (
								<tr key={order.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{order.id}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{new Date(order.timestamp).toLocaleString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										${order.total}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
											{getStatusLabel(order.status)}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div className="flex gap-2">
											<button
												onClick={() => setShowOrderDetails(order.id)}
												className="text-blue-600 hover:text-blue-900"
											>
												Ver
											</button>
											<select
												value={order.status}
												onChange={(e) => handleStatusChange(order.id, e.target.value)}
												className="text-xs border border-gray-300 rounded px-2 py-1"
											>
												<option value="pending">Pendiente</option>
												<option value="confirmed">Confirmado</option>
												<option value="completed">Completado</option>
												<option value="cancelled">Cancelado</option>
											</select>
											<button
												onClick={() => handleDeleteOrder(order.id)}
												className="text-red-600 hover:text-red-900"
											>
												Eliminar
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{orders.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						No hay pedidos disponibles
					</div>
				)}
			</div>

			{/* Modal de detalles del pedido */}
			{showOrderDetails && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-xl font-bold">Detalles del Pedido</h3>
							<button
								onClick={() => setShowOrderDetails(null)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>

						{(() => {
							const order = orders.find(o => o.id === showOrderDetails);
							if (!order) return null;

							return (
								<div>
									<div className="mb-4">
										<p><strong>ID:</strong> {order.id}</p>
										<p><strong>Fecha:</strong> {new Date(order.timestamp).toLocaleString()}</p>
										<p><strong>Estado:</strong> {getStatusLabel(order.status)}</p>
										<p><strong>Total:</strong> ${order.total}</p>
									</div>

									<div className="mb-4">
										<h4 className="font-bold mb-2">Productos:</h4>
										<div className="space-y-2">
											{order.items.map((item, index) => (
												<div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
													<div>
														<p className="font-medium">{item.name}</p>
														<p className="text-sm text-gray-600">
															Cantidad: {item.quantity} | Precio unitario: ${item.unitPrice}
														</p>
													</div>
													<p className="font-bold">${item.totalPrice}</p>
												</div>
											))}
										</div>
									</div>

									{order.customerInfo && (
										<div>
											<h4 className="font-bold mb-2">Información del Cliente:</h4>
											<p><strong>Nombre:</strong> {order.customerInfo.name || 'No especificado'}</p>
											<p><strong>Teléfono:</strong> {order.customerInfo.phone || 'No especificado'}</p>
											<p><strong>Email:</strong> {order.customerInfo.email || 'No especificado'}</p>
										</div>
									)}
								</div>
							);
						})()}
					</div>
				</div>
			)}
		</div>
	);
};

export default AdminPanel;
