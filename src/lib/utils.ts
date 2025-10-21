import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Comanda, Doctor, Produs } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: ro });
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
};

export const exportComenziToExcel = async (
    // Keep signature compatible for callers that pass domain arrays; only dates are required for server export.
    _comenzi: Comanda[] | undefined,
    _doctori: Doctor[] | undefined,
    _produse: Produs[] | undefined,
    startDate: Date,
    endDate: Date
) => {
    // This client-side helper delegates the Excel/ZIP generation to the server-side exporter
    // which uses a secure, audited library (exceljs) and returns a ZIP containing per-doctor .xlsx files.
    const payload = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    const endpointRelative = '/api/export-laborator';
    const tryUrls: string[] = [];
    // prefer relative first
    tryUrls.push(endpointRelative);
    if (typeof window !== 'undefined') {
        const host = window.location.hostname || 'localhost';
        const proto = window.location.protocol || 'http:';
        tryUrls.push(`${proto}//${host}:3000${endpointRelative}`);
        // also try 127.0.0.1 in case hostname resolves oddly
        tryUrls.push(`${proto}//127.0.0.1:3000${endpointRelative}`);
    } else {
        tryUrls.push(`http://localhost:3000${endpointRelative}`);
    }

    let res: Response | null = null;
    let lastError: any = null;
    const timeoutMs = 60_000; // 60s

    for (const url of tryUrls) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/zip, application/json' },
                body: JSON.stringify(payload),
                credentials: 'same-origin',
                mode: 'cors',
                signal: controller.signal
            });
            clearTimeout(id);
            // if we got a valid Response (even 4xx/5xx) stop trying further
            break;
        } catch (e) {
            lastError = e;
            // try next URL
            res = null;
        }
    }

    if (!res) {
        const msg = lastError && lastError.name === 'AbortError' ? 'Request timed out' : (lastError && lastError.message ? lastError.message : 'network error');
        throw new Error(`Export failed: no response from server (${msg}). Please ensure the export server is running (try running 'node server/server.cjs' or 'node server/run_local_export.mjs' locally).`);
    }

    if (!res.ok) {
        // Prefer structured JSON error from the server if available
        let details = '';
        try {
            const json = await res.json().catch(() => null);
            if (json && typeof json === 'object') {
                details = json.details || json.error || JSON.stringify(json);
            } else {
                details = await res.text().catch(() => '');
            }
        } catch (e) {
            details = (await res.text().catch(() => '')) || '';
        }
        throw new Error(`Export failed: ${res.status} ${res.statusText} ${details}`);
    }

    // If server returned JSON (even with 200) treat it as an error/debug response
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
        const json = await res.json().catch(() => null);
        const details = json && typeof json === 'object' ? (json.message || json.error || JSON.stringify(json)) : 'Server returned JSON';
        throw new Error(`Export failed: ${details}`);
    }

    const blob = await res.blob();
    const filename = `export_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};
