import React, { useEffect, useState } from 'react';
import supabaseService from '@/lib/supabaseService';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

interface UserRow {
  id?: number;
  name: string;
  email: string;
}

const TABLE_NAME = 'demo_users'; // you should create this table in Supabase or change name

const SupabaseDemo: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let sub: any;
    const load = async () => {
      setLoading(true);
      const res = await supabaseService.fetchData<UserRow>(TABLE_NAME);
      setLoading(false);
      if (res.success) {
        setRows(res.data);
      } else {
        toast.error('Eroare la încărcarea datelor: ' + res.error);
      }

      // subscribe to realtime changes
      sub = supabaseService.subscribeToTable<UserRow>(TABLE_NAME, (_payload) => {
        // naive approach: refetch on any change
        (async () => {
          const r = await supabaseService.fetchData<UserRow>(TABLE_NAME);
          if (r.success) setRows(r.data);
        })();
      });
    };

    load();

    return () => {
      if (sub && sub.unsubscribe) sub.unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    if (!name || !email) {
      toast.error('Completează nume și email');
      return;
    }
    setLoading(true);
    const res = await supabaseService.saveData<UserRow>(TABLE_NAME, { name, email });
    setLoading(false);
    if (res.success) {
      toast.success('Utilizator salvat');
      setName('');
      setEmail('');
      // update local state
      setRows(prev => [res.data, ...prev]);
    } else {
      toast.error('Eroare la salvare: ' + res.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input placeholder="Nume" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Se încarcă...' : 'Salvează în Supabase'}</Button>
      </div>

      <div>
        <h3 className="text-lg font-medium">Utilizatori</h3>
        {rows.length === 0 ? <p className="text-sm text-gray-500">Niciun user</p> : (
          <ul className="space-y-2 mt-2">
            {rows.map(r => (
              <li key={r.id} className="p-2 border rounded flex justify-between">
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-sm text-gray-500">{r.email}</div>
                </div>
                <div className="text-sm text-gray-400">#{r.id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupabaseDemo;
