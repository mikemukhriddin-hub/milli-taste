-- Database schema for Restaurant Ordering System & TMA
-- Target Database: Supabase (PostgreSQL)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_uz VARCHAR(255) NOT NULL,
    title_ru VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    description_uz TEXT,
    description_ru TEXT,
    description_en TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('drinks', 'national', 'dessert')),
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDERS TABLE (Queue management uses created_at and queue_number)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    queue_number INTEGER NOT NULL,
    order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10, 2) NOT NULL
);

-- 5. BOOKINGS TABLE (Table reservations)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    table_number INTEGER NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
    guests_count INTEGER NOT NULL CHECK (guests_count > 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Realtime Settings (Supabase specific)
-- Enable Realtime for orders, bookings, and products tables
-- This can be run in Supabase SQL editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ----------------------------------------------------
-- Seed initial mock products (Drinks, National foods, Desserts)
-- ----------------------------------------------------
INSERT INTO products (title_uz, title_ru, title_en, description_uz, description_ru, description_en, category, price, image_url)
VALUES 
-- National Foods
('Osh (Palov)', 'Плов', 'Pilaf (Osh)', 'Toshkentcha to''y oshi, go''sht va sabzilar bilan.', 'Ташкентский свадебный плов с мясом и нутом.', 'Traditional Tashkent wedding pilaf with meat and chickpeas.', 'national', 35000.00, 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?q=80&w=600&auto=format&fit=crop'),
('Lag''mon', 'Лагман', 'Lagman', 'Qo''lda cho''zilgan xamir va quyuq go''shtli qayla.', 'Тянутая вручную лапша с густой мясной подливой.', 'Hand-pulled noodles with thick meat and vegetable gravy.', 'national', 28000.00, 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600&auto=format&fit=crop'),
('Somsa (Go''shtli)', 'Самса с мясом', 'Meat Somsa', 'Tandirda pishirilgan sergo''sht va mayda to''g''ralgan piyozli somsa.', 'Тандырная самса с рубленым мясом и луком.', 'Traditional clay-oven baked pastry filled with minced meat and onions.', 'national', 10000.00, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?q=80&w=600&auto=format&fit=crop'),

-- Drinks
('Ko''k choy', 'Зеленый чай', 'Green Tea', 'An''anaviy o''zbek ko''k choyi.', 'Традиционный узбекский зеленый чай.', 'Traditional Uzbek green tea.', 'drinks', 5000.00, 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop'),
('Limonad (Klassik)', 'Лимонад (Классический)', 'Lemonade (Classic)', 'Yalpiz va yangi siqilgan limon sharbatidan tayyorlangan salqin ichimlik.', 'Освежающий напиток с мятой и свежевыжатым лимонным соком.', 'Refreshing drink with mint and freshly squeezed lemon juice.', 'drinks', 15000.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop'),
('Olcha sharbati', 'Вишневый сок', 'Cherry Juice', 'Tabiiy muzdek olcha sharbati.', 'Натуральный прохладный вишневый сок.', 'Natural cold cherry juice.', 'drinks', 12000.00, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=600&auto=format&fit=crop'),

-- Desserts
('Paxlava', 'Пахлава', 'Baklava', 'Asal va yong''oq solingan an''anaviy sharq shirinligi.', 'Традиционная восточная сладость с медом и орехами.', 'Traditional Eastern sweet pastry with honey and nuts.', 'dessert', 18000.00, 'https://images.unsplash.com/photo-1519676867240-f03562e64548?q=80&w=600&auto=format&fit=crop'),
('Medovik', 'Медовик', 'Honey Cake', 'Serasal, yumshoq va mayin kremli tort.', 'Мягкий медовый торт с нежным кремом.', 'Soft honey layer cake with delicate cream.', 'dessert', 20000.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop');
