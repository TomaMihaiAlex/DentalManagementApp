const http = require('http');
const fs = require('fs');
const path = require('path');

async function runWithTimeout(ms) {
  const payload = JSON.stringify({ startDate: null, endDate: null });
  const opts = { hostname: 'localhost', port: 3000, path: '/api/export-laborator', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
  const p = new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  const t = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  return Promise.race([p, t]);
}

(async () => {
  try {
    console.log('Starting exporter with 15s timeout...');
    const buf = await runWithTimeout(15000);
    fs.writeFileSync(path.resolve(process.cwd(), 'test_export_run_timeout.zip'), buf);
    console.log('WROTE test_export_run_timeout.zip len=', buf.length);
  } catch (err) {
    console.error('export failed or timed out:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
