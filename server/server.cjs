const express = require('express');
const path = require('path');
const fs = require('fs');

let exporter = null;
// Legacy local exporter removed. We'll proxy requests to the serverless API endpoint.
const http = require('http');
const https = require('https');
const { URL } = require('url');
function postToExportApi(payload) {
	return new Promise((resolve, reject) => {
		const target = process.env.EXPORT_API_URL || 'http://localhost:3000/api/export-laborator';
		const url = new URL(target);
		const client = url.protocol === 'https:' ? https : http;
		const data = JSON.stringify(payload || {});
		const opts = { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + (url.search || ''), method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
		const req = client.request(opts, (res) => {
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
		});
		req.on('error', reject);
		req.write(data);
		req.end();
	});
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') return res.sendStatus(200);
	next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/export-laborator', async (req, res) => {
	try {
		if (!exporter || typeof exporter.exportLaboratorToExcel !== 'function') return res.status(500).json({ error: 'exporter not available' });
		const { startDate, endDate } = req.body || {};
		const zipBuf = await exporter.exportLaboratorToExcel(startDate, endDate);
		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="export_laborator.zip"');
		res.send(zipBuf);
	} catch (err) {
		console.error('export-laborator failed', err && err.stack ? err.stack : err);
		res.status(500).json({ error: 'export failed', details: err && err.message, stack: err && err.stack ? String(err.stack) : undefined });
	}
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, '0.0.0.0', () => console.log(`Export server listening at http://localhost:${port}`));

module.exports = app;

