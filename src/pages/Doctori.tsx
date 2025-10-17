import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { PlusCircle, Edit, Trash2, Mail, Phone, Users } from 'lucide-react';
import { Doctor } from '@/lib/types';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import AddDoctorModal from '@/components/modals/AddDoctorModal';
import ViewPatientsModal from '@/components/modals/ViewPatientsModal';

const Doctori: React.FC = () => {
  const { doctori, addDoctor, updateDoctor, deleteDoctor } = useData();
  const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isViewPatientsModalOpen, setViewPatientsModalOpen] = useState(false);
  
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [doctorToView, setDoctorToView] = useState<Doctor | null>(null);

  const handleOpenAddModal = () => {
    setSelectedDoctor(null);
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setAddEditModalOpen(true);
  };

  const handleOpenDeleteModal = (doctor: Doctor) => {
    setDoctorToDelete(doctor);
    setDeleteModalOpen(true);
  };

  const handleOpenViewPatientsModal = (doctor: Doctor) => {
    setDoctorToView(doctor);
    setViewPatientsModalOpen(true);
  };

  const handleSaveDoctor = (doctorData: any) => {
    if (doctorData.id) {
      updateDoctor(doctorData);
    } else {
      addDoctor(doctorData);
    }
  };

  const handleDeleteConfirm = () => {
    if (doctorToDelete) {
      deleteDoctor(doctorToDelete.id);
      setDeleteModalOpen(false);
      setDoctorToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Management Doctori</CardTitle>
          <Button onClick={handleOpenAddModal}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adaugă Doctor
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile & Tablet Card View */}
          <div className="grid grid-cols-1 lg:hidden gap-4 p-4">
            {doctori.map((doctor) => (
              <Card key={doctor.id} className="flex flex-col cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => handleOpenViewPatientsModal(doctor)}>
                <CardHeader>
                  <CardTitle className="text-base">{doctor.nume}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-500"/>{doctor.email || 'N/A'}</div>
                  <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-500"/>{doctor.telefon || 'N/A'}</div>
                  <div className="flex items-center"><Users className="w-4 h-4 mr-2 text-gray-500"/>{doctor.pacienti.length} pacienți</div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(doctor); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(doctor); }}>
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
                    <th scope="col" className="px-6 py-3">Nume</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Telefon</th>
                    <th scope="col" className="px-6 py-3">Nr. Pacienți</th>
                    <th scope="col" className="px-6 py-3 text-right">Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {doctori.map((doctor) => (
                    <tr key={doctor.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer" onClick={() => handleOpenViewPatientsModal(doctor)}>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{doctor.nume}</td>
                        <td className="px-6 py-4">{doctor.email}</td>
                        <td className="px-6 py-4">{doctor.telefon}</td>
                        <td className="px-6 py-4">{doctor.pacienti.length}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(doctor); }}>
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(doctor); }}>
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

      <AddDoctorModal
        isOpen={isAddEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        onSave={handleSaveDoctor}
        doctor={selectedDoctor}
      />

      <ViewPatientsModal
        isOpen={isViewPatientsModalOpen}
        onClose={() => setViewPatientsModalOpen(false)}
        doctor={doctorToView}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmă Ștergerea"
        description={`Ești sigur că vrei să ștergi doctorul "${doctorToDelete?.nume}"? Toate comenzile și pacienții asociați vor fi de asemenea șterși.`}
      />
    </>
  );
};

export default Doctori;
