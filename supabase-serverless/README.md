# Serverless export function (Supabase + ExcelJS)

This folder describes how to deploy the `api/export-laborator.js` serverless function to a Node-supporting serverless platform (Vercel, Netlify) and wire it to Supabase.

Key points
- The function queries Supabase for `comenzi`, `comanda_produse`, `produse`, `pacienti`, `doctori`.
- It builds one `.xlsx` per doctor using ExcelJS and archives them into a single ZIP using `archiver`.
- The function expects the following environment variables to be set in the deployment platform:
  - `SUPABASE_URL` (or `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`)
  - `SUPABASE_KEY` (or `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`)

Deployment (Vercel)
1. Copy `api/export-laborator.js` to the `api/` folder in the project root (already added).
2. Add the environment variables in the Vercel dashboard (Project Settings → Environment Variables).
3. Deploy the project to Vercel. The endpoint will be available at `https://<your-deploy>/api/export-laborator`.

Deployment (Netlify)
1. Netlify functions expect a different layout; you can either use the Netlify Node builder or deploy a small Express app as a single function that proxies to this code.
2. Ensure the environment variables are set in Netlify Dashboard.

Notes & limitations
- ExcelJS and Archiver increase function size — Vercel & Netlify handle Node functions but be mindful of cold-starts.
- If you prefer strict edge functions (Supabase Edge Functions / Vercel Edge), ExcelJS may not be compatible because it depends on Node APIs. Use Node-based serverless functions.

Security
- Keep `SUPABASE_KEY` private and set it only in the platform env settings. The key used here is the anon key; if you need stricter security, implement server-side roles/row-level security in Supabase.

Optional
- Add a small health-check or status route to the function to validate env vars before running heavy exports.
