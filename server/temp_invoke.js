const { createRequire } = require('module');
const requireC = createRequire(__filename);
const ex = requireC('../api/export-laborator.js');
console.log('typeof export:', typeof ex);
if (typeof ex === 'function') console.log('function length', ex.length);
else console.log('export keys', Object.keys(ex));

// If it's a function, try to call it with a dummy req/res
(async () => {
  if (typeof ex === 'function') {
    const req = { method: 'POST', body: { startDate: '2025-10-01', endDate: '2025-10-21' } };
    const res = { statusCode:200, headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(code){ this.statusCode=code; return this; }, json(obj){ console.log('RES JSON', this.statusCode, JSON.stringify(obj,null,2)); }, send(b){ if(Buffer.isBuffer(b)) { console.log('RES SEND buffer length=', b.length); } else { console.log('RES SEND', typeof b, b && b.toString().slice(0,200)); } } };
    try { await ex(req,res); } catch(e){ console.error('invoke error', e && (e.stack||e)); }
  }
})();
