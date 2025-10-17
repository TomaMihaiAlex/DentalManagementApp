export interface Doctor {
    id: number;
    nume: string;
    email: string;
    telefon: string;
    pacienti: Pacient[];
}

export interface Pacient {
    id: number;
    nume: string;
    id_doctor: number;
}

export interface Produs {
    id: number;
    nume: string;
    pret: number;
}

export interface ComandaProdus {
    id?: number; // optional id from comanda_produse (DB join row id)
    id_produs: number;
    cantitate: number;
}

export type OrderStatus = 'În progres' | 'Finalizată' | 'Întârziată';

export interface Comanda {
    id: number;
    id_doctor: number;
    id_pacient: number;
    produse: ComandaProdus[];
    data_start: string;
    termen_limita: string;
    reducere: number;
    total: number;
    data_finalizare?: string;
    status: OrderStatus;
    tehnician?: string;
}

export interface Tehnician {
    id: number;
    nume: string;
}
