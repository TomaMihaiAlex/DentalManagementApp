const fs = require('fs');
const path = require('path');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('Long-run: calling serverless exporter (90s timeout)');
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
    const t = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout-90s')), 90000));
    const buf = await Promise.race([p, t]);
    fs.writeFileSync(path.resolve(process.cwd(), 'test_export_run_long.zip'), buf);
    console.log('WROTE test_export_run_long.zip len=', buf.length);
  } catch (err) {
    console.error('Long-run failed:', err && err.stack ? err.stack : err);
  }
}

run();
