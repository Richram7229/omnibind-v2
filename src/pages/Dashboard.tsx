import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Wallet, Users, Zap, Award, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActiveStake, Transaction } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs, limit, getDoc, doc } from 'firebase/firestore';

export default function Dashboard() {
  const { userData, transactions } = useAuth() as any;
  const [activeStake, setActiveStake] = useState<ActiveStake | null>(null);
  const [loading, setLoading] = useState(true);
  const [treasuryBal, setTreasuryBal] = useState(0);

  // Use globally loaded transactions straight from the AuthContext
  const recentTx = transactions.slice(0, 5);
  
  const pendingWithdrawals = transactions
    .filter((tx: any) => tx.type === 'withdrawal' && tx.status === 'pending')
    .reduce((acc: number, tx: any) => acc + tx.amount, 0);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.uid) return;
      try {
        // Fetch active stake(s)
        const stakesQuery = query(
          collection(db, "stakes"),
          where("userId", "==", userData.uid)
        );
        const stakesSnapshot = await getDocs(stakesQuery);
        const activeStakes = stakesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as ActiveStake))
          .filter(stake => stake.status === "active");
        
        if (activeStakes.length > 0) {
          setActiveStake(activeStakes[0]);
        } else {
          setActiveStake(null);
        }
        
        const tDoc = await getDoc(doc(db, "system", "treasury"));
        if (tDoc.exists()) setTreasuryBal(tDoc.data().balance);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData?.uid]);

  const stats = [
    { label: "Available Balance", value: formatCurrency(userData?.currentBalance || 0), icon: <Wallet className="text-blue-400" size={24} /> },
    { label: "Locked Balance", value: formatCurrency(userData?.lockedBalance || 0), icon: <Award className="text-purple-400" size={24} /> },
    { label: "Pending Withdrawals", value: formatCurrency(pendingWithdrawals), icon: <Zap className="text-yellow-400" size={24} /> },
    { label: "Treasury Health", value: formatCurrency(treasuryBal), icon: <ShieldAlert className="text-green-400" size={24} /> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-gray-400 mt-1">Welcome back, {userData?.username}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-navy-800/50 rounded-xl">{stat.icon}</div>
              </div>
              <div className="text-gray-400 text-sm font-medium mb-1">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Staking Display */}
        <Card className="lg:col-span-2 flex flex-col relative overflow-hidden bg-gradient-to-br from-navy-800 to-navy-900 border-gold-500/20">
          <div className="absolute top-0 right-0 p-32 bg-gold-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Award className="mr-2 text-gold-500" /> Active Staking
          </h2>
          
          {loading ? (
             <div className="animate-pulse flex space-x-4">
               <div className="flex-1 space-y-4 py-1">
                 <div className="h-4 bg-navy-700 rounded w-3/4"></div>
                 <div className="h-4 bg-navy-700 rounded w-1/2"></div>
               </div>
             </div>
          ) : activeStake ? (
            <div className="flex-1 flex flex-col justify-center">
               <div className="text-4xl font-bold text-gradient mb-2">{formatCurrency(activeStake.amount)} Staked</div>
               <div className="text-gray-400 mb-8">Earning actively</div>
               
               <div className="space-y-4">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-400">Total Claimed</span>
                   <span className="font-semibold text-green-400">{formatCurrency(activeStake.totalClaimed)}</span>
                 </div>
                 <div className="w-full bg-navy-900 rounded-full h-2">
                   <div className="bg-gradient-to-r from-gold-500 to-gold-400 h-2 rounded-full" style={{ width: '45%' }}></div>
                 </div>
                 <div className="flex justify-between text-xs text-gray-500">
                   <span>Started: {new Date(activeStake.startDate).toLocaleDateString()}</span>
                   <span>Ends: {new Date(activeStake.endDate).toLocaleDateString()}</span>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="p-4 bg-navy-800 rounded-full mb-4">
                <Award size={32} className="text-gray-500" />
              </div>
              <p className="text-gray-400 mb-6">You don't have any active staking packages.</p>
              <Button onClick={() => window.location.href='/staking'}>Explore Packages</Button>
            </div>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <Button variant="ghost" size="sm" onClick={() => window.location.href='/history'}>View All</Button>
          </div>
          
          <div className="space-y-4 flex-1">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : recentTx.length > 0 ? (
              recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-navy-800/30 hover:bg-navy-800/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${['deposit', 'reward', 'referral_commission', 'ROI_REWARD', 'ADMIN_CREDIT', 'DEPOSIT_APPROVED'].includes(tx.type) ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium capitalize">{tx.type.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? 'text-white' : 'text-green-400'}`}>
                    {['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? '-' : '+'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">No recent transactions</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
