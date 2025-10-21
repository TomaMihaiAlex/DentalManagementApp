const fs = require('fs');
const path = require('path');

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
}

const envPath = path.resolve(process.cwd(), '.env');
loadDotEnv(envPath);
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
if (!process.env.SUPABASE_KEY && process.env.VITE_SUPABASE_ANON_KEY) process.env.SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Test runner: SUPABASE_URL present=', !!process.env.SUPABASE_URL, 'SUPABASE_KEY present=', !!process.env.SUPABASE_KEY);

process.on('unhandledRejection', (r) => {
  console.error('UNHANDLED REJECTION:', r && (r.stack || r));
});

(async () => {
  try {
    console.log('Calling serverless export endpoint...');
    const http = require('http');
    const payload = JSON.stringify({ startDate: null, endDate: null });
    const opts = { hostname: 'localhost', port: 3000, path: '/api/export-laborator', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
    const zipBuf = await new Promise((resolve, reject) => {
      const req = http.request(opts, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    if (!zipBuf || !zipBuf.length) {
      console.log('export returned empty buffer');
    } else {
      fs.writeFileSync(path.resolve(process.cwd(), 'test_export_run.zip'), zipBuf);
      console.log('WROTE test_export_run.zip len=', zipBuf.length);
    }
  } catch (err) {
    console.error('export failed:', err && err.stack ? err.stack : err);
    const out = { error: String(err && err.message), stack: err && err.stack };
    try { fs.writeFileSync(path.resolve(process.cwd(), 'test_export_run.error.json'), JSON.stringify(out, null, 2)); } catch(e) { console.error('failed writing error file', e); }
    process.exit(1);
  }
})();
