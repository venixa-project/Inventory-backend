async function test() {
  try {
    const res = await fetch('https://inventory-backend-production-6a4ed8d1.up.railway.app/api/v1/health');
    console.log('Railway backend HTTP Status:', res.status);
    const body = await res.text();
    console.log('Body:', body.substring(0, 300));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
test();
