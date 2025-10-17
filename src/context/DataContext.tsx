import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Doctor, Comanda, Produs, Tehnician, Pacient } from '@/lib/types';
import { MOCK_DOCTORI, MOCK_COMENZI, MOCK_PRODUSE, MOCK_TEHNICIENI } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface DataContextType {
  doctori: Doctor[];
  comenzi: Comanda[];
  produse: Produs[];
  pacienti: Pacient[];
  tehnicieni: Tehnician[];
  addDoctor: (doctor: Omit<Doctor, 'id' | 'pacienti'>) => void;
  updateDoctor: (doctor: Doctor) => void;
  deleteDoctor: (doctorId: number) => void;
  addProdus: (produs: Omit<Produs, 'id'>) => void;
  updateProdus: (produs: Produs) => void;
  deleteProdus: (produsId: number) => void;
  addTehnician: (tehnician: Omit<Tehnician, 'id'>) => void;
  deleteTehnician: (tehnicianId: number) => void;
  addComanda: (comanda: Omit<Comanda, 'id' | 'status' | 'total'>) => { newDoctor?: Doctor, newPacient?: Pacient };
  updateComanda: (comanda: Comanda) => void;
  updateComandaTehnician: (comandaId: number, tehnician: string) => void;
  deleteComanda: (comandaId: number) => void;
  finalizeComanda: (comandaId: number, tehnician: string) => void;
  reopenComanda: (comandaId: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [doctori, setDoctori] = useState<Doctor[]>(MOCK_DOCTORI);
  const [comenzi, setComenzi] = useState<Comanda[]>(MOCK_COMENZI);
  const [produse, setProduse] = useState<Produs[]>(MOCK_PRODUSE);
  const [tehnicieni, setTehnicieni] = useState<Tehnician[]>(MOCK_TEHNICIENI);
  const [pacienti, setPacienti] = useState<Pacient[]>(MOCK_DOCTORI.flatMap(d => d.pacienti));

  // On mount, if Supabase client is configured, try to load all data from Supabase
  React.useEffect(() => {
    if (!supabase) return;
    const enableRealtime = (import.meta as any).env?.VITE_ENABLE_REALTIME;
    if (enableRealtime === 'false') return;

    (async () => {
      try {
        console.debug('Loading data from Supabase...');

        const [{ data: doctorRows, error: doctorErr } = {} as any, { data: pacientRows, error: pacientErr } = {} as any, { data: produsRows, error: produsErr } = {} as any, { data: tehnicianRows, error: tehnicianErr } = {} as any, { data: comenziRows, error: comenziErr } = {} as any, { data: cpRows, error: cpErr } = {} as any] = await Promise.all([
          supabase!.from('doctori').select('*'),
          supabase!.from('pacienti').select('*'),
          supabase!.from('produse').select('*'),
          supabase!.from('tehnicieni').select('*'),
          supabase!.from('comenzi').select('*'),
          supabase!.from('comanda_produse').select('*'),
        ]);

        if (doctorErr || pacientErr || produsErr || tehnicianErr || comenziErr || cpErr) {
          console.error('Supabase load errors', { doctorErr, pacientErr, produsErr, tehnicianErr, comenziErr, cpErr });
          toast.error('Eroare la încărcarea datelor din Supabase. Se folosesc datele locale. Vezi consola pentru detalii.');
          return;
        }

        // map produse
        const loadedProduse: Produs[] = (produsRows || []).map((r: any) => ({ id: Number(r.id), nume: r.nume, pret: Number(r.pret) }));

        // map pacienti
        const loadedPacienti: Pacient[] = (pacientRows || []).map((r: any) => ({ id: Number(r.id), nume: r.nume, id_doctor: Number(r.id_doctor) }));

        // map doctori and attach pacienti
        const loadedDoctori: Doctor[] = (doctorRows || []).map((r: any) => ({ id: Number(r.id), nume: r.nume, email: r.email || '', telefon: r.telefon || '', pacienti: [] }));
        // attach pacienti to doctors
        for (const p of loadedPacienti) {
          const d = loadedDoctori.find(dd => dd.id === p.id_doctor);
          if (d) d.pacienti.push(p);
        }

        // map tehnicieni
        const loadedTehnicieni: Tehnician[] = (tehnicianRows || []).map((r: any) => ({ id: Number(r.id), nume: r.nume }));

        // map comanda_produse by comanda_id
        const cpByComanda = new Map<number, { id_produs: number; cantitate: number }[]>();
        for (const row of (cpRows || [])) {
          const comId = Number(row.comanda_id ?? row.comanda_id);
          const arr = cpByComanda.get(comId) || [];
          arr.push({ id_produs: Number(row.produs_id), cantitate: Number(row.cantitate) });
          cpByComanda.set(comId, arr);
        }

        // map comenzi
        const loadedComenzi: Comanda[] = (comenziRows || []).map((r: any) => ({
          id: Number(r.id),
          id_doctor: Number(r.id_doctor),
          id_pacient: Number(r.id_pacient),
          produse: cpByComanda.get(Number(r.id)) || [],
          data_start: r.data_start,
          termen_limita: r.termen_limita,
          reducere: Number(r.reducere || 0),
          total: Number(r.total || 0),
          data_finalizare: r.data_finalizare || undefined,
          status: (r.status as any) || (new Date(r.termen_limita) < new Date() ? 'Întârziată' : 'În progres'),
          tehnician: r.tehnician || undefined,
        } as Comanda));

        // Remove any orders that reference a missing doctor or pacient.
        const invalidComenzi = (loadedComenzi || []).filter(c => {
          const hasDoctor = loadedDoctori.some(d => d.id === c.id_doctor);
          const hasPacient = loadedPacienti.some(p => p.id === c.id_pacient);
          return !hasDoctor || !hasPacient;
        });

        if (invalidComenzi.length > 0) {
          const invalidIds = invalidComenzi.map(c => c.id);
          console.warn('Found comenzi with missing doctor/pacient, will remove:', invalidIds);
          try {
            // delete related comanda_produse and then comenzi from Supabase
            if (supabase) {
              await supabase.from('comanda_produse').delete().in('comanda_id', invalidIds);
              const { error: delErr } = await supabase.from('comenzi').delete().in('id', invalidIds);
              if (delErr) {
                console.error('Error deleting invalid comenzi from Supabase', delErr);
                toast.error('A apărut o eroare la curățarea comenzilor invalide. Verifică consola.');
              } else {
                toast.success(`${invalidIds.length} comenzi invalide au fost șterse din baza de date.`);
              }
            } else {
              // if no Supabase, just log — we'll not include them in local state
              toast.success(`${invalidIds.length} comenzi invalide au fost eliminate din datele locale.`);
            }
          } catch (e) {
            console.error('Error while removing invalid comenzi', e);
            toast.error('Eroare la curățarea comenzilor invalide. Vezi consola pentru detalii.');
          }
        }

        // Filter out invalid comenzi before setting local state
        const filteredComenzi = loadedComenzi.filter(c => loadedDoctori.some(d => d.id === c.id_doctor) && loadedPacienti.some(p => p.id === c.id_pacient));

        // update local state
        setProduse(loadedProduse.length ? loadedProduse : MOCK_PRODUSE);
        setPacienti(loadedPacienti.length ? loadedPacienti : MOCK_DOCTORI.flatMap(d => d.pacienti));
        setDoctori(loadedDoctori.length ? loadedDoctori : MOCK_DOCTORI);
        setTehnicieni(loadedTehnicieni.length ? loadedTehnicieni : MOCK_TEHNICIENI);
        setComenzi(filteredComenzi.length ? filteredComenzi : MOCK_COMENZI);

        toast.success('Datele au fost încărcate din Supabase.');
      } catch (err) {
        console.error('Error loading Supabase data', err);
        toast.error('Eroare la comunicarea cu Supabase. Se folosesc datele locale.');
      }
    })();
  }, []);

  // Realtime subscriptions: when supabase configured, subscribe to DB changes and keep local state in sync
  React.useEffect(() => {
    if (!supabase) return;

    const tables = ['doctori', 'pacienti', 'produse', 'tehnicieni', 'comenzi', 'comanda_produse'];
    const channels: any[] = [];

    const handlePayload = async (table: string, payload: any) => {
      const event = (payload.eventType || '').toString().toUpperCase();
      const newRow = payload.new;
      const oldRow = payload.old;

      try {
        switch (table) {
          case 'doctori': {
            if (event === 'INSERT') {
              const d: Doctor = { id: Number(newRow.id), nume: newRow.nume, email: newRow.email || '', telefon: newRow.telefon || '', pacienti: [] };
              setDoctori(prev => (prev.some(x => x.id === d.id) ? prev : [...prev, d]));
            } else if (event === 'UPDATE') {
              setDoctori(prev => prev.map(d => d.id === Number(newRow.id) ? { ...d, nume: newRow.nume, email: newRow.email || '', telefon: newRow.telefon || '' } : d));
            } else if (event === 'DELETE') {
              const deletedDoctorId = Number(oldRow.id);
              setDoctori(prev => prev.filter(d => d.id !== deletedDoctorId));
              setPacienti(prev => prev.filter(p => p.id_doctor !== deletedDoctorId));
              // Remove comenzi referencing this doctor from local state
              setComenzi(prev => prev.filter(c => c.id_doctor !== deletedDoctorId));
              // Also remove them from Supabase if configured
              if (supabase) {
                try {
                  const { data: idsRes, error: idsErr } = await supabase.from('comenzi').select('id').eq('id_doctor', deletedDoctorId);
                  if (!idsErr && idsRes && idsRes.length) {
                    const ids = idsRes.map((r: any) => r.id);
                    await supabase.from('comanda_produse').delete().in('comanda_id', ids);
                    await supabase.from('comenzi').delete().in('id', ids);
                  } else {
                    // Fallback: attempt direct delete of comenzi by doctor id
                    try { await supabase.from('comenzi').delete().eq('id_doctor', deletedDoctorId); } catch (_) {}
                  }
                } catch (e) {
                  console.error('Error deleting comenzi for deleted doctor', e);
                }
              }
            }
            break;
          }
          case 'pacienti': {
            if (event === 'INSERT') {
              const p: Pacient = { id: Number(newRow.id), nume: newRow.nume, id_doctor: Number(newRow.id_doctor) };
              setPacienti(prev => (prev.some(x => x.id === p.id) ? prev : [...prev, p]));
              setDoctori(prev => prev.map(d => {
                if (d.id !== p.id_doctor) return d;
                const has = d.pacienti.some(x => x.id === p.id);
                return has ? d : { ...d, pacienti: [...d.pacienti, p] };
              }));
            } else if (event === 'UPDATE') {
              const p: Pacient = { id: Number(newRow.id), nume: newRow.nume, id_doctor: Number(newRow.id_doctor) };
              setPacienti(prev => prev.map(x => x.id === p.id ? p : x));
              setDoctori(prev => prev.map(d => ({ ...d, pacienti: d.pacienti.map(x => x.id === p.id ? p : x) })));
            } else if (event === 'DELETE') {
              const deletedPacId = Number(oldRow.id);
              setPacienti(prev => prev.filter(p => p.id !== deletedPacId));
              setDoctori(prev => prev.map(d => ({ ...d, pacienti: d.pacienti.filter(p => p.id !== deletedPacId) })));
              setComenzi(prev => prev.filter(c => c.id_pacient !== deletedPacId));
              if (supabase) {
                try {
                  const { data: idsRes, error: idsErr } = await supabase.from('comenzi').select('id').eq('id_pacient', deletedPacId);
                  if (!idsErr && idsRes && idsRes.length) {
                    const ids = idsRes.map((r: any) => r.id);
                    await supabase.from('comanda_produse').delete().in('comanda_id', ids);
                    await supabase.from('comenzi').delete().in('id', ids);
                  } else {
                    try { await supabase.from('comenzi').delete().eq('id_pacient', deletedPacId); } catch (_) {}
                  }
                } catch (e) {
                  console.error('Error deleting comenzi for deleted pacient', e);
                }
              }
            }
            break;
          }
          case 'produse': {
            if (event === 'INSERT') {
              const pr: Produs = { id: Number(newRow.id), nume: newRow.nume, pret: Number(newRow.pret) };
              setProduse(prev => (prev.some(x => x.id === pr.id) ? prev : [...prev, pr]));
            } else if (event === 'UPDATE') {
              setProduse(prev => prev.map(p => p.id === Number(newRow.id) ? { ...p, nume: newRow.nume, pret: Number(newRow.pret) } : p));
            } else if (event === 'DELETE') {
              setProduse(prev => prev.filter(p => p.id !== Number(oldRow.id)));
            }
            break;
          }
          case 'tehnicieni': {
            if (event === 'INSERT') {
              const t: Tehnician = { id: Number(newRow.id), nume: newRow.nume };
              setTehnicieni(prev => (prev.some(x => x.id === t.id) ? prev : [...prev, t]));
            } else if (event === 'UPDATE') {
              setTehnicieni(prev => prev.map(t => t.id === Number(newRow.id) ? { ...t, nume: newRow.nume } : t));
            } else if (event === 'DELETE') {
              setTehnicieni(prev => prev.filter(t => t.id !== Number(oldRow.id)));
            }
            break;
          }
          case 'comenzi': {
            if (event === 'INSERT') {
              const doctorExists = doctori.some(d => d.id === Number(newRow.id_doctor));
              const pacientExists = pacienti.some(p => p.id === Number(newRow.id_pacient));
              if (!doctorExists || !pacientExists) {
                // remove invalid comanda from DB if possible
                const badId = Number(newRow.id);
                console.warn('Realtime INSERT comanda missing doctor/pacient, removing id=', badId);
                if (supabase) {
                  try {
                    await supabase.from('comanda_produse').delete().eq('comanda_id', badId);
                    await supabase.from('comenzi').delete().eq('id', badId);
                    toast.success(`Comanda invalidă (id=${badId}) a fost ștearsă automat.`);
                  } catch (e) {
                    console.error('Error deleting invalid comanda on realtime insert', e);
                  }
                }
                // ensure not added locally
                setComenzi(prev => prev.filter(c => c.id !== badId));
              } else {
                const nc: Comanda = {
                  id: Number(newRow.id),
                  id_doctor: Number(newRow.id_doctor),
                  id_pacient: Number(newRow.id_pacient),
                  produse: [],
                  data_start: newRow.data_start,
                  termen_limita: newRow.termen_limita,
                  reducere: Number(newRow.reducere || 0),
                  total: Number(newRow.total || 0),
                  data_finalizare: newRow.data_finalizare || undefined,
                  status: (newRow.status as any) || (new Date(newRow.termen_limita) < new Date() ? 'Întârziată' : 'În progres'),
                  tehnician: newRow.tehnician || undefined,
                };
                setComenzi(prev => (prev.some(x => x.id === nc.id) ? prev : [...prev, nc]));
              }
            } else if (event === 'UPDATE') {
              const doctorExists = doctori.some(d => d.id === Number(newRow.id_doctor));
              const pacientExists = pacienti.some(p => p.id === Number(newRow.id_pacient));
              if (!doctorExists || !pacientExists) {
                const badId = Number(newRow.id);
                console.warn('Realtime UPDATE comanda references missing doctor/pacient, removing id=', badId);
                if (supabase) {
                  try {
                    await supabase.from('comanda_produse').delete().eq('comanda_id', badId);
                    await supabase.from('comenzi').delete().eq('id', badId);
                    toast.success(`Comanda invalidă (id=${badId}) a fost ștearsă automat.`);
                  } catch (e) {
                    console.error('Error deleting invalid comanda on realtime update', e);
                  }
                }
                setComenzi(prev => prev.filter(c => c.id !== badId));
              } else {
                setComenzi(prev => prev.map(c => c.id === Number(newRow.id) ? { ...c, id_doctor: Number(newRow.id_doctor), id_pacient: Number(newRow.id_pacient), data_start: newRow.data_start, termen_limita: newRow.termen_limita, reducere: Number(newRow.reducere || 0), total: Number(newRow.total || 0), data_finalizare: newRow.data_finalizare || undefined, status: newRow.status || c.status, tehnician: newRow.tehnician || c.tehnician } : c));
              }
            } else if (event === 'DELETE') {
              setComenzi(prev => prev.filter(c => c.id !== Number(oldRow.id)));
            }
            break;
          }
          case 'comanda_produse': {
            // payload rows contain comanda_id, produs_id, cantitate, id
            const comandaId = Number(newRow?.comanda_id ?? oldRow?.comanda_id);
            if (!comandaId) return;
            if (event === 'INSERT') {
              const prodEntry: any = { id: Number(newRow.id), id_produs: Number(newRow.produs_id), cantitate: Number(newRow.cantitate) };
              setComenzi(prev => prev.map(c => {
                if (c.id !== comandaId) return c;
                const exists = c.produse.some(p => Number(p.id) === prodEntry.id);
                return exists ? c : { ...c, produse: [...c.produse, prodEntry] };
              }));
            } else if (event === 'UPDATE') {
              setComenzi(prev => prev.map(c => {
                if (c.id !== comandaId) return c;
                return { ...c, produse: c.produse.map(p => p.id === Number(newRow.id) ? { id: Number(newRow.id), id_produs: Number(newRow.produs_id), cantitate: Number(newRow.cantitate) } : p) };
              }));
            } else if (event === 'DELETE') {
              setComenzi(prev => prev.map(c => c.id === comandaId ? { ...c, produse: c.produse.filter(p => p.id !== Number(oldRow.id) ) } : c));
            }
            break;
          }
          default:
            break;
        }
      } catch (e) {
        // swallow per-payload errors
        console.error('Realtime payload handling error', e);
      }
    };

    for (const t of tables) {
      try {
        const ch = (supabase as any).channel(`realtime:${t}`).on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload: any) => handlePayload(t, payload)).subscribe();
        channels.push(ch);
      } catch (e) {
        console.error('Failed to subscribe to table', t, e);
      }
    }

    return () => {
      for (const ch of channels) {
        try {
          if (ch && typeof ch.unsubscribe === 'function') ch.unsubscribe();
        } catch (e) {
          try { (supabase as any).removeChannel(ch); } catch (_) {}
        }
      }
    };
  }, [supabase]);

  // Doctor CRUD
  const addDoctor = (doctorData: Omit<Doctor, 'id' | 'pacienti'>) => {
    // If Supabase client is configured, persist to Supabase first
    if (supabase) {
      (async () => {
  const { data, error } = await supabase.from('doctori').insert([{ nume: doctorData.nume, email: doctorData.email, telefon: doctorData.telefon }]).select().single();
        if (error) {
          console.error('Supabase addDoctor error:', error);
          toast.error('Eroare la salvarea doctorului în Supabase. Se folosește stocarea locală.');
          const newDoctor: Doctor = { ...doctorData, id: Date.now(), pacienti: [] };
          setDoctori(prev => [...prev, newDoctor]);
        } else if (data) {
          // Supabase returns the inserted row as an object when using .single()
          const row: any = data;
          const newDoctor: Doctor = { nume: row.nume, email: row.email, telefon: row.telefon, id: row.id ?? Date.now(), pacienti: [] };
          setDoctori(prev => [...prev, newDoctor]);
          toast.success(`Doctorul ${newDoctor.nume} a fost adăugat (Supabase).`);
        } else {
          const newDoctor: Doctor = { ...doctorData, id: Date.now(), pacienti: [] };
          setDoctori(prev => [...prev, newDoctor]);
          toast.success(`Doctorul ${newDoctor.nume} a fost adăugat.`);
        }
      })();
    } else {
      const newDoctor: Doctor = { ...doctorData, id: Date.now(), pacienti: [] };
      setDoctori(prev => [...prev, newDoctor]);
      toast.success(`Doctorul ${newDoctor.nume} a fost adăugat.`);
    }
  };

  const updateDoctor = (updatedDoctor: Doctor) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('doctori').update({ nume: updatedDoctor.nume, email: updatedDoctor.email, telefon: updatedDoctor.telefon }).eq('id', updatedDoctor.id);
        if (error) {
          console.error('Supabase updateDoctor error:', error);
          toast.error('Eroare la actualizarea în Supabase. Se folosește actualizarea locală.');
        }
        setDoctori(prev => prev.map(d => d.id === updatedDoctor.id ? updatedDoctor : d));
        toast.success(`Datele doctorului ${updatedDoctor.nume} au fost actualizate.`);
      })();
    } else {
      setDoctori(prev => prev.map(d => d.id === updatedDoctor.id ? updatedDoctor : d));
      toast.success(`Datele doctorului ${updatedDoctor.nume} au fost actualizate.`);
    }
  };

  const deleteDoctor = (doctorId: number) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('doctori').delete().eq('id', doctorId);
        if (error) {
          console.error('Supabase deleteDoctor error:', error);
          toast.error('Eroare la ștergerea în Supabase. Se folosește ștergerea locală.');
        }
        setDoctori(prev => prev.filter(d => d.id !== doctorId));
        setComenzi(prev => prev.filter(c => c.id_doctor !== doctorId));
        setPacienti(prev => prev.filter(p => p.id_doctor !== doctorId));
        toast.success('Doctorul și datele asociate au fost șterse.');
      })();
    } else {
      setDoctori(prev => prev.filter(d => d.id !== doctorId));
      setComenzi(prev => prev.filter(c => c.id_doctor !== doctorId));
      setPacienti(prev => prev.filter(p => p.id_doctor !== doctorId));
      toast.success('Doctorul și datele asociate au fost șterse.');
    }
  };

  // Produs CRUD
  const addProdus = (produsData: Omit<Produs, 'id'>) => {
    if (supabase) {
      (async () => {
  const { data, error } = await supabase.from('produse').insert([{ nume: produsData.nume, pret: produsData.pret }]).select().single();
        if (error) {
          console.error('Supabase addProdus error:', error);
          const newProdus: Produs = { ...produsData, id: Date.now() };
          setProduse(prev => [...prev, newProdus]);
          toast.error('Eroare la salvarea produsului în Supabase. Se folosește stocarea locală.');
        } else if (data) {
          const row: any = data;
          const newProdus: Produs = { id: row.id ?? Date.now(), nume: row.nume, pret: Number(row.pret) };
          setProduse(prev => [...prev, newProdus]);
          toast.success(`Produsul ${newProdus.nume} a fost adăugat (Supabase).`);
        }
      })();
    } else {
      const newProdus: Produs = { ...produsData, id: Date.now() };
      setProduse(prev => [...prev, newProdus]);
      toast.success(`Produsul ${newProdus.nume} a fost adăugat.`);
    }
  };

  const updateProdus = (updatedProdus: Produs) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('produse').update({ nume: updatedProdus.nume, pret: updatedProdus.pret }).eq('id', updatedProdus.id);
        if (error) {
          console.error('Supabase updateProdus error:', error);
          toast.error('Eroare la actualizarea produsului în Supabase. Se folosește actualizarea locală.');
        }
        setProduse(prev => prev.map(p => p.id === updatedProdus.id ? updatedProdus : p));
        toast.success(`Produsul ${updatedProdus.nume} a fost actualizat.`);
      })();
    } else {
      setProduse(prev => prev.map(p => p.id === updatedProdus.id ? updatedProdus : p));
      toast.success(`Produsul ${updatedProdus.nume} a fost actualizat.`);
    }
  };

  const deleteProdus = (produsId: number) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('produse').delete().eq('id', produsId);
        if (error) {
          console.error('Supabase deleteProdus error:', error);
          toast.error('Eroare la ștergerea produsului în Supabase. Se folosește ștergerea locală.');
        }
        setProduse(prev => prev.filter(p => p.id !== produsId));
        toast.success('Produsul a fost șters.');
      })();
    } else {
      setProduse(prev => prev.filter(p => p.id !== produsId));
      toast.success('Produsul a fost șters.');
    }
  };

  // Tehnician CRUD
  const addTehnician = (tehnicianData: Omit<Tehnician, 'id'>) => {
    if (supabase) {
      (async () => {
  const { data, error } = await supabase.from('tehnicieni').insert([{ nume: tehnicianData.nume }]).select().single();
        if (error) {
          console.error('Supabase addTehnician error:', error);
          const newTehnician: Tehnician = { ...tehnicianData, id: Date.now() };
          setTehnicieni(prev => [...prev, newTehnician]);
          toast.error('Eroare la salvarea tehnicianului în Supabase. Se folosește stocarea locală.');
        } else if (data) {
          const row: any = data;
          const newTehnician: Tehnician = { id: row.id ?? Date.now(), nume: row.nume };
          setTehnicieni(prev => [...prev, newTehnician]);
          toast.success(`Tehnicianul ${newTehnician.nume} a fost adăugat (Supabase).`);
        }
      })();
    } else {
      const newTehnician: Tehnician = { ...tehnicianData, id: Date.now() };
      setTehnicieni(prev => [...prev, newTehnician]);
      toast.success(`Tehnicianul ${newTehnician.nume} a fost adăugat.`);
    }
  };

  const deleteTehnician = (tehnicianId: number) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('tehnicieni').delete().eq('id', tehnicianId);
        if (error) {
          console.error('Supabase deleteTehnician error:', error);
          toast.error('Eroare la ștergerea tehnicianului în Supabase. Se folosește ștergerea locală.');
        }
        setTehnicieni(prev => prev.filter(t => t.id !== tehnicianId));
        toast.success('Tehnicianul a fost șters.');
      })();
    } else {
      setTehnicieni(prev => prev.filter(t => t.id !== tehnicianId));
      toast.success('Tehnicianul a fost șters.');
    }
  };

  // Comanda CRUD
  const addComanda = (comandaData: any) => {
    let finalDoctorId = comandaData.id_doctor;
    let finalPacientId = comandaData.id_pacient;
    let newDoctor: Doctor | undefined = undefined;
    let newPacient: Pacient | undefined = undefined;

    // Defer creating local doctor/pacient until we've attempted to persist to Supabase.
    if (!supabase) {
      // If Supabase not configured, create local placeholders immediately
      if (comandaData.isNewDoctor) {
        newDoctor = { id: Date.now(), nume: comandaData.id_doctor, email: '', telefon: '', pacienti: [] };
        setDoctori(prev => [...prev, newDoctor!]);
        finalDoctorId = newDoctor.id;
      }

      if (comandaData.isNewPacient) {
        newPacient = { id: Date.now(), nume: comandaData.id_pacient, id_doctor: finalDoctorId };
        setPacienti(prev => [...prev, newPacient!]);
        setDoctori(prev => prev.map(d => d.id === finalDoctorId ? { ...d, pacienti: [...d.pacienti, newPacient!] } : d));
        finalPacientId = newPacient.id;
      }
    }
    
    const subtotal = comandaData.produse.reduce((acc: number, p: any) => {
        const produsInfo = produse.find(pr => pr.id === p.id_produs);
        return acc + (produsInfo?.pret || 0) * p.cantitate;
    }, 0);
    const total = subtotal - (comandaData.reducere || 0);

    // Try to persist to Supabase if available, otherwise fallback to local state.
    if (supabase) {
      (async () => {
        try {
          // If a new doctor was requested, insert it first into Supabase
          if (comandaData.isNewDoctor) {
             const payloadDoc = { nume: comandaData.id_doctor, email: '', telefon: '' };
             console.debug('Inserting doctor payload:', payloadDoc);
           const { data: docRows, error: docError } = await supabase!.from('doctori').insert([payloadDoc]).select().single();
             console.debug('Inserted doctor response:', { docRows, docError });
            if (docError) throw docError;
            const insertedDoc: any = docRows ? docRows : null;
            if (insertedDoc) {
              newDoctor = { id: insertedDoc.id ?? Date.now(), nume: insertedDoc.nume, email: insertedDoc.email ?? '', telefon: insertedDoc.telefon ?? '', pacienti: [] };
              finalDoctorId = Number(insertedDoc.id ?? finalDoctorId);
              setDoctori(prev => [...prev, newDoctor!]);
              toast.success(`Doctor inserat în DB: id=${finalDoctorId}, nume=${newDoctor.nume}`);
            }
          }

          // If a new pacient was requested, insert it next (needs finalDoctorId)
          if (comandaData.isNewPacient) {
             const payloadPac = { nume: comandaData.id_pacient, id_doctor: finalDoctorId ? Number(finalDoctorId) : null };
             console.debug('Inserting pacient payload:', payloadPac);
             const { data: pacRows, error: pacError } = await supabase!.from('pacienti').insert([payloadPac]).select().single();
             console.debug('Inserted pacient response:', { pacRows, pacError });
            if (pacError) throw pacError;
            const insertedPac: any = pacRows ? pacRows : null;
            if (insertedPac) {
              newPacient = { id: insertedPac.id ?? Date.now(), nume: insertedPac.nume, id_doctor: insertedPac.id_doctor } as Pacient;
              finalPacientId = Number(insertedPac.id ?? finalPacientId);
              setPacienti(prev => [...prev, newPacient!]);
              // attach pacient to doctor locally if present
              setDoctori(prev => prev.map(d => d.id === finalDoctorId ? { ...d, pacienti: [...d.pacienti, newPacient!] } : d));
              toast.success(`Pacient inserat în DB: id=${finalPacientId}, nume=${newPacient.nume}`);
            }
          }

          // Insert comanda
          const { data: comandaRows, error: comandaError } = await supabase!.from('comenzi').insert([{ id_doctor: finalDoctorId, id_pacient: finalPacientId, data_start: comandaData.data_start, termen_limita: comandaData.termen_limita, reducere: comandaData.reducere || 0, total, status: new Date(comandaData.termen_limita) < new Date() ? 'Întârziată' : 'În progres' }]).select().single();
          if (comandaError) throw comandaError;
          const insertedComanda: any = comandaRows ? comandaRows : null;
          const comandaId = Number(insertedComanda?.id ?? Date.now());

          // Insert products into comanda_produse and await all inserts so we can detect errors
          const cpPromises = comandaData.produse.map(async (p: any) => {
             const payloadCP = { comanda_id: Number(comandaId), produs_id: Number(p.id_produs), cantitate: p.cantitate };
             console.debug('Inserting comanda_produse payload:', payloadCP);
             const { data: cpData, error: cpError } = await supabase!.from('comanda_produse').insert([payloadCP]).select().single();
            if (cpError) {
              console.error('Supabase comanda_produse insert error:', cpError);
              return { success: false, error: cpError };
            }
            return { success: true, data: cpData };
          });
          const cpResults = await Promise.all(cpPromises);
          const cpFailures = cpResults.filter(r => !r.success);
          if (cpFailures.length > 0) {
            console.warn(`${cpFailures.length} inserții comanda_produse au eșuat`, cpFailures);
            toast.error('Unele produse nu au fost salvate în baza de date. Verifică consola pentru detalii.');
          } else {
            toast.success('Produsele comenzii au fost salvate în baza de date.');
          }

          // Update local state with Supabase data
          const newComanda: Comanda = {
            ...comandaData,
            id: comandaId,
            id_doctor: finalDoctorId,
            id_pacient: finalPacientId,
            total,
            status: new Date(comandaData.termen_limita) < new Date() ? 'Întârziată' : 'În progres',
          };
          setComenzi(prev => (prev.some(c => c.id === newComanda.id) ? prev : [...prev, newComanda]));
          toast.success(`Comanda inserată în DB: id=${comandaId}`);
        } catch (err) {
          console.error('Supabase addComanda error:', err);
          // fallback to local: if newDoctor/newPacient weren't created locally yet, create them now
          if (comandaData.isNewDoctor && !newDoctor) {
            newDoctor = { id: Date.now(), nume: comandaData.id_doctor, email: '', telefon: '', pacienti: [] };
            setDoctori(prev => [...prev, newDoctor!]);
            finalDoctorId = newDoctor.id;
          }
          if (comandaData.isNewPacient && !newPacient) {
            newPacient = { id: Date.now(), nume: comandaData.id_pacient, id_doctor: finalDoctorId } as Pacient;
            setPacienti(prev => [...prev, newPacient!]);
            setDoctori(prev => prev.map(d => d.id === finalDoctorId ? { ...d, pacienti: [...d.pacienti, newPacient!] } : d));
            finalPacientId = newPacient.id;
          }
          const newComanda: Comanda = {
            ...comandaData,
            id: Date.now(),
            id_doctor: finalDoctorId,
            id_pacient: finalPacientId,
            total,
            status: new Date(comandaData.termen_limita) < new Date() ? 'Întârziată' : 'În progres',
          };
          setComenzi(prev => (prev.some(c => c.id === newComanda.id) ? prev : [...prev, newComanda]));
          toast.error('Eroare la salvarea comenzii în Supabase. Se folosește stocarea locală.');
        }
      })();
    } else {
      const newComanda: Comanda = {
        ...comandaData,
        id: Date.now(),
        id_doctor: finalDoctorId,
        id_pacient: finalPacientId,
        total,
        status: new Date(comandaData.termen_limita) < new Date() ? 'Întârziată' : 'În progres',
      };
  setComenzi(prev => (prev.some(c => c.id === newComanda.id) ? prev : [...prev, newComanda]));
      toast.success('Comanda a fost adăugată cu succes.');
    }
    return { newDoctor, newPacient };
  };

  const updateComanda = (updatedComanda: Comanda) => {
   const subtotal = updatedComanda.produse.reduce((acc: number, p: { id_produs: number; cantitate: number }) => {
     const produsInfo = produse.find(pr => pr.id === p.id_produs);
     return acc + (produsInfo?.pret || 0) * p.cantitate;
   }, 0);
    const total = subtotal - (updatedComanda.reducere || 0);

    const finalComanda = { ...updatedComanda, total };

    if (supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('comenzi').update({ id_doctor: finalComanda.id_doctor, id_pacient: finalComanda.id_pacient, data_start: finalComanda.data_start, termen_limita: finalComanda.termen_limita, reducere: finalComanda.reducere, total }).eq('id', finalComanda.id);
          if (error) throw error;
          // Replace comanda_produse: delete existing then insert new
          await supabase.from('comanda_produse').delete().eq('comanda_id', finalComanda.id);
          for (const p of finalComanda.produse) {
            await supabase.from('comanda_produse').insert([{ comanda_id: finalComanda.id, produs_id: p.id_produs, cantitate: p.cantitate }]);
          }
        } catch (err) {
          console.error('Supabase updateComanda error:', err);
          toast.error('Eroare la actualizarea comenzii în Supabase. Se folosește actualizarea locală.');
        }
        setComenzi(prev => prev.map(c => c.id === finalComanda.id ? finalComanda : c));
        toast.success(`Comanda ${finalComanda.id} a fost actualizată.`);
      })();
    } else {
      setComenzi(prev => prev.map(c => c.id === finalComanda.id ? finalComanda : c));
      toast.success(`Comanda ${finalComanda.id} a fost actualizată.`);
    }
  };

  const updateComandaTehnician = (comandaId: number, tehnician: string) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('comenzi').update({ tehnician }).eq('id', comandaId);
        if (error) {
          console.error('Supabase updateComandaTehnician error:', error);
          toast.error('Eroare la actualizarea tehnicianului în Supabase. Se folosește actualizarea locală.');
        }
        setComenzi(prev => prev.map(c => c.id === comandaId ? { ...c, tehnician } : c));
        toast.success(`Tehnicianul comenzii a fost actualizat.`);
      })();
    } else {
      setComenzi(prev => prev.map(c => c.id === comandaId ? { ...c, tehnician } : c));
      toast.success(`Tehnicianul comenzii a fost actualizat.`);
    }
  };

  const deleteComanda = (comandaId: number) => {
    if (supabase) {
      (async () => {
        const { error } = await supabase.from('comenzi').delete().eq('id', comandaId);
        if (error) {
          console.error('Supabase deleteComanda error:', error);
          toast.error('Eroare la ștergerea comenzii în Supabase. Se folosește ștergerea locală.');
        }
        setComenzi(prev => prev.filter(c => c.id !== comandaId));
        toast.success('Comanda a fost ștearsă.');
      })();
    } else {
      setComenzi(prev => prev.filter(c => c.id !== comandaId));
      toast.success('Comanda a fost ștearsă.');
    }
  };

  const finalizeComanda = (comandaId: number, tehnician: string) => {
    if (supabase) {
      (async () => {
        const now = new Date().toISOString();
        const { error } = await supabase.from('comenzi').update({ status: 'Finalizată', data_finalizare: now, tehnician }).eq('id', comandaId);
        if (error) {
          console.error('Supabase finalizeComanda error:', error);
          toast.error('Eroare la marcarea comenzii ca finalizată în Supabase. Se folosește actualizarea locală.');
        }
        setComenzi(prev => prev.map(c => c.id === comandaId ? { ...c, status: 'Finalizată', data_finalizare: now, tehnician } : c));
        toast.success(`Comanda a fost marcată ca finalizată.`);
      })();
    } else {
      setComenzi(prev => prev.map(c => c.id === comandaId ? { ...c, status: 'Finalizată', data_finalizare: new Date().toISOString(), tehnician } : c));
      toast.success(`Comanda a fost marcată ca finalizată.`);
    }
  };

  const reopenComanda = (comandaId: number) => {
    if (supabase) {
      (async () => {
        const found = comenzi.find(c => c.id === comandaId);
        if (!found) return;
        const newStatus = new Date(found.termen_limita) < new Date() ? 'Întârziată' : 'În progres';
        const { error } = await supabase.from('comenzi').update({ status: newStatus, data_finalizare: null, tehnician: null }).eq('id', comandaId);
        if (error) {
          console.error('Supabase reopenComanda error:', error);
          toast.error('Eroare la redeschiderea comenzii în Supabase. Se folosește actualizarea locală.');
        }
        setComenzi(prev => prev.map(c => {
            if (c.id === comandaId) {
                return { ...c, status: newStatus, data_finalizare: undefined, tehnician: undefined };
            }
            return c;
        }));
        toast.success('Comanda a fost redeschisă.');
      })();
    } else {
      setComenzi(prev => prev.map(c => {
        if (c.id === comandaId) {
            const newStatus = new Date(c.termen_limita) < new Date() ? 'Întârziată' : 'În progres';
            return { ...c, status: newStatus, data_finalizare: undefined, tehnician: undefined };
        }
        return c;
      }));
      toast.success('Comanda a fost redeschisă.');
    }
  };

  const value = {
      doctori,
      comenzi,
      produse,
    pacienti,
      tehnicieni,
      addDoctor,
      updateDoctor,
      deleteDoctor,
      addProdus,
      updateProdus,
      deleteProdus,
      addTehnician,
      deleteTehnician,
      addComanda,
      updateComanda,
      updateComandaTehnician,
      deleteComanda,
      finalizeComanda,
      reopenComanda,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
