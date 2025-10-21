const path = require('path');
const http = require('http');
const fs = require('fs');

(async () => {
  try {
    console.log('Calling serverless export endpoint for direct export...');
    const payload = JSON.stringify({ startDate: null, endDate: null });
    const opts = { hostname: 'localhost', port: 3000, path: '/api/export-laborator', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
    const buf = await new Promise((resolve, reject) => {
      const req = http.request(opts, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    const out = path.resolve(process.cwd(), 'test_export_direct.zip');
    fs.writeFileSync(out, buf);
    console.log('WROTE', out);
  } catch (err) {
    console.error('direct export failed:', err && err.stack ? err.stack : err);
  }
})();