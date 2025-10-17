import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import * as XLSX from 'xlsx';
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

export const exportComenziToExcel = (
    comenzi: Comanda[],
    doctori: Doctor[],
    produse: Produs[],
    startDate: Date,
    endDate: Date
) => {
    // Filter only for 'Finalizată' orders within the selected date range based on 'data_finalizare'
    const filteredComenzi = comenzi.filter(c => {
        if (c.status !== 'Finalizată' || !c.data_finalizare) {
            return false;
        }
        const comandaDate = parseISO(c.data_finalizare);
        return isWithinInterval(comandaDate, { start: startDate, end: endDate });
    });

    const groupedByDoctor = filteredComenzi.reduce((acc, comanda) => {
        (acc[comanda.id_doctor] = acc[comanda.id_doctor] || []).push(comanda);
        return acc;
    }, {} as Record<number, Comanda[]>);

    for (const doctorId in groupedByDoctor) {
        const doctor = doctori.find(d => d.id === Number(doctorId));
        if (!doctor) continue;

        const comenziDoctor = groupedByDoctor[doctorId];
        const productNames = produse.map(p => p.nume);
        const headers = ['PACIENT', ...productNames.map(p => p.toUpperCase()), 'TOTAL'].map(h => h.toUpperCase());
        
        const sheetData = comenziDoctor.map(comanda => {
            const pacient = doctor.pacienti.find(p => p.id === comanda.id_pacient);
            const row: (string | number)[] = [pacient?.nume || 'N/A'];
            
            produse.forEach(produs => {
                const comandaProdus = comanda.produse.find(cp => cp.id_produs === produs.id);
                row.push(comandaProdus ? comandaProdus.cantitate : '-');
            });

            row.push(comanda.total);
            return row;
        });

        const totalSum = comenziDoctor.reduce((sum, c) => sum + c.total, 0);
        const totalRow = ['TOTAL SUMĂ', ...Array(productNames.length).fill(''), totalSum];

        const finalSheetData = [
            [doctor.nume.toUpperCase()],
            headers,
            ...sheetData,
            totalRow
        ];

        const ws = XLSX.utils.aoa_to_sheet(finalSheetData);

        // --- STYLING ---
        const borderStyle = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        const centerAlign = { alignment: { horizontal: 'center', vertical: 'center' } };
        
        const titleStyle = { font: { name: 'Calibri', sz: 16, bold: true }, ...centerAlign };
        const headerStyle = { font: { name: 'Calibri', sz: 12, bold: true }, fill: { fgColor: { rgb: "E0E0E0" } }, border: borderStyle, ...centerAlign };
        const totalLabelStyle = { font: { name: 'Calibri', sz: 12, bold: true }, border: borderStyle, ...centerAlign };
        const totalValueStyle = { font: { name: 'Calibri', sz: 12, bold: true }, numFmt: '#,##0.00 "RON"', border: borderStyle, ...centerAlign };
        const currencyStyle = { numFmt: '#,##0.00 "RON"', border: borderStyle, ...centerAlign };
        const defaultCellStyle = { border: borderStyle, ...centerAlign };

        // 1. Column Widths
        const colWidths = headers.map((header, i) => {
            const allValues = [header, ...finalSheetData.map(row => row[i])];
            const maxLength = Math.max(...allValues.filter(v => v != null).map(v => v.toString().length));
            return { wch: maxLength + 5 }; // +5 for padding
        });
        ws['!cols'] = colWidths;

        // 2. Apply Styles
        // Title
        ws['A1'].s = titleStyle;
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
        ws['!rows'] = [{ hpt: 25 }]; // Title row height

        // Headers
        headers.forEach((_, c) => {
            const cellRef = XLSX.utils.encode_cell({ r: 1, c });
            if (ws[cellRef]) ws[cellRef].s = headerStyle;
        });

        // Data Rows
        sheetData.forEach((row, r) => {
            row.forEach((cellValue, c) => {
                const cellRef = XLSX.utils.encode_cell({ r: 2 + r, c });
                if (!ws[cellRef]) ws[cellRef] = { t: typeof cellValue === 'number' ? 'n' : 's', v: cellValue };
                
                if (c === headers.length - 1) { // Total column
                    ws[cellRef].s = currencyStyle;
                } else {
                    ws[cellRef].s = defaultCellStyle;
                }
            });
        });
        
        // Total Row
        const totalRowNum = 2 + sheetData.length;
        const totalLabelCellRef = XLSX.utils.encode_cell({ r: totalRowNum, c: 0 });
        const totalValueCellRef = XLSX.utils.encode_cell({ r: totalRowNum, c: headers.length - 1 });
        if (ws[totalLabelCellRef]) ws[totalLabelCellRef].s = totalLabelStyle;
        if (ws[totalValueCellRef]) ws[totalValueCellRef].s = totalValueStyle;

        const wb = XLSX.utils.book_new();
        const safeSheetName = doctor.nume.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

        const filename = `${doctor.nume.replace(/\s/g, '_')}_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}.xlsx`;
        XLSX.writeFile(wb, filename);
    }
};
