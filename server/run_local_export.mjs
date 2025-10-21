import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import handler from '../api/export-laborator.js';

async function run() {
  const req = { method: 'POST', body: { startDate: process.env.TEST_START || null, endDate: process.env.TEST_END || null } };
  const outPath = path.resolve(process.cwd(), 'local_export_result.zip');
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { console.log('RESP JSON', this.statusCode, obj); },
    send(b) {
      if (Buffer.isBuffer(b)) {
        fs.writeFileSync(outPath, b);
        console.log('WROTE', outPath, 'len=', b.length);
      } else {
        console.log('SEND', typeof b, String(b).slice(0,200));
      }
    }
  };

  try {
    await handler(req, res);
  } catch (err) {
    console.error('local invoke error', err && (err.stack || err));
  }
}

run();
