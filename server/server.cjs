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
// Capture raw body for debugging and return JSON on parse errors instead of HTML
app.use(express.json({
	limit: '10mb',
	verify: (req, _res, buf) => {
		try {
			req.rawBody = buf && buf.toString && buf.toString('utf8');
		} catch (e) {
			req.rawBody = undefined;
		}
	},
}));

// JSON parse error handler (body-parser/express.json) — return JSON instead of default HTML error page
// JSON parse error handler will be attached after routes below so it catches parse errors from body-parser

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') return res.sendStatus(200);
	next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Root help page to avoid "Cannot GET /" and provide quick test examples
app.get('/', (req, res) => {
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(`
				<!doctype html>
				<html>
				<head><meta charset="utf-8"><title>Export Server</title></head>
				<body>
				<h2>Export Server</h2>
				<p>Endpoints:</p>
				<ul>
					<li><a href="/health">/health</a> - returns JSON { ok: true }</li>
					<li>POST /api/export-laborator - accepts JSON { startDate, endDate } and returns a ZIP</li>
				</ul>
				<p>PowerShell-safe curl examples:</p>
				<pre>
$payload = '{"startDate":"2025-10-01","endDate":"2025-10-21"}'
curl.exe -H "Content-Type: application/json" -d $payload http://localhost:3000/api/export-laborator --output export.zip

# or using stdin (works well in PowerShell)
'{"startDate":"2025-10-01","endDate":"2025-10-21"}' | curl.exe -H "Content-Type: application/json" -d @- http://localhost:3000/api/export-laborator --output export.zip
				</pre>
				</body>
				</html>
		`);
});

app.post('/api/export-laborator', async (req, res) => {
	try {
		const { startDate, endDate } = req.body || {};
		// If a local exporter object exists use it, otherwise proxy to configured serverless/local endpoint
		if (exporter && typeof exporter.exportLaboratorToExcel === 'function') {
			const zipBuf = await exporter.exportLaboratorToExcel(startDate, endDate);
			res.setHeader('Content-Type', 'application/zip');
			res.setHeader('Content-Disposition', 'attachment; filename="export_laborator.zip"');
			res.send(zipBuf);
			return;
		}

		// Try to import the serverless handler directly (ESM) and call it to avoid HTTP self-proxy loops
		let importError = null;
		try {
			// Use pathToFileURL to create a file:// URL which works reliably on Windows
			const { pathToFileURL } = require('url');
			const handlerPath = path.resolve(__dirname, '..', 'api', 'export-laborator.js');
			const handlerUrl = pathToFileURL(handlerPath).href;
			const mod = await import(handlerUrl);
			if (mod && typeof mod.default === 'function') {
				// The serverless handler expects (req, res) style objects. We'll call it directly.
				// Ensure req.body is present (express.json already parsed it earlier)
				await mod.default(req, res);
				return;
			}
			importError = new Error('imported module does not export default async handler');
		} catch (impErr) {
			importError = impErr;
			console.warn('Failed to import serverless handler directly, will attempt proxy. Import error:', impErr && (impErr.message || impErr));
		}

		// Fallback: Proxy to EXPORT_API_URL if direct import failed
		const target = process.env.EXPORT_API_URL;
		if (!target) {
			// No external URL configured and import failed: return helpful JSON with import error
			const msg = importError && (importError.message || String(importError)) || 'no importer error available';
			console.error('No EXPORT_API_URL configured and direct import failed:', msg, importError && importError.stack ? importError.stack.split('\n').slice(0,5).join('\n') : undefined);
			return res.status(500).json({ error: 'no exporter available and no EXPORT_API_URL configured', importError: msg });
		}
		const url = new URL(target);
		const client = url.protocol === 'https:' ? https : http;
		const payload = JSON.stringify({ startDate, endDate });
		const opts = { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + (url.search || ''), method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
		const proxyReq = client.request(opts, (proxyRes) => {
			const chunks = [];
			proxyRes.on('data', (c) => chunks.push(c));
			proxyRes.on('end', () => {
				const body = Buffer.concat(chunks);
				// forward headers/status
				Object.entries(proxyRes.headers || {}).forEach(([k, v]) => { if (v) res.setHeader(k, v); });
				res.statusCode = proxyRes.statusCode || 200;
				res.send(body);
			});
		});
		proxyReq.on('error', (e) => {
			console.error('Proxy error to export api', e && e.message || e);
			res.status(500).json({ error: 'proxy failed', details: e && e.message });
		});
		proxyReq.write(payload);
		proxyReq.end();
	} catch (err) {
		console.error('export-laborator failed', err && err.stack ? err.stack : err);
		res.status(500).json({ error: 'export failed', details: err && err.message, stack: err && err.stack ? String(err.stack) : undefined });
	}
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, '0.0.0.0', () => console.log(`Export server listening at http://localhost:${port}`));

// Final error handler to return JSON for JSON parse errors and other server errors
app.use((err, req, res, next) => {
	if (!err) return next();
	const isJsonParseError = err instanceof SyntaxError || err.type === 'entity.parse.failed' || /Unexpected token/.test(err.message || '');
	if (isJsonParseError) {
		console.warn('JSON parse error on request (final handler)', { message: err.message, rawBody: req && req.rawBody && String(req.rawBody).slice(0, 200) });
		return res.status(400).json({ error: 'invalid_json', message: err.message, rawBodyPreview: req && req.rawBody && String(req.rawBody).slice(0, 200) });
	}
	console.error('Unhandled server error', err && err.stack ? err.stack : err);
	res.status(500).json({ error: 'server_error', message: err && err.message });
});

// Log uncaught exceptions so we can debug unexpected crashes during development
process.on('uncaughtException', (e) => {
	console.error('uncaughtException', e && e.stack ? e.stack : e);
});

module.exports = app;

