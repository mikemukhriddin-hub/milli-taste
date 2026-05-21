const fetch = globalThis.fetch; // Use native global fetch in Node.js 18+

const API_BASE = 'http://localhost:5000/api';

async function runCommandLineSimulation() {
  console.log('🚀 Starting CLI AI Stress Test Simulator for Restaurant TMA...');
  console.log('🤖 Target Server:', API_BASE);
  
  // 1. Perform Admin Login to get token
  console.log('🔑 Logging in as Admin...');
  let token = '';
  try {
    const loginRes = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('✅ Admin authenticated successfully.');
  } catch (err) {
    console.error('❌ Error during login. Ensure the backend server is running on port 5000.');
    console.error('Details:', err.message);
    process.exit(1);
  }

  // 2. Trigger the load simulation endpoint
  console.log('⚡ Triggering 100 concurrent order simulations...');
  try {
    const start = Date.now();
    const simRes = await fetch(`${API_BASE}/admin/simulate-load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!simRes.ok) {
      throw new Error(`Simulation failed with status ${simRes.status}`);
    }

    const report = await simRes.json();
    const duration = Date.now() - start;

    console.log('\n======================================================');
    console.log('📊 AI STRESS-TEST LOG ANALYSIS REPORT');
    console.log('======================================================');
    console.log(`Status:         ${report.status}`);
    console.log(`Total Orders:   ${report.totalSimulated}`);
    console.log(`Execution Time: ${report.timeTakenMs} ms`);
    console.log(`Avg Latency:    ${report.averageTimePerOrderMs} ms/order`);
    console.log(`FIFO Ordered:   ${report.queueContiguous ? 'PASSED (Contiguous)' : 'WARNING (Out-of-order/Duplicates detected)'}`);
    console.log(`Message:        ${report.message}`);
    
    if (report.duplicateQueueNumbers && report.duplicateQueueNumbers.length > 0) {
      console.log(`⚠️ Duplicates:   [${report.duplicateQueueNumbers.join(', ')}]`);
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Stress-test trigger failed:', err.message);
    process.exit(1);
  }
}

runCommandLineSimulation();
