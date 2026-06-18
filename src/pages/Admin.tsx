import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui';
import { Transaction } from '../types';
import toast from 'react-hot-toast';
import { ShieldCheck, Check, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [requests, setRequests] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const q = query(
        collection(db, "transactions"),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      const txs: Transaction[] = [];
      snapshot.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setRequests(txs);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (tx: Transaction, action: 'approve' | 'reject') => {
    try {
      const newStatus = action === 'approve' ? 'completed' : 'rejected';
      
      const userRef = doc(db, "users", tx.userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("User not found");
      
      await updateDoc(doc(db, "transactions", tx.id), { status: newStatus });
      setRequests(reqs => reqs.map(r => r.id === tx.id ? { ...r, status: newStatus } : r));

      toast.success(`Transaction ${action === 'approve' ? 'Approved' : 'Rejected'}`);
    } catch(e: any) {
      toast.error(e.message || 'Action failed');
    }
  };

  const pendingTxs = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gold-500 flex items-center">
          <ShieldCheck className="mr-3" size={32} /> Admin Control Panel
        </h1>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-6">Pending Requests ({pendingTxs.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-navy-800 text-sm text-gray-400">
                <th className="p-4">User</th>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : pendingTxs.length > 0 ? (
                pendingTxs.map(tx => (
                  <tr key={tx.id} className="border-b border-navy-800/50">
                    <td className="p-4 font-medium">{(tx as any).username || tx.userId.substring(0,8)}</td>
                    <td className="p-4 capitalize">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-bold">{formatCurrency(tx.amount)}</td>
                    <td className="p-4 flex justify-end space-x-2">
                       <Button size="sm" onClick={() => handleAction(tx, 'approve')} className="bg-green-500/20 text-green-500 border-none hover:bg-green-500/30 px-3">
                         <Check size={16} />
                       </Button>
                       <Button size="sm" onClick={() => handleAction(tx, 'reject')} className="bg-red-500/20 text-red-500 border-none hover:bg-red-500/30 px-3">
                         <X size={16} />
                       </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No pending requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <Card>
        <h2 className="text-xl font-bold mb-6">Recent History (All)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-gray-400">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0,10).map(tx => (
                <tr key={tx.id} className="border-b border-navy-800/20">
                  <td className="p-3 text-gray-400">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{tx.type.replace('_', ' ')}</td>
                  <td className="p-3">{formatCurrency(tx.amount)}</td>
                  <td className={`p-3 capitalize ${tx.status === 'completed' ? 'text-green-500' : tx.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`}>{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
