import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { X } from 'lucide-react';

interface AddTehnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tehnician: { nume: string }) => void;
}

const AddTehnicianModal: React.FC<AddTehnicianModalProps> = ({ isOpen, onClose, onSave }) => {
  const [nume, setNume] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNume('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!nume) return;
    onSave({ nume });
    onClose();
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
                  <span>Adaugă Tehnician</span>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
                </Dialog.Title>
                <div className="mt-4">
                  <Label htmlFor="nume-tehnician">Nume Tehnician</Label>
                  <Input id="nume-tehnician" value={nume} onChange={(e) => setNume(e.target.value)} placeholder="ex: Alex Popescu" />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="secondary" onClick={onClose}>Anulează</Button>
                  <Button onClick={handleSave}>Salvează</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddTehnicianModal;
