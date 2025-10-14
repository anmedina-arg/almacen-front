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
 * GET /api/orders/[id]
 * Obtiene un pedido específico por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = orders.find((o) => o.id === params.id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id]
 * Actualiza el estado de un pedido
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, customerInfo } = body;

    const orderIndex = orders.findIndex((o) => o.id === params.id);

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Validar estado
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de pedido inválido' },
        { status: 400 }
      );
    }

    // Actualizar pedido
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...(status && { status }),
      ...(customerInfo && { customerInfo }),
    };

    return NextResponse.json({
      success: true,
      data: orders[orderIndex],
      message: 'Pedido actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * Elimina un pedido
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderIndex = orders.findIndex((o) => o.id === params.id);

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar pedido
    orders.splice(orderIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
