import React, { Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '../ui/Button';
import { X, CheckCircle } from 'lucide-react';
import { Comanda } from '@/lib/types';
import { useData } from '@/context/DataContext';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ConfirmFinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: { comanda: Comanda, tehnician: string } | null;
  // when true, render modal in view-only mode (no Confirm/Cancel, only Close)
  viewOnly?: boolean;
}

const ConfirmFinalizeModal: React.FC<ConfirmFinalizeModalProps> = ({ isOpen, onClose, onConfirm, data, viewOnly }) => {
  const { doctori, produse: allProduse } = useData();

  const details = useMemo(() => {
    if (!data) return null;
    const { comanda, tehnician } = data;
    const doctor = doctori.find(d => d.id === comanda.id_doctor);
    const pacient = doctor?.pacienti.find(p => p.id === comanda.id_pacient);
    const total = comanda.produse.reduce((acc, p) => {
        const produsInfo = allProduse.find(pr => pr.id === p.id_produs);
        return acc + (produsInfo?.pret || 0) * p.cantitate;
    }, 0) - comanda.reducere;

    return {
        doctor: doctor?.nume || 'N/A',
        pacient: pacient?.nume || 'N/A',
        dataStart: formatDate(comanda.data_start),
        termenLimita: formatDate(comanda.termen_limita),
        produse: comanda.produse.map(p => ({
            ...allProduse.find(ap => ap.id === p.id_produs),
            cantitate: p.cantitate
        })),
        reducere: formatCurrency(comanda.reducere),
        total: formatCurrency(total),
        tehnician
    };
  }, [data, doctori, allProduse]);

  if (!details) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  <span>Confirmare Finalizare Comandă</span>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                </Dialog.Title>
                
                <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p>Vă rugăm verificați detaliile înainte de a marca comanda ca fiind finalizată.</p>
                    <div className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                        <div className="flex justify-between"><span>Doctor:</span><strong className="dark:text-white">{details.doctor}</strong></div>
                        <div className="flex justify-between"><span>Pacient:</span><strong className="dark:text-white">{details.pacient}</strong></div>
                        <hr className="dark:border-gray-600"/>
                        <div className="flex justify-between"><span>Data Start:</span><strong className="dark:text-white">{details.dataStart}</strong></div>
                        <div className="flex justify-between"><span>Termen Limită:</span><strong className="dark:text-white">{details.termenLimita}</strong></div>
                        <hr className="dark:border-gray-600"/>
                        <div>
                            <span>Produse:</span>
                            <ul className="list-disc list-inside ml-4">
                                {details.produse.map((p, i) => <li key={i}>{p.nume} x {p.cantitate}</li>)}
                            </ul>
                        </div>
                        <hr className="dark:border-gray-600"/>
                        <div className="flex justify-between"><span>Reducere:</span><strong className="dark:text-white">{details.reducere}</strong></div>
                        <div className="flex justify-between text-base"><strong>Total:</strong><strong className="dark:text-white">{details.total}</strong></div>
                        <hr className="dark:border-gray-600"/>
                        <div className="flex justify-between text-base bg-sky-100 dark:bg-sky-900/50 p-2 rounded-md"><strong>Tehnician Alocat:</strong><strong className="dark:text-sky-300">{details.tehnician}</strong></div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  {viewOnly ? (
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={onClose}>Anulează</Button>
                      <Button onClick={onConfirm} className="bg-success hover:bg-green-600">
                        <CheckCircle className="w-4 h-4 mr-2"/>
                        Confirmă Finalizarea
                      </Button>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmFinalizeModal;
