import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import stream from 'stream';

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
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Doctor row A3:D3
  ws.mergeCells('A3:D3');
  const docCell = ws.getCell('A3');
  docCell.value = `Medic: ${doctor.nume || doctor.nume_complet || ''}`;
  docCell.font = { size: 11, bold: true };
  docCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Header row 5
  const headerRow = ws.getRow(5);
  headerRow.getCell(1).value = 'PACIENT';
  headerRow.getCell(2).value = 'PRODUS';
  headerRow.getCell(3).value = 'CANTITATE';
  headerRow.getCell(4).value = 'PREȚ';
  headerRow.height = 18;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb('#F2F4F7') }
    };
    cell.border = { bottom: { style: 'thin', color: { argb: argb('#D9D9D9') } } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // start writing data at row 6
  let rowIndex = 6;

  let grandTotal = 0;
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
      cell.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#E8F5E9') } };
      const bg = (rowIndex % 2 === 0) ? '#FAFAFA' : '#FFFFFF';
      for (let cidx = 1; cidx <= 4; cidx++) {
        const curCell = ws.getCell(rowIndex, cidx);
        curCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(bg) } };
        // center-align all data cells
        curCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      grandTotal += pret * cant;
      rowIndex++;
    }
    if (rowIndex - startRow > 1) {
      ws.mergeCells(`A${startRow}:A${rowIndex - 1}`);
      // ensure merged pacient cell is centered vertically and horizontally
      const mergedCell = ws.getCell(`A${startRow}`);
      mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // totals row
  const totalRow = ws.getRow(rowIndex + 1);
  const totalRangeStart = `A${rowIndex + 1}`;
  const totalRangeEnd = `D${rowIndex + 1}`;
  ws.mergeCells(`${totalRangeStart}:${totalRangeEnd}`);
  const totalCell = ws.getCell(totalRangeStart);
  totalCell.value = `TOTAL: ${grandTotal.toFixed(2)} RON`;
  totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#FFF3CD') } };
  totalCell.font = { bold: true, color: { argb: argb('#0056B3') } };

  // try to embed image if available
  try {
    const imgPath = path.join(process.cwd(), 'poza_site.png');
    if (fs.existsSync(imgPath)) {
      const imgId = wb.addImage({ buffer: fs.readFileSync(imgPath), extension: 'png' });
      // Place the logo/image in the top-right area spanning columns C:D and rows 1:2
      try {
        // Determine combined height of rows 1 and 2 (points). If undefined, assume 15pt each (Excel default).
        const row1Pt = ws.getRow(1).height || 15;
        const row2Pt = ws.getRow(2).height || 15;
        const pxPerPoint = 96 / 72; // 1 point = 1.3333 pixels (approx)
        const totalPx = (row1Pt + row2Pt) * pxPerPoint;
        // target image height so bottom is 2px above the bottom of row 2
        const imgHeightPx = Math.max(8, Math.round(totalPx - 2));
        // place image anchored within C1:D2 area, using ext height slightly smaller than the full cell area
        // left column for C is index 2 (0-based cols in tl), we nudge slightly to the right
        ws.addImage(imgId, { tl: { col: 2.05, row: 0.05 }, ext: { width: 110, height: imgHeightPx } });
      } catch (e) {
        // fallback to anchored placement
        ws.addImage(imgId, { tl: { col: 2.6, row: 0.1 }, ext: { width: 110, height: 56 } });
      }
    }
  } catch (err) {
    console.error('Image embed error', err && err.message);
  }

  return wb.xlsx.writeBuffer();
}

async function handler(req, res) {
  try {
    const body = req.method === 'GET' ? req.query : req.body;
    const startDate = body && body.startDate;
    const endDate = body && body.endDate;
    const debug = body && (body.debug === true || body.debug === 'true');

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    let useMock = false;
    let supabase = null;
    let comenzi = [];
    let pacienti = [];
    let doctori = [];
    let comanda_produse = [];
    let produse = [];

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      // Local development fallback: build a small mock dataset so the endpoint returns a ZIP without Supabase
      console.warn('SUPABASE_* env vars not set — using local mock data for export (development only)');
      useMock = true;
      // Simple mock: one doctor, one pacient, one produs, one comanda
      doctori = [ { id: 'd1', nume: 'Dr. Test' } ];
      pacienti = [ { id: 'p1', nume: 'Ion Popescu' } ];
      produse = [ { id: 'pr1', nume: 'Coroana', pret_unitar: 120 } ];
      comenzi = [ { id: 'c1', id_doctor: 'd1', id_pacient: 'p1', status: 'Finalizată', data_finalizare: new Date().toISOString() } ];
      comanda_produse = [ { comanda_id: 'c1', produs_id: 'pr1', cantitate: 1 } ];
    } else {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // fetch doctors and finalized comenzi within the date range
      // Guard: only apply date filters if provided
      let comenziQuery = supabase.from('comenzi').select('*').eq('status', 'Finalizat\u0103');
      if (startDate) comenziQuery = comenziQuery.gte('data_finalizare', startDate);
      if (endDate) comenziQuery = comenziQuery.lte('data_finalizare', endDate);
      const { data: comenziData = [], error: comenziError } = await comenziQuery;
      if (comenziError) {
        console.error('Supabase error fetching comenzi:', comenziError);
        const payload = { ok: false, error: 'Failed fetching comenzi', details: comenziError };
        res.status(500).json(payload);
        return;
      }
      comenzi = comenziData;
    }

    // If debug requested, return a quick summary (counts) instead of building the zip
    if (debug || (req.headers && String(req.headers.accept || '').includes('application/json'))) {
      const pacientIds = Array.from(new Set(comenzi.map(c => c.id_pacient).filter(Boolean)));
      const doctorIds = Array.from(new Set(comenzi.map(c => c.id_doctor).filter(Boolean)));
      const summary = { ok: true, comenziCount: comenzi.length, pacientCount: pacientIds.length, doctorCount: doctorIds.length, usingMock: useMock };
      res.status(200).json(summary);
      return;
    }

    if (!comenzi || comenzi.length === 0) {
      res.status(200).json({ message: 'No finalized orders in range' });
      return;
    }

    // fetch related tables in batched queries (products and patients) only when not using mock
    if (!useMock) {
      const pacientIds = Array.from(new Set(comenzi.map(c => c.id_pacient).filter(Boolean)));
      const doctorIds = Array.from(new Set(comenzi.map(c => c.id_doctor).filter(Boolean)));

      // fetch pacienti and doctori only if we have ids
      if (pacientIds.length) {
        // pacienti table uses `id` as primary key
        const pRes = await supabase.from('pacienti').select('*').in('id', pacientIds);
        if (pRes.error) {
          console.error('Supabase error fetching pacienti:', pRes.error);
          res.status(500).json({ error: 'Failed fetching pacienti', details: pRes.error });
          return;
        }
        pacienti = pRes.data || [];
      }
      if (doctorIds.length) {
        // doctori table uses `id` as primary key
        const dRes = await supabase.from('doctori').select('*').in('id', doctorIds);
        if (dRes.error) {
          console.error('Supabase error fetching doctori:', dRes.error);
          res.status(500).json({ error: 'Failed fetching doctori', details: dRes.error });
          return;
        }
        doctori = dRes.data || [];
      }

      // fetch comanda_produse for selected comenzi
      // comenzi primary key is `id`
      const comandaIds = comenzi.map(c => c.id).filter(Boolean);
      if (comandaIds.length) {
        const cpRes = await supabase.from('comanda_produse').select('*').in('comanda_id', comandaIds);
        if (cpRes.error) {
          console.error('Supabase error fetching comanda_produse:', cpRes.error);
          res.status(500).json({ error: 'Failed fetching comanda_produse', details: cpRes.error });
          return;
        }
        comanda_produse = cpRes.data || [];
      }

      // fetch produse referenced
      const produsIds = Array.from(new Set(comanda_produse.map(cp => cp.produs_id).filter(Boolean)));
      if (produsIds.length) {
        // produse table uses `id` as primary key
        const prodRes = await supabase.from('produse').select('*').in('id', produsIds);
        if (prodRes.error) {
          console.error('Supabase error fetching produse:', prodRes.error);
          res.status(500).json({ error: 'Failed fetching produse', details: prodRes.error });
          return;
        }
        produse = prodRes.data || [];
      }
    }

    // build maps
  // maps keyed by primary key column `id`
  const pacientMap = new Map(pacienti.map(p => [p.id, p]));
  const doctorMap = new Map(doctori.map(d => [d.id, d]));
  const produsMap = new Map(produse.map(p => [p.id, p]));

    // attach produse into comenzi
    for (const c of comenzi) {
      c.produse = comanda_produse.filter(cp => cp.comanda_id === c.id).map(cp => {
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
    // Always return JSON for errors so clients can parse and stop spinners
    res.status(500).json({ error: err && err.message || String(err) });
  }
}
// Vercel / Netlify compatibility
// Export default handler for ESM environments

// Vercel / Netlify compatibility
// Export default handler for ESM environments
export default async function (req, res) {
  if (req.method === 'GET' || req.method === 'POST') {
    if (req.method === 'POST' && !req.body) {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => {
        try { req.body = JSON.parse(data || '{}'); } catch (e) { req.body = {}; }
        handler(req, res);
      });
    } else {
      await handler(req, res);
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
