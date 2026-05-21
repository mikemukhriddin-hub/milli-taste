const fetch = globalThis.fetch;

const API_BASE = 'http://localhost:5000/api';
const userStr = JSON.stringify({ id: 11223344, first_name: "Verify Client", username: "verify_client" });
const initData = `user=${encodeURIComponent(userStr)}&hash=dummy_hash`;
const CLIENT_AUTH = `Telegram ${initData}`;

async function testWorkflow() {
  console.log('🧪 Starting API order workflow integration test...');

  try {
    // 1. Fetch Products
    console.log('\nStep 1: Fetching menu products...');
    const prodRes = await fetch(`${API_BASE}/products`);
    if (!prodRes.ok) throw new Error(`Fetch products failed: ${prodRes.status}`);
    const products = await prodRes.json();
    console.log(`✅ Loaded ${products.length} products.`);
    if (products.length === 0) {
      throw new Error('No products in database');
    }
    const firstProduct = products[0];
    const secondProduct = products[1] || products[0];

    // 2. Place Order 1 (Pickup)
    console.log('\nStep 2: Placing Order 1 (Pickup)...');
    const order1Res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CLIENT_AUTH
      },
      body: JSON.stringify({
        items: [{ product_id: firstProduct.id, quantity: 2 }],
        order_type: 'pickup',
        address: '',
        phone: '+998901112233'
      })
    });
    if (!order1Res.ok) throw new Error(`Place order 1 failed: ${order1Res.status}`);
    const order1Data = await order1Res.json();
    const orderId1 = order1Data.order.id;
    console.log(`✅ Order 1 placed. ID: ${orderId1}, Queue: #${order1Data.order.queue_number}, Status: ${order1Data.order.status}`);
    console.log(`ℹ️ Queue Position: ${order1Data.queue.position}, Estimated Time: ${order1Data.queue.estimatedTime} min`);

    if (order1Data.order.status !== 'pending') {
      throw new Error(`Order 1 status should be pending, got ${order1Data.order.status}`);
    }
    if (order1Data.queue.position !== 1) {
      throw new Error(`Order 1 queue position should be 1, got ${order1Data.queue.position}`);
    }

    // 3. Place Order 2 (Delivery)
    console.log('\nStep 3: Placing Order 2 (Delivery)...');
    const order2Res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CLIENT_AUTH
      },
      body: JSON.stringify({
        items: [{ product_id: secondProduct.id, quantity: 1 }],
        order_type: 'delivery',
        address: 'Sebzor ko\'chasi, 12',
        phone: '+998901112233'
      })
    });
    if (!order2Res.ok) throw new Error(`Place order 2 failed: ${order2Res.status}`);
    const order2Data = await order2Res.json();
    const orderId2 = order2Data.order.id;
    console.log(`✅ Order 2 placed. ID: ${orderId2}, Queue: #${order2Data.order.queue_number}, Status: ${order2Data.order.status}`);
    console.log(`ℹ️ Queue Position: ${order2Data.queue.position}, Estimated Time: ${order2Data.queue.estimatedTime} min`);

    if (order2Data.queue.position !== 2) {
      throw new Error(`Order 2 queue position should be 2, got ${order2Data.queue.position}`);
    }

    // 4. Admin Login
    console.log('\nStep 4: Logging in as Admin...');
    const loginRes = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const adminToken = loginData.token;
    console.log('✅ Authenticated as admin.');

    // 5. Admin List Orders
    console.log('\nStep 5: Admin retrieving orders list...');
    const adminOrdersRes = await fetch(`${API_BASE}/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!adminOrdersRes.ok) throw new Error(`Admin get orders failed: ${adminOrdersRes.status}`);
    const adminOrders = await adminOrdersRes.json();
    console.log(`✅ Admin retrieved ${adminOrders.length} orders.`);
    
    const o1 = adminOrders.find(o => o.id === orderId1);
    const o2 = adminOrders.find(o => o.id === orderId2);
    if (!o1 || !o2) {
      throw new Error('Created orders not found in admin orders list');
    }

    // 6. Admin Accept Order 1 (Move to accepted)
    console.log(`\nStep 6: Admin accepting Order 1 (${orderId1})...`);
    const acceptRes = await fetch(`${API_BASE}/admin/orders/${orderId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'accepted' })
    });
    if (!acceptRes.ok) throw new Error(`Accept order 1 failed: ${acceptRes.status}`);
    const acceptedOrder = await acceptRes.json();
    console.log(`✅ Order 1 updated to: ${acceptedOrder.status}`);

    // Check queue of Order 1 and Order 2
    const q1Res = await fetch(`${API_BASE}/orders/${orderId1}/queue`, {
      headers: { 'Authorization': CLIENT_AUTH }
    });
    const q1 = await q1Res.json();
    console.log(`ℹ️ Order 1 Queue Position after accept: ${q1.position}, status: ${q1.status}`);
    if (q1.status !== 'accepted' || q1.position !== 1) {
      throw new Error(`Order 1 queue status or position invalid: ${JSON.stringify(q1)}`);
    }

    const q2Res = await fetch(`${API_BASE}/orders/${orderId2}/queue`, {
      headers: { 'Authorization': CLIENT_AUTH }
    });
    const q2 = await q2Res.json();
    console.log(`ℹ️ Order 2 Queue Position: ${q2.position}, status: ${q2.status}`);
    if (q2.position !== 2) {
      throw new Error(`Order 2 queue position should still be 2, got ${q2.position}`);
    }

    // 7. Admin Complete Order 1 (Move to completed)
    console.log(`\nStep 7: Admin completing Order 1 (${orderId1})...`);
    const completeRes = await fetch(`${API_BASE}/admin/orders/${orderId1}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    if (!completeRes.ok) throw new Error(`Complete order 1 failed: ${completeRes.status}`);
    const completedOrder = await completeRes.json();
    console.log(`✅ Order 1 updated to: ${completedOrder.status}`);

    // Check queue of Order 1 and Order 2
    const q1PostRes = await fetch(`${API_BASE}/orders/${orderId1}/queue`, {
      headers: { 'Authorization': CLIENT_AUTH }
    });
    const q1Post = await q1PostRes.json();
    console.log(`ℹ️ Order 1 Queue Position after complete: ${q1Post.position}, status: ${q1Post.status}`);
    if (q1Post.position !== 0) {
      throw new Error(`Order 1 queue position should be 0 after completion, got ${q1Post.position}`);
    }

    const q2PostRes = await fetch(`${API_BASE}/orders/${orderId2}/queue`, {
      headers: { 'Authorization': CLIENT_AUTH }
    });
    const q2Post = await q2PostRes.json();
    console.log(`ℹ️ Order 2 Queue Position after Order 1 complete: ${q2Post.position}, status: ${q2Post.status}`);
    if (q2Post.position !== 1) {
      throw new Error(`Order 2 queue position should shift to 1, got ${q2Post.position}`);
    }

    // 8. Admin Reject Order 2 (Move to cancelled)
    console.log(`\nStep 8: Admin rejecting Order 2 (${orderId2})...`);
    const rejectRes = await fetch(`${API_BASE}/admin/orders/${orderId2}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    if (!rejectRes.ok) throw new Error(`Reject order 2 failed: ${rejectRes.status}`);
    const rejectedOrder = await rejectRes.json();
    console.log(`✅ Order 2 updated to: ${rejectedOrder.status}`);

    // Check queue of Order 2
    const q2FinalRes = await fetch(`${API_BASE}/orders/${orderId2}/queue`, {
      headers: { 'Authorization': CLIENT_AUTH }
    });
    const q2Final = await q2FinalRes.json();
    console.log(`ℹ️ Order 2 Queue Position after cancel: ${q2Final.position}, status: ${q2Final.status}`);
    if (q2Final.position !== 0) {
      throw new Error(`Order 2 queue position should be 0 after cancellation, got ${q2Final.position}`);
    }

    console.log('\n🎉 ALL WORKFLOW PIPELINE TESTS PASSED SUCCESSFULY! 🎉');
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

testWorkflow();
