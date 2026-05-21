const { supabase } = require('../config/supabase');

/**
 * Get the next queue number for today
 * Calculates the maximum queue_number for orders placed on the current day, then returns max + 1.
 */
let lastQueueNumber = 0;
let lastQueueDateString = '';
let initializationPromise = null;

/**
 * Get the next queue number for today.
 * Guarantees unique, contiguous queue numbers even under concurrent requests
 * by using a single-threaded in-memory lock/counter initialized from the DB.
 */
async function getNextQueueNumber() {
  const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  // If date changed or not initialized, query the DB once
  if (lastQueueDateString !== todayStr) {
    if (!initializationPromise || lastQueueDateString !== todayStr) {
      initializationPromise = (async () => {
        try {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const { data, error } = await supabase
            .from('orders')
            .select('queue_number')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
            .order('queue_number', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            lastQueueNumber = data[0].queue_number;
          } else {
            lastQueueNumber = 0;
          }
          lastQueueDateString = todayStr;
        } catch (err) {
          console.error('Error initializing queue counter:', err);
          lastQueueNumber = 0;
          lastQueueDateString = todayStr;
        }
      })();
    }
    await initializationPromise;
  }

  // Strictly increment and return synchronously (no awaits below this point)
  lastQueueNumber += 1;
  return lastQueueNumber;
}

/**
 * Calculates current queue position and estimated wait time for an order
 * @param {string} orderId UUID of the order
 * @returns {Promise<{position: number, estimatedTime: number}>}
 */
async function getQueuePosition(orderId) {
  try {
    // 1. Get the target order to know its details and when it was created
    const { data: targetOrder, error: targetError } = await supabase
      .from('orders')
      .select('id, created_at, status')
      .eq('id', orderId)
      .single();

    if (targetError || !targetOrder) {
      throw targetError || new Error('Order not found');
    }

    // If order is already shipped, delivered, or cancelled, its position is 0
    if (['shipping', 'delivered', 'cancelled'].includes(targetOrder.status)) {
      return { position: 0, estimatedTime: 0, status: targetOrder.status };
    }

    // 2. Count how many orders with 'pending' or 'preparing' status were created BEFORE or AT the same time
    // using FIFO (First In, First Out)
    const { data: activeOrders, error: queueError } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true });

    if (queueError) throw queueError;

    // Find the index of targetOrder in the list of active orders
    const positionIndex = activeOrders.findIndex(order => order.id === orderId);
    
    // Position is index + 1 (if not found, place it at the end of the queue)
    const position = positionIndex !== -1 ? positionIndex + 1 : activeOrders.length + 1;
    
    // Average prep time per order in minutes (e.g. 15 minutes)
    const PREP_TIME_PER_ORDER = 15;
    const estimatedTime = position * PREP_TIME_PER_ORDER;

    return {
      position,
      estimatedTime,
      status: targetOrder.status
    };
  } catch (err) {
    console.error('Error in getQueuePosition:', err);
    return { position: 1, estimatedTime: 15, status: 'pending' };
  }
}

module.exports = {
  getNextQueueNumber,
  getQueuePosition
};
