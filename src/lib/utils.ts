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
    let res: Response | null = null;
    let firstError: any = null;
    try {
        res = await fetch(endpointRelative, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });
    } catch (e) {
        firstError = e;
    }

    // If relative endpoint returned 404 or failed (common when dev server isn't proxying),
    // retry against the local export server on port 3000.
    if ((!res || res.status === 404) && typeof window !== 'undefined') {
        const fallbackBase = `${window.location.protocol}//${window.location.hostname}:3000`;
        const fallbackUrl = `${fallbackBase}${endpointRelative}`;
        try {
            res = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                mode: 'cors'
            });
        } catch (e) {
            // if first attempt had an error, prefer that message; otherwise keep this one
            if (!firstError) firstError = e;
        }
    }

    if (!res) {
        throw new Error(`Export failed: no response from server (${firstError && firstError.message ? firstError.message : 'network error'})`);
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
