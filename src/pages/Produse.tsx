import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Produs } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import AddProductModal from '@/components/modals/AddProductModal';

const Produse: React.FC = () => {
  const { produse, addProdus, updateProdus, deleteProdus } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProdus, setSelectedProdus] = useState<Produs | null>(null);
  const [produsToDelete, setProdusToDelete] = useState<Produs | null>(null);

  const handleOpenAddModal = () => {
    setSelectedProdus(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (produs: Produs) => {
    setSelectedProdus(produs);
    setModalOpen(true);
  };

  const handleOpenDeleteModal = (produs: Produs) => {
    setProdusToDelete(produs);
    setDeleteModalOpen(true);
  };

  const handleSaveProdus = (produsData: any) => {
    if (produsData.id) {
      updateProdus(produsData);
    } else {
      addProdus(produsData);
    }
  };

  const handleDeleteConfirm = () => {
    if (produsToDelete) {
      deleteProdus(produsToDelete.id);
      setDeleteModalOpen(false);
      setProdusToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Management Produse</CardTitle>
          <Button onClick={handleOpenAddModal}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adaugă Produs
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile & Tablet Card View */}
          <div className="grid grid-cols-1 lg:hidden gap-4 p-4">
            {produse.map((produs) => (
              <Card key={produs.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-base">{produs.nume}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(produs.pret)}</p>
                </CardHeader>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(produs)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(produs)}>
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                    <th scope="col" className="px-6 py-3">Nume Produs</th>
                    <th scope="col" className="px-6 py-3">Preț / buc.</th>
                    <th scope="col" className="px-6 py-3 text-right">Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {produse.map((produs) => (
                    <tr key={produs.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{produs.nume}</td>
                        <td className="px-6 py-4">{formatCurrency(produs.pret)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(produs)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(produs)}>
                            <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProdus}
        produs={selectedProdus}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmă Ștergerea"
        description={`Ești sigur că vrei să ștergi produsul "${produsToDelete?.nume}"?`}
      />
    </>
  );
};

export default Produse;
