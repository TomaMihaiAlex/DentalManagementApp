import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { DatePicker } from '../ui/DatePicker';
import { Comanda, ComandaProdus } from '@/lib/types';
import { useData } from '@/context/DataContext';
import { X, PlusCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comanda: any) => void;
  comanda: Comanda | null;
}

const ComandaModal: React.FC<ComandaModalProps> = ({ isOpen, onClose, onSave, comanda }) => {
  const { doctori, pacienti, produse: allProduse, tehnicieni, updateComandaTehnician } = useData();

  const [doctorInput, setDoctorInput] = useState('');
  const [pacientInput, setPacientInput] = useState('');
  // selectedDoctorId: number | 'new' | null
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | 'new' | null>(null);
  // selectedPacientId not used currently (we use pacientInput for new patients)
  
  // Local product type allows empty string for cantitate while editing
  type LocalComandaProdus = Omit<ComandaProdus, 'cantitate'> & { cantitate: number | string };
  const [selectedProduse, setSelectedProduse] = useState<LocalComandaProdus[]>([]);
  const [dataStart, setDataStart] = useState<Date | undefined>();
  const [termenLimita, setTermenLimita] = useState<Date | undefined>();
  const [reducere, setReducere] = useState<number | string>(0);
  const [selectedTehnician, setSelectedTehnician] = useState('');

  const isFinalized = useMemo(() => comanda?.status === 'Finalizată', [comanda]);

  const pacientiList = useMemo(() => {
    if (typeof selectedDoctorId !== 'number') return [];
    return pacienti.filter(p => p.id_doctor === selectedDoctorId);
  }, [selectedDoctorId, pacienti]);

  const [doctorSearch, setDoctorSearch] = useState('');
  const [pacientSearch, setPacientSearch] = useState('');
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);
  const [showPacientSuggestions, setShowPacientSuggestions] = useState(false);

  const filteredDoctorOptions = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return doctori;
    return doctori.filter(d => d.nume.toLowerCase().includes(q));
  }, [doctorSearch, doctori]);

  const filteredPacientOptions = useMemo(() => {
    const q = pacientSearch.trim().toLowerCase();
    if (!q) return pacientiList;
    return pacientiList.filter(p => p.nume.toLowerCase().includes(q));
  }, [pacientSearch, pacientiList]);

  // suggestion/typeahead removed: using native selects for Android compatibility

  useEffect(() => {
    if (isOpen) {
        if (comanda) {
            const doc = doctori.find(d => d.id === comanda.id_doctor);
            const pac = doc?.pacienti.find(p => p.id === comanda.id_pacient);
      setDoctorInput(doc?.nume || '');
      setSelectedDoctorId(doc?.id || null);
            setPacientInput(pac?.nume || '');
            // map produse to local type (cantitate may be string in UI)
            setSelectedProduse(comanda.produse.map(p => ({ ...p, cantitate: p.cantitate })));
            setDataStart(new Date(comanda.data_start));
            setTermenLimita(new Date(comanda.termen_limita));
            setReducere(comanda.reducere || 0);
            setSelectedTehnician(comanda.tehnician || '');
        } else {
      // Reset all fields for creating a new comanda
      setDoctorInput('');
      setDoctorSearch('');
      setPacientInput('');
      setPacientSearch('');
      setSelectedDoctorId(null);
      setShowDoctorSuggestions(false);
      setShowPacientSuggestions(false);
      setSelectedProduse([]);
      setDataStart(new Date());
      setTermenLimita(undefined);
      setReducere(0);
      setSelectedTehnician('');
        }
    }
  }, [comanda, isOpen, doctori]);

  const total = useMemo(() => {
    const subtotal = selectedProduse.reduce((acc, p) => {
      const produsInfo = allProduse.find(pr => pr.id === p.id_produs);
      const cant = Number(p.cantitate) || 0;
      return acc + (produsInfo?.pret || 0) * cant;
    }, 0);
    return subtotal - (Number(reducere) || 0);
  }, [selectedProduse, reducere, allProduse]);

  const handleAddProdus = () => {
    setSelectedProduse([...selectedProduse, { id_produs: allProduse[0]?.id || 0, cantitate: '' }]);
  };

  const handleRemoveProdus = (index: number) => {
    setSelectedProduse(selectedProduse.filter((_, i) => i !== index));
  };

  const handleProdusChange = (index: number, newProdusId: number) => {
    const updated = [...selectedProduse];
    updated[index].id_produs = newProdusId;
    setSelectedProduse(updated);
  };
  
  const handleCantitateChange = (index: number, newCantitate: number | string) => {
    const updated = [...selectedProduse];
    updated[index].cantitate = newCantitate;
    setSelectedProduse(updated);
  };

  const handleSave = () => {
    if (isFinalized) {
        if (comanda && selectedTehnician !== comanda.tehnician) {
            updateComandaTehnician(comanda.id, selectedTehnician);
        }
        onClose();
        return;
    }

    // Determine doctor id / new status based on selectedDoctorId or typed doctorInput
    let id_doctor: number | string | undefined = undefined;
    let isNewDoctor = false;
    if (selectedDoctorId === 'new') {
      if (doctorInput && doctorInput.trim().length > 0) {
        isNewDoctor = true;
        id_doctor = doctorInput.trim();
      }
    } else if (typeof selectedDoctorId === 'number') {
      id_doctor = selectedDoctorId;
    } else if (doctorInput && doctorInput.trim().length > 0) {
      const existingDoctor = doctori.find(d => d.nume.toLowerCase() === doctorInput.toLowerCase());
      if (existingDoctor) id_doctor = existingDoctor.id;
      else {
        isNewDoctor = true;
        id_doctor = doctorInput.trim();
      }
    }

    // Determine pacient id / new status
    let id_pacient: number | string | undefined = undefined;
    let isNewPacient = false;
    // If doctor is an existing id, search its pacienti for matching name
    if (typeof id_doctor === 'number') {
      const patient = pacientiList.find(p => p.nume.toLowerCase() === pacientInput.toLowerCase());
      if (patient) id_pacient = patient.id;
      else if (pacientInput && pacientInput.trim().length > 0) {
        isNewPacient = true;
        id_pacient = pacientInput.trim();
      }
    } else {
      // doctor is new or not selected: treat pacientInput as new pacient name if provided
      if (pacientInput && pacientInput.trim().length > 0) {
        isNewPacient = true;
        id_pacient = pacientInput.trim();
      }
    }

  if (!id_doctor || !id_pacient || !dataStart || !termenLimita || selectedProduse.length === 0) {
        toast.error("Vă rugăm completați toate câmpurile obligatorii: Doctor, Pacient, Produse, și datele limită.");
        return;
    }

    const comandaData = {
      ...comanda,
      id_doctor,
      id_pacient,
      isNewDoctor,
      isNewPacient,
      produse: selectedProduse,
      data_start: dataStart.toISOString(),
      termen_limita: termenLimita.toISOString(),
      reducere: Number(reducere) || 0,
    };
    onSave(comandaData);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/30" /></Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50 flex justify-between items-center">
                  <span>{comanda ? (isFinalized ? 'Vizualizare / Modificare Tehnician' : 'Editează Comanda') : 'Adaugă Comanda'}</span>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                </Dialog.Title>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Label htmlFor="doctor-select">Doctor (alege sau adaugă nou)</Label>
            {/* Integrated combobox: input + dropdown list (touch-friendly) */}
            <div>
              <Input
                id="doctor-combobox"
                placeholder="Alege sau tastează doctor..."
                value={doctorSearch || doctorInput}
                onChange={e => {
                  const val = e.target.value;
                  setDoctorSearch(val);
                  setDoctorInput(val);
                  setShowDoctorSuggestions(true);
                  const trimmed = val.trim().toLowerCase();
                  // if the typed value exactly matches an existing doctor, auto-select them
                  const exactMatch = doctori.find(d => d.nume.toLowerCase() === trimmed);
                  if (exactMatch) {
                    setSelectedDoctorId(exactMatch.id);
                    setPacientInput('');
                    setPacientSearch('');
                    setShowDoctorSuggestions(false);
                  } else {
                    // if there's exactly one filtered option and the user typed at least 2 chars,
                    // auto-select it so pacient list updates while typing (good for tablets/phones)
                    const options = doctori.filter(d => d.nume.toLowerCase().includes(trimmed));
                    if (trimmed.length >= 2 && options.length === 1) {
                      setSelectedDoctorId(options[0].id);
                      setPacientInput('');
                      setPacientSearch('');
                    } else {
                      if (typeof selectedDoctorId === 'number') setSelectedDoctorId(null);
                    }
                  }
                }}
                onFocus={() => setShowDoctorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDoctorSuggestions(false), 150)}
                autoComplete="off"
                name="doctor-combobox"
                autoCorrect="off"
                spellCheck={false}
                disabled={isFinalized}
              />
              {showDoctorSuggestions && (
                <ul style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }} className="absolute left-0 right-0 z-50 w-full bg-white dark:bg-gray-900 border rounded mt-1 max-h-56 md:max-h-64 overflow-auto text-gray-900 dark:text-white shadow">
                  {filteredDoctorOptions.map(d => (
                    <li key={d.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white" onClick={() => { setDoctorInput(d.nume); setDoctorSearch(''); setSelectedDoctorId(d.id); setShowDoctorSuggestions(false); setPacientInput(''); }}>{d.nume}</li>
                  ))}
                  <li className="p-2 border-t text-sm text-gray-600 dark:text-gray-400">Scrie un nume nou pentru a crea doctor</li>
                </ul>
              )}
              {/* Hidden select kept for form semantics & Android fallback when needed */}
              <select id="doctor-select" value={selectedDoctorId ?? ''} onChange={e => {
                const val = e.target.value;
                if (val === '__new') {
                  setSelectedDoctorId('new');
                  setDoctorInput('');
                } else {
                  const id = Number(val);
                  setSelectedDoctorId(id);
                  const doc = doctori.find(d => d.id === id);
                  setDoctorInput(doc?.nume || '');
                  setPacientInput('');
                }
              }} disabled={isFinalized} className="hidden">
                <option value="">-- Alege Doctor --</option>
                {filteredDoctorOptions.map(d => <option key={d.id} value={d.id}>{d.nume}</option>)}
                <option value="__new">Adaugă nou...</option>
              </select>
            </div>
          </div>
           <div>
            <Label htmlFor="pacient-select">Pacient (alege sau adaugă nou)</Label>
            {/* Pacient combobox (depends on selected doctor) */}
            <div className="relative">
              <Input
                id="pacient-combobox"
                placeholder={(selectedDoctorId || doctorInput.trim() !== '') ? 'Alege sau tastează pacient...' : 'Selectează mai întâi un doctor'}
                value={pacientSearch || pacientInput}
                onChange={e => {
                  const val = e.target.value;
                  setPacientSearch(val);
                  setPacientInput(val);
                  setShowPacientSuggestions(true);
                  const trimmed = val.trim().toLowerCase();
                  // exact match -> select immediately
                  const exact = pacientiList.find(p => p.nume.toLowerCase() === trimmed);
                  if (exact) {
                    setPacientInput(exact.nume);
                    setPacientSearch('');
                    setShowPacientSuggestions(false);
                  } else {
                    const options = pacientiList.filter(p => p.nume.toLowerCase().includes(trimmed));
                    if (trimmed.length >= 2 && options.length === 1) {
                      setPacientInput(options[0].nume);
                      setPacientSearch('');
                      setShowPacientSuggestions(false);
                    }
                  }
                }}
                onFocus={() => setShowPacientSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPacientSuggestions(false), 150)}
                autoComplete="off"
                name="pacient-combobox"
                autoCorrect="off"
                spellCheck={false}
                disabled={isFinalized || (!selectedDoctorId && doctorInput.trim() === '')}
              />
              {showPacientSuggestions && (
                <ul style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }} className="absolute left-0 right-0 z-50 w-full bg-white dark:bg-gray-900 border rounded mt-1 max-h-56 md:max-h-64 overflow-auto text-gray-900 dark:text-white shadow">
                  {filteredPacientOptions.length > 0 ? filteredPacientOptions.map(p => (
                    <li key={p.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white" onClick={() => { setPacientInput(p.nume); setPacientSearch(''); setShowPacientSuggestions(false); }}>{p.nume}</li>
                  )) : (
                    <li className="p-2 text-sm text-gray-600 dark:text-gray-400">Niciun pacient găsit pentru acest doctor</li>
                  )}
                  <li className="p-2 border-t text-sm text-gray-600 dark:text-gray-400">Scrie un nume nou pentru a crea pacient</li>
                </ul>
              )}
              <select id="pacient-select" value={pacientInput} onChange={e => { const val = e.target.value; if (val === '__new') setPacientInput(''); else setPacientInput(val); }} disabled className="hidden">
                <option value="">-- Alege Pacient --</option>
                {filteredPacientOptions.map(p => <option key={p.id} value={p.nume}>{p.nume}</option>)}
                <option value="__new">Adaugă nou...</option>
              </select>
            </div>
          </div>
                </div>

                <div className="mt-4">
                    <Label>Produse</Label>
          <div className="space-y-2 rounded-md border dark:border-gray-600 p-2">
                        {selectedProduse.map((p, index) => (
                            <div key={index} className="flex items-center gap-2">
                <select value={p.id_produs} onChange={e => handleProdusChange(index, Number(e.target.value))} className="flex-grow p-2 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white" disabled={isFinalized}>
                  {allProduse.map(prod => <option key={prod.id} value={prod.id}>{prod.nume}</option>)}
                </select>
        <Input type="number" value={p.cantitate as any} onChange={e => handleCantitateChange(index, e.target.value)} className="w-20" min="0" disabled={isFinalized} />
                                {!isFinalized && <Button variant="ghost" size="icon" onClick={() => handleRemoveProdus(index)}><Trash2 className="w-4 h-4 text-danger"/></Button>}
                            </div>
                        ))}
                        {!isFinalized && <Button variant="outline" size="sm" onClick={handleAddProdus} className="w-full dark:text-white"><PlusCircle className="w-4 h-4 mr-2"/>Adaugă Produs</Button>}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Data Start</Label><DatePicker date={dataStart} setDate={setDataStart} disabled={isFinalized} /></div>
                    <div><Label>Termen Limită</Label><DatePicker date={termenLimita} setDate={setTermenLimita} disabled={isFinalized} /></div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 items-end">
                    <div>
                        <Label htmlFor="reducere">Reducere (RON)</Label>
                        <Input 
                            id="reducere" 
                            type="number" 
                            value={reducere} 
                            onChange={e => setReducere(e.target.value)} 
                            onFocus={(e) => e.target.select()}
                            disabled={isFinalized} 
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-300">Total</p>
                        <p className="text-xl font-bold dark:text-white">{formatCurrency(total)}</p>
                    </div>
                </div>

                {isFinalized && (
                    <div className="mt-6 pt-4 border-t dark:border-gray-600">
                        <Label htmlFor="tehnician-select">Modifică Tehnician</Label>
                        <select id="tehnician-select" value={selectedTehnician} onChange={(e) => setSelectedTehnician(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                            <option value="">Niciunul</option>
                            {tehnicieni.map((t) => (
                                <option key={t.id} value={t.nume}>{t.nume}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="secondary" onClick={onClose}>Anulează</Button>
                  <Button onClick={handleSave}>{isFinalized ? 'Salvează Tehnician' : 'Salvează Comanda'}</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ComandaModal;
