import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { useData } from '@/context/DataContext';
import { X } from 'lucide-react';

interface FinalizeazaComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tehnician: string) => void;
}

const FinalizeazaComandaModal: React.FC<FinalizeazaComandaModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { tehnicieni } = useData();
  const [selectedTehnician, setSelectedTehnician] = useState('');

  useEffect(() => {
    if (isOpen && tehnicieni.length > 0) {
      setSelectedTehnician(tehnicieni[0].nume);
    } else if (isOpen) {
      setSelectedTehnician('');
    }
  }, [isOpen, tehnicieni]);

  const handleConfirm = () => {
    if (!selectedTehnician) return;
    onConfirm(selectedTehnician);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  <span>Finalizează Comanda</span>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                </Dialog.Title>
                <div className="mt-4">
                  <Label htmlFor="tehnician-select">Selectează Tehnician</Label>
                  <select id="tehnician-select" value={selectedTehnician} onChange={(e) => setSelectedTehnician(e.target.value)} className="w-full p-2 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {tehnicieni.map((t) => (
                      <option key={t.id} value={t.nume}>{t.nume}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="secondary" onClick={onClose}>Anulează</Button>
                  <Button onClick={handleConfirm}>Continuă</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default FinalizeazaComandaModal;
