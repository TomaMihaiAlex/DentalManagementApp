const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

// Simple buffer helper: collect stream to buffer
function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (c) => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

function argb(hex) {
  if (!hex) return undefined;
  const cleaned = hex.replace('#', '');
  return `FF${cleaned.toUpperCase()}`;
}

async function buildWorkbook(doctor, comenzi) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Comenzi');

  ws.columns = [
    { header: '', key: 'pacient', width: 28 },
    { header: '', key: 'produs', width: 36 },
    { header: '', key: 'cant', width: 12 },
    { header: '', key: 'pret', width: 16 }
  ];

  // Title merge A1:D2
  ws.mergeCells('A1:D2');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Export Laborator';
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Doctor row A3:D3
  ws.mergeCells('A3:D3');
  const docCell = ws.getCell('A3');
  docCell.value = `Medic: ${doctor.nume || doctor.nume_complet || ''}`;
  docCell.font = { size: 11, bold: true };

  // Header row 5
  const headerRow = ws.getRow(5);
  headerRow.getCell(1).value = 'PACIENT';
  headerRow.getCell(2).value = 'PRODUS';
  headerRow.getCell(3).value = 'CANTITATE';
  headerRow.getCell(4).value = 'PREȚ';
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb('#F2F4F7') }
    };
    cell.border = { bottom: { style: 'thin', color: { argb: argb('#D9D9D9') } } };
    cell.font = { bold: true };
  });

  // start writing data at row 6
  let rowIndex = 6;

  // comenzi is array of commands with produse and pacient info
  let grandTotal = 0;
  // group by pacient
  const grupuri = {};
  for (const c of comenzi) {
    for (const p of c.produse) {
      const pacientId = c.id_pacient || 'unknown';
      if (!grupuri[pacientId]) grupuri[pacientId] = { pacient: c.pacient, produse: [] };
      grupuri[pacientId].produse.push({ produs: p, comanda: c });
    }
  }

  for (const key of Object.keys(grupuri)) {
    const g = grupuri[key];
    const startRow = rowIndex;
    for (const item of g.produse) {
      const prod = item.produs;
      const pret = (prod.pret_unitar ?? prod.pret) || 0;
      const cant = prod.cantitate || prod.cant || 1;
      const cell = ws.getRow(rowIndex);
      cell.getCell(1).value = g.pacient?.nume || g.pacient?.nume_complet || '';
      cell.getCell(2).value = prod.nume || prod?.denumire || '';
      cell.getCell(3).value = cant;
      cell.getCell(4).value = pret * cant;
      cell.getCell(4).font = { bold: true };
      // price tint
      cell.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#E8F5E9') } };
      // alternating background
      const bg = (rowIndex % 2 === 0) ? '#FAFAFA' : '#FFFFFF';
      for (let cidx = 1; cidx <= 4; cidx++) {
        ws.getCell(rowIndex, cidx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
      }
      grandTotal += pret * cant;
      rowIndex++;
    }
    // merge pacient name cells vertically
    if (rowIndex - startRow > 1) {
      ws.mergeCells(`A${startRow}:A${rowIndex - 1}`);
    }
  }

  // totals row
  const totalRow = ws.getRow(rowIndex + 1);
  const totalRangeStart = `A${rowIndex + 1}`;
  const totalRangeEnd = `D${rowIndex + 1}`;
  ws.mergeCells(`${totalRangeStart}:${totalRangeEnd}`);
  const totalCell = ws.getCell(totalRangeStart);
  totalCell.value = `TOTAL: ${grandTotal.toFixed(2)} RON`;
  totalCell.alignment = { horizontal: 'center' };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#FFF3CD') } };
  totalCell.font = { bold: true, color: { argb: argb('#0056B3') } };

  // try to embed image if available
  try {
    const imgPath = path.join(process.cwd(), 'poza_site.png');
    if (fs.existsSync(imgPath)) {
      const imgId = wb.addImage({ buffer: fs.readFileSync(imgPath), extension: 'png' });
      // add image anchored to A1:D2 area (top-right-ish)
      ws.addImage(imgId, { tl: { col: 2.2, row: 0.1 }, ext: { width: 98, height: 48 } });
    }
  } catch (err) {
    // ignore image errors in serverless
    console.error('Image embed error', err && err.message);
  }

  return wb.xlsx.writeBuffer();
}

async function handler(req, res) {
  try {
    const body = req.method === 'GET' ? req.query : req.body;
    const startDate = body.startDate;
    const endDate = body.endDate;

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_KEY in environment' });
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // fetch doctors and finalized comenzi within the date range
    const { data: comenzi = [] } = await supabase.from('comenzi').select('*').eq('status', 'Finalizată').gte('data_finalizare', startDate).lte('data_finalizare', endDate);
    if (!comenzi.length) {
      res.status(200).json({ message: 'No finalized orders in range' });
      return;
    }

    // fetch related tables in batched queries (products and patients)
    const pacientIds = Array.from(new Set(comenzi.map(c => c.id_pacient).filter(Boolean)));
    const doctorIds = Array.from(new Set(comenzi.map(c => c.id_doctor).filter(Boolean)));

    const [{ data: pacienti = [] }, { data: doctori = [] }] = await Promise.all([
      supabase.from('pacienti').select('*').in('id_pacient', pacientIds),
      supabase.from('doctori').select('*').in('id_doctor', doctorIds)
    ]);

    // fetch comanda_produse for selected comenzi
    const comandaIds = comenzi.map(c => c.id_comanda).filter(Boolean);
    const { data: comanda_produse = [] } = await supabase.from('comanda_produse').select('*').in('comanda_id', comandaIds);

    // fetch produse referenced
    const produsIds = Array.from(new Set(comanda_produse.map(cp => cp.produs_id).filter(Boolean)));
    const { data: produse = [] } = await supabase.from('produse').select('*').in('id_produs', produsIds);

    // build maps
    const pacientMap = new Map(pacienti.map(p => [p.id_pacient, p]));
    const doctorMap = new Map(doctori.map(d => [d.id_doctor, d]));
    const produsMap = new Map(produse.map(p => [p.id_produs, p]));

    // attach produse into comenzi
    for (const c of comenzi) {
      c.produse = comanda_produse.filter(cp => cp.comanda_id === c.id_comanda).map(cp => {
        const prod = produsMap.get(cp.produs_id) || {};
        return { ...prod, cantitate: cp.cantitate || cp.cantitate_produs || cp.cant || 1 };
      });
      c.pacient = pacientMap.get(c.id_pacient) || null;
      c.doctor = doctorMap.get(c.id_doctor) || null;
    }

    // group by doctor
    const byDoctor = new Map();
    for (const c of comenzi) {
      const did = c.id_doctor || 'unknown';
      if (!byDoctor.has(did)) byDoctor.set(did, []);
      byDoctor.get(did).push(c);
    }

    // prepare archive in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    const pass = new stream.PassThrough();
    archive.pipe(pass);

    // collect archive buffer promise
    const archivePromise = streamToBuffer(pass);

    // for each doctor, build workbook buffer and append
    for (const [did, lista] of byDoctor.entries()) {
      const doctor = doctorMap.get(did) || { nume: `Doctor_${did}` };
      const buf = await buildWorkbook(doctor, lista);
      const filename = `Doctor_${(doctor.nume || doctor.nume_complet || did).replace(/[^a-z0-9._-]/gi, '_')}.xlsx`;
      archive.append(buf, { name: filename });
    }

    await archive.finalize();

    const zipBuffer = await archivePromise;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="export_laborator_${Date.now()}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Export error', err && err.stack || err);
    res.status(500).json({ error: err && err.message || String(err) });
  }
}

// Vercel / Netlify compatibility
module.exports = function (req, res) {
  // If body is a stream, parse JSON (Vercel has already parsed body normally)
  if (req.method === 'GET' || req.method === 'POST') {
    // ensure JSON body for POST
    if (req.method === 'POST' && !req.body) {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => {
        try { req.body = JSON.parse(data || '{}'); } catch (e) { req.body = {}; }
        handler(req, res);
      });
    } else {
      handler(req, res);
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
};
