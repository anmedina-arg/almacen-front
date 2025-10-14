-- Esquema de base de datos para la aplicación de almacén
-- Compatible con PostgreSQL, MySQL, SQLite

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    active BOOLEAN DEFAULT true,
    categories VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items del pedido
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON products(categories);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Insertar datos de ejemplo
INSERT INTO categories (name, description) VALUES 
('Panadería', 'Productos de panadería frescos'),
('Pastelería', 'Tortas, pasteles y postres'),
('Congelados', 'Productos congelados'),
('Bebidas', 'Bebidas y jugos')
ON CONFLICT (name) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO products (name, price, image, categories, description) VALUES 
('Pan de Miga x Kg', 7000.00, '/images/pan-miga.jpg', 'Panadería', 'Pan de miga fresco por kilo'),
('Biscochitos de Grasa x 100 gr', 700.00, '/images/biscochitos.jpg', 'Panadería', 'Biscochitos de grasa por 100 gramos'),
('Alfajor Maizena', 1000.00, '/images/alfajor-maizena.jpg', 'Pastelería', 'Alfajor de maizena individual'),
('Palmeritas x 100 gr', 1000.00, '/images/palmeritas.jpg', 'Pastelería', 'Palmeritas por 100 gramos'),
('Patitas de Pollo x Kg', 7000.00, '/images/patitas-pollo.jpg', 'Congelados', 'Patitas de pollo congeladas por kilo')
ON CONFLICT DO NOTHING;
