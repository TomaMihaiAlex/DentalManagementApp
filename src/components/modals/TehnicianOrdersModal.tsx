import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Comanda, Doctor } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tehnicianName: string | null;
  orders: Comanda[];
  doctori: Doctor[];
  onOpenComanda?: (comanda: Comanda) => void;
}

const TehnicianOrdersModal: React.FC<Props> = ({ isOpen, onClose, tehnicianName, orders, doctori, onOpenComanda }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-50">
                  {`Comenzi finalizate — ${tehnicianName || ''}`}
                </Dialog.Title>

                <div className="mt-4">
                  {orders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nicio comanda finalizată pentru acest tehnician.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-2">ID</th>
                            <th className="px-4 py-2">Pacient</th>
                            <th className="px-4 py-2">Data finalizare</th>
                            <th className="px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => {
                            // try to resolve pacient name from doctori
                            const doc = doctori.find(d => d.id === o.id_doctor);
                            const pacient = doc?.pacienti.find(p => p.id === o.id_pacient);
                            const pacientName = pacient ? pacient.nume : `#${o.id_pacient}`;
                            return (
                              <tr key={o.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{o.id}</td>
                                <td className="px-4 py-2">{pacientName}</td>
                                <td className="px-4 py-2">{o.data_finalizare ? format(new Date(o.data_finalizare), 'dd LLL yyyy') : '-'}</td>
                                <td className="px-4 py-2 text-right font-semibold">{formatCurrency(o.total)}</td>
                                <td className="px-4 py-2 text-right">
                                  {onOpenComanda && <Button size="sm" variant="outline" onClick={() => onOpenComanda(o)}>Deschide comanda</Button>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TehnicianOrdersModal;
