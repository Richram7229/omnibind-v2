import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { Transaction, Treasury, TreasuryLog, UserData } from '../types';
import toast from 'react-hot-toast';
import { ShieldCheck, Check, X, Users, DollarSign, Activity, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, LayoutDashboard, Send, Anchor, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc, runTransaction, addDoc, limit } from 'firebase/firestore';

export default function AdminPanel() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'treasury' | 'users'>('overview');
  
  const [requests, setRequests] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [treasuryLogs, setTreasuryLogs] = useState<TreasuryLog[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeStakes: 0,
    lockedFunds: 0,
    totalRoi: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Transactions
      const txQ = query(collection(db, "transactions"), orderBy("date", "desc"));
      const txSnapshot = await getDocs(txQ);
      const txs: Transaction[] = [];
      let pDep = 0;
      let pWith = 0;
      let tRoi = 0;
      
      txSnapshot.forEach(d => {
        const data = { id: d.id, ...d.data() } as Transaction;
        txs.push(data);
        if (data.status === 'pending' && data.type === 'deposit') pDep++;
        if (data.status === 'pending' && data.type === 'withdrawal') pWith++;
        if (data.status === 'completed' && data.type === 'ROI_REWARD') tRoi += data.amount;
      });
      setRequests(txs);

      // 2. Fetch Users
      const userQ = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const userSnapshot = await getDocs(userQ);
      const usrs: UserData[] = [];
      userSnapshot.forEach(d => {
        usrs.push({ ...d.data(), uid: d.id } as UserData);
      });
      setUsers(usrs);

      // 3. Fetch Stakes Configuration
      const stakeQ = query(collection(db, "stakes"), orderBy("startDate", "desc"));
      const stakeSnapshot = await getDocs(stakeQ);
      let actStakes = 0;
      let locFunds = 0;
      stakeSnapshot.forEach(d => {
        const s = d.data();
        if (s.status === 'active') {
          actStakes++;
          locFunds += (s.amount || 0);
        }
      });

      setStats({
        totalUsers: usrs.length,
        activeStakes: actStakes,
        lockedFunds: locFunds,
        totalRoi: tRoi,
        pendingDeposits: pDep,
        pendingWithdrawals: pWith
      });

      // 4. Fetch Treasury
      const tRef = doc(db, "system", "treasury");
      const tDoc = await getDoc(tRef);
      if (tDoc.exists()) {
         setTreasury(tDoc.data() as Treasury);
      }

      // 5. Fetch Treasury Logs
      const tLogQ = query(collection(db, "treasuryLogs"), orderBy("date", "desc"), limit(50));
      const tLogSnapshot = await getDocs(tLogQ);
      const tlgs: TreasuryLog[] = [];
      tLogSnapshot.forEach(d => {
        tlgs.push({ id: d.id, ...d.data() } as TreasuryLog);
      });
      setTreasuryLogs(tlgs);

    } catch(e) {
      console.error("Admin fetch error:", e);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDepositAction = async (tx: Transaction, action: 'approve' | 'reject') => {
    if (processingId) return;
    setProcessingId(tx.id);
    try {
      if (action === 'reject') {
        await updateDoc(doc(db, "transactions", tx.id), { status: 'rejected' });
        toast.success("Deposit rejected");
      } else {
        // Approve Logic: Increase user balance, Decrease treasury
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", tx.userId);
          const treasuryRef = doc(db, "system", "treasury");
          const txRef = doc(db, "transactions", tx.id);
          
          const usrDoc = await transaction.get(userRef);
          const trsDoc = await transaction.get(treasuryRef);
          
          if (!usrDoc.exists()) throw new Error("User not found");
          if (!trsDoc.exists()) throw new Error("Treasury not initialized");
          
          const curBal = usrDoc.data().currentBalance || 0;
          const curTreasury = trsDoc.data().balance || 0;
          const trsDebits = trsDoc.data().totalDebits || 0;
          
          // Actually do we allow treasury to go negative? Yes, we can just subtract.
          const newTreasuryBal = curTreasury - tx.amount;
          
          transaction.update(userRef, { currentBalance: curBal + tx.amount });
          transaction.update(treasuryRef, { 
             balance: newTreasuryBal,
             totalDebits: trsDebits + tx.amount
          });
          transaction.update(txRef, { status: 'completed', type: 'DEPOSIT_APPROVED' });

          const tlRef = doc(collection(db, "treasuryLogs"));
          transaction.set(tlRef, {
             type: 'debit',
             amount: tx.amount,
             reason: 'DEPOSIT_APPROVED',
             date: Date.now(),
             relatedUserId: tx.userId,
             relatedTransactionId: tx.id
          });
        });
        toast.success("Deposit approved - User credited");
      }
      fetchData();
    } catch(e: any) {
      toast.error(e.message || "Failed action");
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawAction = async (tx: Transaction, action: 'approve' | 'reject') => {
    if (processingId) return;
    setProcessingId(tx.id);
    try {
      if (action === 'reject') {
        await updateDoc(doc(db, "transactions", tx.id), { status: 'rejected' });
        toast.success("Withdrawal rejected");
      } else {
        // Approve Logic: Decrease user balance
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", tx.userId);
          const txRef = doc(db, "transactions", tx.id);
          
          const usrDoc = await transaction.get(userRef);
          if (!usrDoc.exists()) throw new Error("User not found");
          
          const curBal = usrDoc.data().currentBalance || 0;
          if (curBal < tx.amount) throw new Error("User has insufficient balance for this withdrawal");
          
          transaction.update(userRef, { currentBalance: curBal - tx.amount });
          transaction.update(txRef, { status: 'completed', type: 'WITHDRAW_APPROVED' });
        });
        toast.success("Withdrawal approved - User debited");
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed action");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUserFreeze = async (user: UserData) => {
    try {
      const newStatus = user.accountStatus === 'frozen' ? 'active' : 'frozen';
      await updateDoc(doc(db, "users", user.uid), { accountStatus: newStatus });
      toast.success(`User account ${newStatus}`);
      fetchData();
    } catch(e) {
      toast.error("Failed to update status");
    }
  };

  if (loading && !requests.length) {
    return <div className="text-center p-8">Loading System Data...</div>;
  }

  const deposits = requests.filter(t => t.type === 'deposit' || t.type === 'DEPOSIT_APPROVED');
  const withdrawals = requests.filter(t => t.type === 'withdrawal' || t.type === 'WITHDRAW_APPROVED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <ShieldCheck className="mr-3 text-gold-500" size={32} /> Master Treasury
          </h1>
          <p className="text-gray-400 mt-1">System command center & liquidity management</p>
        </div>
        <Button variant="outline" onClick={fetchData} isLoading={loading}>
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      <div className="flex overflow-x-auto pb-2 border-b border-navy-800 scrollbar-hide space-x-6">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
          { id: 'deposits', icon: Send, label: 'Deposits', badge: stats.pendingDeposits },
          { id: 'withdrawals', icon: Anchor, label: 'Withdrawals', badge: stats.pendingWithdrawals },
          { id: 'treasury', icon: DollarSign, label: 'Ledger' },
          { id: 'users', icon: Users, label: 'Users' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {!!tab.badge && (
               <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                 {tab.badge}
               </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-navy-900 border-gold-500/10">
               <div className="text-gray-400 text-sm font-medium">Treasury Balance</div>
               <div className="text-3xl font-bold text-white mt-1">{formatCurrency(treasury?.balance || 0)}</div>
               <div className="text-xs text-green-500 mt-2">System Liquidity Reserve</div>
            </Card>
            <Card>
               <div className="text-gray-400 text-sm font-medium">Total Locked Staked</div>
               <div className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.lockedFunds)}</div>
               <div className="text-xs text-blue-400 mt-2">{stats.activeStakes} Active Contracts</div>
            </Card>
             <Card>
               <div className="text-gray-400 text-sm font-medium">Total ROI Distributed</div>
               <div className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.totalRoi)}</div>
               <div className="text-xs text-purple-400 mt-2">Lifetime</div>
            </Card>
             <Card>
               <div className="text-gray-400 text-sm font-medium">Total Network Users</div>
               <div className="text-3xl font-bold text-white mt-1">{stats.totalUsers}</div>
               <div className="text-xs text-gray-500 mt-2">Registered Accounts</div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'deposits' && (
        <Card>
          <h2 className="text-lg font-bold mb-4 flex items-center"><Send className="mr-2 text-gold-500" size={20}/> Deposits Control</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400 border-b border-navy-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map(d => (
                  <tr key={d.id} className="border-b border-navy-800/20 hover:bg-navy-800/10">
                    <td className="p-3">{new Date(d.date).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-medium text-white">{d.username || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{d.userId.substring(0,8)}...</div>
                    </td>
                    <td className="p-3 font-semibold text-green-400">{formatCurrency(d.amount)}</td>
                    <td className="p-3">
                       <span className={`px-2 py-1 rounded text-xs ${d.status==='pending'?'bg-yellow-500/10 text-yellow-500':d.status==='completed'?'bg-green-500/10 text-green-500':'bg-red-500/10 text-red-500'}`}>
                         {d.status.toUpperCase()}
                       </span>
                    </td>
                    <td className="p-3 text-right">
                      {d.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                           <Button size="sm" onClick={() => handleDepositAction(d, 'approve')} isLoading={processingId===d.id} className="bg-green-500 hover:bg-green-600 text-white shadow-none px-3">
                             <Check size={16}/>
                           </Button>
                           <Button size="sm" onClick={() => handleDepositAction(d, 'reject')} disabled={!!processingId} className="bg-red-500 hover:bg-red-600 text-white shadow-none px-3">
                             <X size={16}/>
                           </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No deposit requests found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'withdrawals' && (
        <Card>
          <h2 className="text-lg font-bold mb-4 flex items-center"><Anchor className="mr-2 text-gold-500" size={20}/> Withdrawal Control</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400 border-b border-navy-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(d => (
                  <tr key={d.id} className="border-b border-navy-800/20 hover:bg-navy-800/10">
                    <td className="p-3">{new Date(d.date).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-medium text-white">{d.username || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{d.userId.substring(0,8)}...</div>
                    </td>
                    <td className="p-3 font-semibold text-red-400">{formatCurrency(d.amount)}</td>
                    <td className="p-3">
                       <span className={`px-2 py-1 rounded text-xs ${d.status==='pending'?'bg-yellow-500/10 text-yellow-500':d.status==='completed'?'bg-green-500/10 text-green-500':'bg-red-500/10 text-red-500'}`}>
                         {d.status.toUpperCase()}
                       </span>
                    </td>
                    <td className="p-3 text-right">
                      {d.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                           <Button size="sm" onClick={() => handleWithdrawAction(d, 'approve')} isLoading={processingId===d.id} className="bg-green-500 hover:bg-green-600 text-white shadow-none px-3">
                             <Check size={16}/>
                           </Button>
                           <Button size="sm" onClick={() => handleWithdrawAction(d, 'reject')} disabled={!!processingId} className="bg-red-500 hover:bg-red-600 text-white shadow-none px-3">
                             <X size={16}/>
                           </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No withdrawal requests found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'treasury' && (
        <Card>
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold flex items-center"><DollarSign className="mr-2 text-gold-500" size={20}/> Treasury Ledger</h2>
             <div className="px-4 py-2 bg-navy-800 rounded-lg text-sm font-mono border border-gold-500/20">
               {formatCurrency(treasury?.balance || 0)}
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
               <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Credits</div>
               <div className="text-xl font-bold text-green-400">{formatCurrency(treasury?.totalCredits || 0)}</div>
             </div>
             <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
               <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Debits</div>
               <div className="text-xl font-bold text-red-400">{formatCurrency(treasury?.totalDebits || 0)}</div>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400 border-b border-navy-800">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {treasuryLogs.map(l => (
                  <tr key={l.id} className="border-b border-navy-800/10">
                    <td className="p-3">{new Date(l.date).toLocaleString()}</td>
                    <td className="p-3 font-medium text-gray-300">{l.reason.replace(/_/g, ' ')}</td>
                    <td className={`p-3 text-right font-mono ${l.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {l.type === 'credit' ? '+' : '-'}{formatCurrency(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'users' && (
        <Card>
          <h2 className="text-lg font-bold mb-4 flex items-center"><Users className="mr-2 text-gold-500" size={20}/> User Management</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-400 border-b border-navy-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} className={`border-b border-navy-800/20 ${u.accountStatus === 'frozen' ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-white flex items-center">
                         {u.username} {u.role === 'master_admin' && <ShieldCheck size={14} className="ml-2 text-gold-500"/>}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="p-3 font-semibold">{formatCurrency(u.currentBalance)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${u.role === 'master_admin' ? 'bg-gold-500/20 text-gold-500' : 'bg-navy-800 text-gray-400'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                       {u.accountStatus === 'frozen' ? <span className="text-red-400">Frozen</span> : <span className="text-green-400">Active</span>}
                    </td>
                    <td className="p-3 text-right">
                       <Button size="sm" variant="outline" onClick={() => handleUserFreeze(u)} disabled={u.role==='master_admin'} className="text-xs py-1 h-auto">
                         {u.accountStatus === 'frozen' ? 'Unfreeze' : 'Freeze'}
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
