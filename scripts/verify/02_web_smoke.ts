async function run() {
  console.log('--- Starting Web Smoke Tests ---');
  try {
    const res = await fetch('http://localhost:5173');
    if (!res.ok) {
      console.error('FAIL: Web server returned', res.status);
      process.exit(1);
    }
    const html = await res.text();
    if (!html.includes('<html') || !html.includes('<head')) {
      console.error('FAIL: Response does not look like HTML');
      process.exit(1);
    }
    console.log('OK: Web app shell loads (200 OK)');
  } catch (err: any) {
    console.error('FAIL: Could not connect to web server:', err.message);
    process.exit(1);
  }
  console.log('--- Web Smoke Tests PASSED ---');
}
run();
