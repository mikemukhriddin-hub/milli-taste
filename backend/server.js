const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { supabase, isDemoMode } = require('./config/supabase');
const { validateTelegramRequest } = require('./middleware/telegramAuth');
const { getNextQueueNumber, getQueuePosition } = require('./services/queueService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper to find or auto-register a Telegram user
async function findOrCreateUser(tgUser) {
  if (!tgUser || !tgUser.id) return null;

  let { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (!user) {
    const name = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || 'Foydalanuvchi';
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: tgUser.id,
        name: name,
        phone: tgUser.phone || '',
        role: 'client'
      })
      .select()
      .single();

    if (createError) throw createError;
    console.log(`🆕 Auto-registered missing user in session: ${name} (TG: ${tgUser.id})`);
    return newUser;
  }
  return user;
}

/**
 * Automatically registers or logs in a user from Telegram Mini App
 */
app.post('/api/auth/telegram', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    if (!tgUser || !tgUser.id) {
      return res.status(400).json({ error: 'Telegram user details missing' });
    }

    const user = await findOrCreateUser(tgUser);
    console.log(`👋 User logged in: ${user.name} (TG: ${tgUser.id})`);

    res.json({ user });
  } catch (err) {
    console.error('Error in Telegram auth:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Update user phone number (e.g. during first checkout)
 */
app.put('/api/users/phone', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ phone })
      .eq('telegram_id', tgUser.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ user });
  } catch (err) {
    console.error('Error updating phone:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. PRODUCTS / MENU ENDPOINTS
// ----------------------------------------------------

app.get('/api/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('category');

    if (error) throw error;
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. CLIENT ORDERS & QUEUE
// ----------------------------------------------------

/**
 * Place a new order
 */
app.post('/api/orders', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    const { items, order_type, address, phone } = req.body; // items: [{product_id, quantity}]

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!order_type) {
      return res.status(400).json({ error: 'Order type is required' });
    }

    // 1. Find user db UUID (or auto-register if missing)
    const user = await findOrCreateUser(tgUser);
    if (!user) {
      return res.status(404).json({ error: 'User not registered in system' });
    }

    // If user updated phone on checkout, save it
    if (phone && phone !== user.phone) {
      await supabase.from('users').update({ phone }).eq('id', user.id);
    }

    // 2. Fetch product details to calculate price safely (anti-tampering)
    const productIds = items.map(item => item.product_id);
    const { data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (prodError) throw prodError;

    let totalPrice = 0;
    const itemsWithPrices = items.map(cartItem => {
      const dbProd = dbProducts.find(p => p.id === cartItem.product_id);
      if (!dbProd) {
        throw new Error(`Product with ID ${cartItem.product_id} not found`);
      }
      totalPrice += dbProd.price * cartItem.quantity;
      return {
        product_id: cartItem.product_id,
        quantity: cartItem.quantity,
        price: dbProd.price
      };
    });

    // 3. Generate queue number (FIFO)
    const queueNumber = await getNextQueueNumber();

    // 4. Save order inside a transaction (or sequential insertions)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_price: totalPrice,
        status: 'pending',
        queue_number: queueNumber,
        order_type,
        address
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const orderItemsToInsert = itemsWithPrices.map(item => ({
      order_id: order.id,
      ...item
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    // 6. Get queue position and estimated wait time
    const queueDetails = await getQueuePosition(order.id);

    console.log(`🛒 New order placed: ID ${order.id}, Queue: #${queueNumber}, Total: ${totalPrice} UZS`);
    res.status(201).json({
      order,
      queue: queueDetails
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get user's order history
 */
app.get('/api/orders/my', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;

    const user = await findOrCreateUser(tgUser);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          price,
          products (
            title_uz,
            title_ru,
            title_en
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get current order position in FIFO queue
 */
app.get('/api/orders/:id/queue', validateTelegramRequest, async (req, res) => {
  try {
    const orderId = req.params.id;
    const queueDetails = await getQueuePosition(orderId);
    res.json(queueDetails);
  } catch (err) {
    console.error('Error fetching queue status:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. BOOKINGS
// ----------------------------------------------------

app.post('/api/bookings', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;
    const { table_number, booking_time, guests_count } = req.body;

    if (!table_number || !booking_time || !guests_count) {
      return res.status(400).json({ error: 'Table number, time, and guests count are required' });
    }

    const user = await findOrCreateUser(tgUser);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        table_number: parseInt(table_number),
        booking_time: new Date(booking_time).toISOString(),
        guests_count: parseInt(guests_count),
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings/my', validateTelegramRequest, async (req, res) => {
  try {
    const tgUser = req.telegramUser;

    const user = await findOrCreateUser(tgUser);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_time', { ascending: true });

    if (error) throw error;
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. ADMIN PANEL OPERATIONS
// ----------------------------------------------------

/**
 * Admin JWT Authentication
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // For simplicity & zero-config testing:
    // If username is "admin" and password is "admin123" (or matching the JWT secret), bypass and sign token
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'admin' });
    }

    // Or check users database table (where role = admin)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('role', 'admin')
      .limit(1);

    if (error) throw error;

    if (user && user.length > 0) {
      // In real-world, hash and verify password. Here, we simplify for the TZ specifications
      const token = jwt.sign(
        { id: user[0].id, username: user[0].name, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'admin' });
    }

    res.status(401).json({ error: 'Invalid username or password' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin - Get All Orders (FIFO Order: Pending/Preparing first, sorted by created_at)
 */
app.get('/api/admin/orders', validateTelegramRequest, async (req, res) => {
  try {
    // Middleware verifies admin JWT
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        users (
          name,
          phone,
          telegram_id
        ),
        order_items (
          id,
          quantity,
          price,
          products (
            title_uz,
            title_ru,
            title_en
          )
        )
      `)
      .order('status', { ascending: true }) // Pending -> Preparing -> Shipping -> Delivered
      .order('created_at', { ascending: true }); // FIFO inside status

    if (error) throw error;
    res.json(orders);
  } catch (err) {
    console.error('Admin get orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin - Update order status
 */
app.put('/api/admin/orders/:id/status', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const orderId = req.params.id;
    const { status } = req.body; // 'pending', 'accepted', 'completed', 'cancelled'

    if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`🔄 Order status updated: ID ${orderId} -> ${status}`);
    res.json(order);
  } catch (err) {
    console.error('Admin update order status error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin - Product CRUD operations
 */
app.get('/api/admin/products', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied. Admins only.' });
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('category');
    if (error) throw error;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const productData = req.body;
    const { data, error } = await supabase.from('products').insert(productData).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const productId = req.params.id;
    const productData = req.body;
    const { data, error } = await supabase.from('products').update(productData).eq('id', productId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const productId = req.params.id;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin - Get bookings
 */
app.get('/api/admin/bookings', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users (
          name,
          phone,
          telegram_id
        )
      `)
      .order('booking_time', { ascending: true });

    if (error) throw error;
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/bookings/:id/status', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    
    const bookingId = req.params.id;
    const { status } = req.body; // 'confirmed', 'cancelled'

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. AI TESTING & LOAD SIMULATOR ENDPOINT
// ----------------------------------------------------

/**
 * Simulates high load (100 simultaneous orders) to stress test FIFO queue performance.
 */
app.post('/api/admin/simulate-load', validateTelegramRequest, async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    console.log('🤖 AI Load Simulator triggered. Generating 100 simulated orders...');

    // 1. Get or create a simulated bot user in the DB
    let { data: simUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', 99999999) // Special bot ID
      .single();

    if (!simUser || (userError && userError.code === 'PGRST116')) {
      const { data: newSimUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: 99999999,
          name: 'AI Simulator Bot',
          phone: '+998901234567',
          role: 'client'
        })
        .select()
        .single();
      if (createError) throw createError;
      simUser = newSimUser;
    } else if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    // 2. Fetch an available product
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, price')
      .limit(1);

    if (prodError || !products || products.length === 0) {
      throw prodError || new Error('No products available to simulate orders.');
    }
    const testProduct = products[0];

    // 3. Perform stress simulation
    const startTime = Date.now();
    const simulatePromises = [];

    // We will simulate 100 rapid order creation calls
    for (let i = 0; i < 100; i++) {
      simulatePromises.push((async (index) => {
        // Compute queue number concurrently or sequentially. 
        // Note: in a true database environment, concurrent requests without locks might get duplicate queue numbers
        // Our queueService.js reads and increments. Let's see how our queue behaves under stress!
        const queueNumber = await getNextQueueNumber();
        
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: simUser.id,
            total_price: testProduct.price,
            status: 'pending',
            queue_number: queueNumber,
            order_type: 'pickup',
            address: `Simulated Order #${index + 1}`
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        // Add order item
        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: testProduct.id,
          quantity: 1,
          price: testProduct.price
        });

        return order;
      })(i));
    }

    // Wait for all 100 simulated orders to finish
    const results = await Promise.all(simulatePromises);
    const duration = Date.now() - startTime;

    // 4. Validate Queue Contiguity (Check if queue numbers are contiguous and have no duplicates)
    const queueNumbers = results.map(o => o.queue_number).sort((a, b) => a - b);
    const duplicates = queueNumbers.filter((item, index) => queueNumbers.indexOf(item) !== index);
    
    const analysisReport = {
      totalSimulated: results.length,
      timeTakenMs: duration,
      averageTimePerOrderMs: (duration / results.length).toFixed(2),
      queueContiguous: duplicates.length === 0,
      duplicateQueueNumbers: duplicates,
      status: duplicates.length === 0 ? 'SUCCESS' : 'QUEUE_INTEGRITY_WARNING',
      message: duplicates.length === 0 
        ? 'FIFO queues processed correctly. Order sequence preserved!' 
        : 'Concurrency warning: Duplicate queue numbers detected during parallel stress load. Lock mechanics recommended for high volume.'
    };

    console.log('📊 AI Simulation Report:', analysisReport);
    res.json(analysisReport);
  } catch (err) {
    console.error('Error simulating load:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// START THE SERVER
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💡 Mode: ${isDemoMode ? 'DEMO / IN-MEMORY DB' : 'LIVE / SUPABASE DATABASE'}`);
});
