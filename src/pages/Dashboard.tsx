import React, { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import TehnicianOrdersModal from '@/components/modals/TehnicianOrdersModal';
import ConfirmFinalizeModal from '@/components/modals/ConfirmFinalizeModal';
import ComandaModal from '@/components/modals/ComandaModal';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, ShoppingCart, CheckCircle, AlertCircle, UserCheck } from 'lucide-react';
import { isThisMonth, parseISO, getMonth, getYear } from 'date-fns';

const Dashboard: React.FC = () => {
  const { comenzi, tehnicieni, doctori, addComanda, updateComanda, finalizeComanda } = useData();

  const dashboardData = useMemo(() => {
    const revenueThisMonth = comenzi
      .filter(c => c.data_finalizare && isThisMonth(parseISO(c.data_finalizare)))
      .reduce((acc, c) => acc + c.total, 0);

    const statusCounts = comenzi.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyRevenueData = comenzi
      .filter(c => c.data_finalizare)
      .reduce((acc, c) => {
          const month = parseISO(c.data_finalizare!).toLocaleString('default', { month: 'short' });
          const existing = acc.find(item => item.name === month);
          if (existing) {
              existing.Venit += c.total;
          } else {
              acc.push({ name: month, Venit: c.total });
          }
          return acc;
      }, [] as { name: string, Venit: number }[]);

    const technicianSummary = tehnicieni.map(tech => ({
      ...tech,
      completedOrders: comenzi.filter(c => c.status === 'Finalizată' && c.tehnician === tech.nume).length,
    }));
    
    const totalOrders = comenzi.length;
    const statusChartData = [
      {
        name: 'Finalizate',
        procent: totalOrders > 0 ? ((statusCounts['Finalizată'] || 0) / totalOrders) * 100 : 0,
        fill: '#22c55e', // green-500
      },
      {
        name: 'În progres',
        procent: totalOrders > 0 ? ((statusCounts['În progres'] || 0) / totalOrders) * 100 : 0,
        fill: '#f97316', // orange-500
      },
      {
        name: 'Întârziate',
        procent: totalOrders > 0 ? ((statusCounts['Întârziată'] || 0) / totalOrders) * 100 : 0,
        fill: '#ef4444', // red-500
      },
    ];

    return {
      revenueThisMonth,
      inProgressOrders: statusCounts['În progres'] || 0,
      completedOrders: statusCounts['Finalizată'] || 0,
      delayedOrders: statusCounts['Întârziată'] || 0,
      monthlyRevenueData,
      technicianSummary,
      statusChartData,
    };
  }, [comenzi, tehnicieni]);

  // Month/Year filters and sorting for technician summary
  const months = Array.from({ length: 12 }).map((_, i) => ({ value: i, label: new Date(2020, i, 1).toLocaleString('default', { month: 'long' }) }));
  const years = useMemo(() => {
    const ys = new Set<number>();
    comenzi.forEach(c => {
      if (c.data_finalizare) {
        try {
          ys.add(getYear(parseISO(c.data_finalizare)));
        } catch (e) {}
      }
    });
    const arr = Array.from(ys).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (arr.length === 0) arr.push(currentYear);
    if (!arr.includes(currentYear)) arr.unshift(currentYear);
    return arr;
  }, [comenzi]);

  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(years[0] ?? 'all');
  const [sortDesc, setSortDesc] = useState(true);

  const technicianSummaryFiltered = useMemo(() => {
    const summary = tehnicieni.map(tech => {
      const count = comenzi.filter(c => {
        if (c.status !== 'Finalizată') return false;
        if (c.tehnician !== tech.nume) return false;
        if (!c.data_finalizare) return false;
        try {
          const d = parseISO(c.data_finalizare);
          if (selectedMonth !== 'all' && getMonth(d) !== selectedMonth) return false;
          if (selectedYear !== 'all' && getYear(d) !== selectedYear) return false;
        } catch (e) {
          return false;
        }
        return true;
      }).length;
      return { ...tech, completedOrders: count };
    });
    summary.sort((a, b) => (sortDesc ? b.completedOrders - a.completedOrders : a.completedOrders - b.completedOrders));
    return summary;
  }, [tehnicieni, comenzi, selectedMonth, selectedYear, sortDesc]);

  const [selectedTehnician, setSelectedTehnician] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openTehnicianModal = (nume: string) => {
    setSelectedTehnician(nume);
    setIsModalOpen(true);
  };

  const closeTehnicianModal = () => {
    setSelectedTehnician(null);
    setIsModalOpen(false);
  };
  // ComandaModal state (reuse existing ComandaModal used in Comenzi page)
  const [selectedComanda, setSelectedComanda] = useState<any | null>(null);
  const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);

  

  // Confirm finalize modal (open from technician summary)
  const [isConfirmFinalizeModalOpen, setConfirmFinalizeModalOpen] = useState(false);
  const [dataForFinalization, setDataForFinalization] = useState<{ comanda: any; tehnician: string } | null>(null);

  const openConfirmFinalizeModal = (comanda: any) => {
    setDataForFinalization({ comanda, tehnician: selectedTehnician || comanda.tehnician || '' });
    setConfirmFinalizeModalOpen(true);
  };

  const handleFinalizeConfirm = () => {
    if (!dataForFinalization) return;
    const { comanda, tehnician } = dataForFinalization;
    finalizeComanda(comanda.id, tehnician);
    setConfirmFinalizeModalOpen(false);
    setDataForFinalization(null);
  };

  const handleSaveComandaFromDashboard = (comandaData: any) => {
    if (comandaData.id) {
      updateComanda(comandaData);
    } else {
      addComanda(comandaData);
    }
    setIsComandaModalOpen(false);
    setSelectedComanda(null);
  };

  const summaryCards = [
    { title: 'Venit Total (luna curentă)', value: formatCurrency(dashboardData.revenueThisMonth), icon: DollarSign, color: 'text-sky-500' },
    { title: 'Comenzi în Progres', value: dashboardData.inProgressOrders, icon: ShoppingCart, color: 'text-warning' },
    { title: 'Comenzi Finalizate', value: dashboardData.completedOrders, icon: CheckCircle, color: 'text-success' },
    { title: 'Comenzi Întârziate', value: dashboardData.delayedOrders, icon: AlertCircle, color: 'text-danger' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Venit Lunar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(Number(value))}`} />
                <Tooltip cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }} />
                <Legend />
                <Bar dataKey="Venit" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Status Comenzi (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.statusChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                    cursor={{ fill: 'rgba(125, 125, 125, 0.1)' }} 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }} 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Procent']}
                />
                <Bar dataKey="procent" radius={[4, 4, 0, 0]}>
                  {dashboardData.statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sumar Tehnicieni</CardTitle>
        </CardHeader>
        <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm text-gray-700 dark:text-gray-300">Lună:</label>
              <select
                className="p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded focus:ring-0"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Toate</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <label className="text-sm text-gray-700 dark:text-gray-300">An:</label>
              <select
                className="p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded focus:ring-0"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Toate</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                className="ml-auto px-3 py-2 rounded border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900"
                onClick={() => setSortDesc(s => !s)}
              >
                {sortDesc ? 'Sort: Desc' : 'Sort: Asc'}
              </button>
            </div>

            {/* Mobile & Tablet Card View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                {technicianSummaryFiltered.map(tech => (
                    <Card key={tech.id}>
            <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center">
                                <UserCheck className="w-5 h-5 mr-2 text-gray-500"/>
                <button onClick={() => openTehnicianModal(tech.nume)} className="text-left">{tech.nume}</button>
                            </CardTitle>
                            <div className="text-lg font-bold">{tech.completedOrders}</div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Comenzi Finalizate</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                    <th scope="col" className="px-6 py-3">Nume Tehnician</th>
                    <th scope="col" className="px-6 py-3 text-center">Comenzi Finalizate</th>
                    </tr>
                </thead>
        <tbody>
          {technicianSummaryFiltered.map(tech => (
                    <tr key={tech.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center">
                        <button onClick={() => openTehnicianModal(tech.nume)} className="flex items-center text-left w-full"><UserCheck className="w-5 h-5 mr-2 text-gray-500"/>{tech.nume}</button>
                        </td>
                        <td className="px-6 py-4 text-center">{tech.completedOrders}</td>
                    </tr>
          ))}
                </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
      
      {/* Technician Orders Modal */}
      {isModalOpen && selectedTehnician && (
        <TehnicianOrdersModal
          isOpen={isModalOpen}
          onClose={closeTehnicianModal}
          tehnicianName={selectedTehnician}
          orders={comenzi.filter(c => {
            if (c.status !== 'Finalizată') return false;
            if (c.tehnician !== selectedTehnician) return false;
            if (!c.data_finalizare) return false;
            try {
              const d = parseISO(c.data_finalizare);
              if (selectedMonth !== 'all' && getMonth(d) !== selectedMonth) return false;
              if (selectedYear !== 'all' && getYear(d) !== selectedYear) return false;
            } catch (e) {
              return false;
            }
            return true;
          })}
          doctori={doctori}
          onOpenComanda={openConfirmFinalizeModal}
        />
      )}

  <ComandaModal isOpen={isComandaModalOpen} onClose={() => setIsComandaModalOpen(false)} onSave={handleSaveComandaFromDashboard} comanda={selectedComanda} />
  <ConfirmFinalizeModal isOpen={isConfirmFinalizeModalOpen} onClose={() => setConfirmFinalizeModalOpen(false)} onConfirm={handleFinalizeConfirm} data={dataForFinalization} viewOnly={true} />
    </div>
  );
};

export default Dashboard;
