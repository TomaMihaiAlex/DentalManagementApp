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
  const { doctori, produse: allProduse, tehnicieni, updateComandaTehnician } = useData();

  const [doctorInput, setDoctorInput] = useState('');
  const [pacientInput, setPacientInput] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  
  const [selectedProduse, setSelectedProduse] = useState<ComandaProdus[]>([]);
  const [dataStart, setDataStart] = useState<Date | undefined>();
  const [termenLimita, setTermenLimita] = useState<Date | undefined>();
  const [reducere, setReducere] = useState<number | string>(0);
  const [selectedTehnician, setSelectedTehnician] = useState('');

  const isFinalized = useMemo(() => comanda?.status === 'Finalizată', [comanda]);

  const pacientiList = useMemo(() => {
    if (!selectedDoctorId) return [];
    const doctor = doctori.find(d => d.id === selectedDoctorId);
    return doctor ? doctor.pacienti : [];
  }, [selectedDoctorId, doctori]);

  useEffect(() => {
    if (isOpen) {
        if (comanda) {
            const doc = doctori.find(d => d.id === comanda.id_doctor);
            const pac = doc?.pacienti.find(p => p.id === comanda.id_pacient);
            setDoctorInput(doc?.nume || '');
            setSelectedDoctorId(doc?.id || null);
            setPacientInput(pac?.nume || '');
            setSelectedProduse(comanda.produse);
            setDataStart(new Date(comanda.data_start));
            setTermenLimita(new Date(comanda.termen_limita));
            setReducere(comanda.reducere || 0);
            setSelectedTehnician(comanda.tehnician || '');
        } else {
            setDoctorInput('');
            setPacientInput('');
            setSelectedDoctorId(null);
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
      return acc + (produsInfo?.pret || 0) * p.cantitate;
    }, 0);
    return subtotal - (Number(reducere) || 0);
  }, [selectedProduse, reducere, allProduse]);

  const handleAddProdus = () => {
    setSelectedProduse([...selectedProduse, { id_produs: allProduse[0]?.id || 0, cantitate: 1 }]);
  };

  const handleRemoveProdus = (index: number) => {
    setSelectedProduse(selectedProduse.filter((_, i) => i !== index));
  };

  const handleProdusChange = (index: number, newProdusId: number) => {
    const updated = [...selectedProduse];
    updated[index].id_produs = newProdusId;
    setSelectedProduse(updated);
  };
  
  const handleCantitateChange = (index: number, newCantitate: number) => {
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

    const existingDoctor = doctori.find(d => d.nume.toLowerCase() === doctorInput.toLowerCase());
    let id_doctor = existingDoctor?.id;
    const isNewDoctor = !existingDoctor && doctorInput.length > 0;

    const existingPacient = existingDoctor?.pacienti.find(p => p.nume.toLowerCase() === pacientInput.toLowerCase());
    let id_pacient = existingPacient?.id;
    const isNewPacient = !existingPacient && pacientInput.length > 0;

    if (!id_doctor && isNewDoctor) id_doctor = doctorInput as any;
    if (!id_pacient && isNewPacient) id_pacient = pacientInput as any;

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
                    <div>
                        <Label htmlFor="doctor-input">Doctor (alege sau adaugă nou)</Label>
                        <Input id="doctor-input" list="doctori-list" value={doctorInput} onChange={e => { setDoctorInput(e.target.value); const doc = doctori.find(d => d.nume === e.target.value); setSelectedDoctorId(doc?.id || null); }} disabled={isFinalized} />
                        <datalist id="doctori-list">{doctori.map(d => <option key={d.id} value={d.nume} />)}</datalist>
                    </div>
                     <div>
                        <Label htmlFor="pacient-input">Pacient (alege sau adaugă nou)</Label>
                        <Input id="pacient-input" list="pacienti-list" value={pacientInput} onChange={e => setPacientInput(e.target.value)} disabled={!doctorInput || isFinalized}/>
                        <datalist id="pacienti-list">{pacientiList.map(p => <option key={p.id} value={p.nume} />)}</datalist>
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
                                <Input type="number" value={p.cantitate} onChange={e => handleCantitateChange(index, Number(e.target.value))} className="w-20" min="1" disabled={isFinalized} />
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
