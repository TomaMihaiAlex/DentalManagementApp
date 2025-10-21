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
    // remove surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
}

const envPath = path.resolve(process.cwd(), '.env');
loadDotEnv(envPath);
// Map VITE-prefixed env vars to SUPABASE_* expected by the exporter if not already present
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
if (!process.env.SUPABASE_KEY && process.env.VITE_SUPABASE_ANON_KEY) process.env.SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Debug: log presence (do not print secrets)
console.log('ENV CHECK: SUPABASE_URL present=', !!process.env.SUPABASE_URL, 'SUPABASE_KEY present=', !!process.env.SUPABASE_KEY, 'VITE_SUPABASE_URL present=', !!process.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_ANON_KEY present=', !!process.env.VITE_SUPABASE_ANON_KEY);

// Launch server
require('./server.cjs');
