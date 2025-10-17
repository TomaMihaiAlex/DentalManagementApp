import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Tehnician } from '@/lib/types';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import AddTehnicianModal from '@/components/modals/AddTehnicianModal';

const Tehnicieni: React.FC = () => {
  const { tehnicieni, addTehnician, deleteTehnician } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tehnicianToDelete, setTehnicianToDelete] = useState<Tehnician | null>(null);

  const handleOpenDeleteModal = (tehnician: Tehnician) => {
    setTehnicianToDelete(tehnician);
    setDeleteModalOpen(true);
  };

  const handleSaveTehnician = (tehnicianData: { nume: string }) => {
    addTehnician(tehnicianData);
  };

  const handleDeleteConfirm = () => {
    if (tehnicianToDelete) {
      deleteTehnician(tehnicianToDelete.id);
      setDeleteModalOpen(false);
      setTehnicianToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Management Tehnicieni</CardTitle>
          <Button onClick={() => setModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adaugă Tehnician
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile & Tablet Card View */}
          <div className="grid grid-cols-1 lg:hidden gap-4 p-4">
            {tehnicieni.map((tehnician) => (
              <Card key={tehnician.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{tehnician.nume}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(tehnician)}>
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                    <th scope="col" className="px-6 py-3">Nume Tehnician</th>
                    <th scope="col" className="px-6 py-3 text-right">Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {tehnicieni.map((tehnician) => (
                    <tr key={tehnician.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{tehnician.nume}</td>
                        <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteModal(tehnician)}>
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

      <AddTehnicianModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTehnician}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmă Ștergerea"
        description={`Ești sigur că vrei să ștergi tehnicianul "${tehnicianToDelete?.nume}"?`}
      />
    </>
  );
};

export default Tehnicieni;
