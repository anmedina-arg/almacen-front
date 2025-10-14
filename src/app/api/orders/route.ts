import { NextRequest, NextResponse } from 'next/server';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

// Simulación de base de datos en memoria (en producción usarías una BD real)
let orders: Order[] = [];

/**
 * POST /api/orders
 * Crea un nuevo pedido
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerInfo } = body;

    // Validar que hay items en el pedido
    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El pedido debe contener al menos un producto',
        },
        { status: 400 }
      );
    }

    // Calcular total
    const total = items.reduce((sum: number, item: OrderItem) => {
      return sum + item.totalPrice;
    }, 0);

    // Crear nuevo pedido
    const newOrder: Order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      items,
      total,
      timestamp: new Date(),
      status: 'pending',
      customerInfo,
    };

    // Guardar en "base de datos"
    orders.push(newOrder);

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: 'Pedido creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Obtiene todos los pedidos (con paginación)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    let filteredOrders = orders;

    // Filtrar por estado si se especifica
    if (status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === status
      );
    }

    // Ordenar por fecha más reciente
    filteredOrders.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        totalPages: Math.ceil(filteredOrders.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
