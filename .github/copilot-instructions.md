Repository: dental-lab-management (DuaLite starter)

Goal
- Help an AI coding agent become productive quickly in this codebase: a small React + Vite + TypeScript SPA that optionally uses Supabase for persistence.

Quick facts (what to know first)
- App entry: `src/main.tsx` -> `src/App.tsx` (routes, `AuthProvider`, `DataProvider`).
- Data layer: `src/context/DataContext.tsx` — provides all CRUD operations and is the primary place to change business logic; falls back to in-memory mock data when Supabase is not configured.
- Supabase client: `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. When not set, `supabase` is `null` and the app uses local mocks in `src/data/mock.ts`.
- Types: `src/lib/types.ts` defines the domain shapes (Doctor, Pacient, Produs, Comanda, Tehnician). Use these types when adding or modifying logic.

Developer workflows (commands you can rely on)
- Install: `npm install`
- Dev server: `npm run dev` (Vite)
- Build: `npm run build`
- Lint: `npm run lint`
- Supabase DB setup: see `supabase/README.md` + `supabase/schema.sql`; helper: `supabase/import-schema.ps1` (Windows PowerShell).

Project-specific conventions and patterns
- Single source of truth for app data: `DataContext` exposes methods like `addComanda`, `updateComanda`, `addDoctor` and handles dual-mode persistence (Supabase OR local mocks). Prefer modifying/adding behavior here over changing UI components.
- Supabase-first, local-fallback pattern: code always checks `if (supabase) { ... } else { ... }`. Keep this pattern when adding new DB writes/reads so devs can run the app without Supabase.
- Mock shape: `src/data/mock.ts` contains realistic example data; new code should use the same shape (see `Comanda.produse: {id_produs, cantitate}`).
- Date handling: dates are strings (ISO-like), and order status logic compares `termen_limita` to `new Date()`; be careful when changing formats.
- i18n: UI and variables use Romanian strings (status values: 'În progres', 'Finalizată', 'Întârziată'); preserve exact strings when persisting/reading status in Supabase.
- Routing: `App.tsx` uses a small private-route wrapper `PrivateRoute` which depends on `useAuth()` (password is hard-coded to 'admin' for login). Authentication is intentionally simple—tests and quick changes may stub `useAuth`.

Integration points and cross-component communication
- UI components call DataContext hooks: look for `useData()` usage across `src/pages/*` and `src/components/*` for real examples (e.g., `Comenzi.tsx`, `Doctori.tsx`).
- Supabase tables expected (see `supabase/schema.sql`): `doctori`, `pacienti`, `produse`, `tehnicieni`, `comenzi`, `comanda_produse`. Keep field names consistent with `src/lib/supabase.ts` usage (e.g., `id_doctor`, `id_pacient`, `comanda_id`, `produs_id`).

Editing guidance and examples (be concrete)
- If you add a new domain field, update these spots:
  - `src/lib/types.ts`
  - `src/data/mock.ts` (example rows)
  - `src/context/DataContext.tsx` (persist logic and local state)
  - `supabase/schema.sql` (if it needs to be persisted server-side)
- Example: to add a `notite` text field on `Comanda`: add `notite?: string` to `Comanda` in `src/lib/types.ts`, include `notite` when computing payloads in `addComanda`/`updateComanda` and update `mock.ts` and `schema.sql`.

Quick debugging tips
- Console logs: `DataContext` contains multiple `console.debug` and `console.error` calls around Supabase operations — inspect browser console for DB flow.
- Supabase offline: when `VITE_SUPABASE_*` env vars are missing the app uses mock data; this is intentional for local dev — set the env vars in a `.env` file at project root to enable DB persistence.
- Running DB schema import on Windows: open PowerShell and run `.in\psql` or use `supabase/import-schema.ps1` as documented in `supabase/README.md` (it calls `psql`).

Boundaries & risks
- The app exposes Supabase anon key to the client (public). Do not store private credentials in the client code. Server-side logic or RLS should protect sensitive operations in production.
- Tests: this starter project has no test runner configured. Add unit tests near `src/context` to cover business logic if needed.

Files worth reading first (in order)
1. `src/context/DataContext.tsx` (data flows, persistence)
2. `src/lib/supabase.ts` (env var expectations)
3. `src/lib/types.ts` (domain shapes)
4. `src/data/mock.ts` (example data)
5. `src/App.tsx` and `src/main.tsx` (routing and providers)

If anything above is unclear or you'd like more detail (example PR templates, tests to add, or specific flows instrumented), say which area and I'll expand.
