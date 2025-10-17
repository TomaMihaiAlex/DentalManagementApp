Instrucțiuni pentru configurarea Supabase

1. Creează un proiect nou în Supabase: https://app.supabase.com/
2. Deschide SQL Editor în dashboard-ul proiectului.
3. Copiază conținutul din `supabase/schema.sql` și rulează-l pentru a crea tabelele.
4. În dashboard -> Settings -> API copiază valorile:
   - `URL` -> folosește-l pentru `VITE_SUPABASE_URL`
   - `anon key` (public) -> folosește-l pentru `VITE_SUPABASE_ANON_KEY`
5. În proiectul local, creează un fișier `.env` în rădăcina proiectului cu:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

6. Reporneste dev serverul (`npm run dev`).

Note:
- Cheia anon este publică și folosită pentru acces client; dacă ai nevoie de date sensibile folosește funcții server-side sau RLS.
- Dacă nu setezi variabilele, aplicația va folosi stocarea locală (mock) pentru dezvoltare.

PowerShell helper:

Am adăugat un script helper PowerShell `supabase/import-schema.ps1` care rulează `schema.sql` folosind `psql` (Postgres client). Folosește-l dacă ai `psql` instalat local.

Exemplu:
```powershell
# set environment variable (optional)
#$env:SUPABASE_DB_URL = 'postgresql://postgres:password@db.host:5432/postgres'
.\supabase\import-schema.ps1
```

Important: folosește doar în medii de dezvoltare. Conexiunea la baza de date conține credențiale sensibile — NU le publica.
