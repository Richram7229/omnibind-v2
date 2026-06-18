import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

export default function Wallet() {
  const { userData, refreshUserData } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return toast.error("Please enter a valid amount");
    }

    const numAmount = Number(amount);

    if (activeTab === 'withdraw' && numAmount > (userData?.balance || 0)) {
      return toast.error("Insufficient balance");
    }

    setLoading(true);
    try {
      // In a real app we'd probably use a runTransaction here if we were immediately updating balance,
      // but instead it's a pending status for an admin to verify.
      
      const newTx = {
        userId: userData?.uid,
        username: userData?.username,
        type: activeTab,
        amount: numAmount,
        status: 'pending',
        date: Date.now(),
        details: activeTab === 'withdraw' ? 'Withdrawal Request' : 'Deposit Request'
      };

      await addDoc(collection(db, "transactions"), newTx);
      await refreshUserData();
      
      toast.success(`${activeTab === 'withdraw' ? 'Withdrawal' : 'Deposit'} requested! Status: Pending.`);
      setAmount('');
    } catch (e: any) {
      toast.error(e.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your funds safely and securely.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-navy-800 to-navy-900 border-gold-500/20 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-32 bg-gold-500/5 blur-[100px] rounded-full pointer-events-none" />
           <div className="p-4 bg-navy-800 rounded-full mb-4 z-10">
             <WalletIcon size={32} className="text-gold-500" />
           </div>
           <div className="text-sm text-gray-400 font-medium mb-1 z-10">Available Balance</div>
           <div className="text-4xl font-bold text-gradient z-10">{formatCurrency(userData?.balance || 0)}</div>
        </Card>

        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="flex border-b border-navy-800">
            <button 
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'deposit' ? 'bg-navy-800/50 text-gold-500 border-b-2 border-gold-500' : 'text-gray-400 hover:text-white hover:bg-navy-800/20'}`}
              onClick={() => setActiveTab('deposit')}
            >
              Deposit Funds
            </button>
            <button 
              className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'withdraw' ? 'bg-navy-800/50 text-gold-500 border-b-2 border-gold-500' : 'text-gray-400 hover:text-white hover:bg-navy-800/20'}`}
              onClick={() => setActiveTab('withdraw')}
            >
              Withdraw Funds
            </button>
          </div>

          <div className="p-6 flex-1">
            <AnimatePresence mode="wait">
              <motion.form 
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {activeTab === 'deposit' ? (
                  <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20 text-sm text-gold-400">
                    <p className="font-semibold mb-1">How it works:</p>
                    <p>Enter the amount you wish to deposit. Admin will manually verify your deposit request and credit your account.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Withdraw to:</span>
                      <span className="font-medium max-w-[150px] truncate">{userData?.walletAddress}</span>
                    </div>
                  </div>
                )}

                <Input
                  label="Amount (USD)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  icon={<FileText size={18} />}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full" isLoading={loading}>
                  {activeTab === 'deposit' ? (
                    <><ArrowDownToLine className="mr-2" size={18} /> Request Deposit</>
                  ) : (
                    <><ArrowUpFromLine className="mr-2" size={18} /> Request Withdrawal</>
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}
