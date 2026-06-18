import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { STAKING_PACKAGES, StakingPackage } from '../types';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';
import { Check, ShieldAlert, Timer, Calculator, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, runTransaction } from 'firebase/firestore';

export default function Staking() {
  const { userData, refreshUserData } = useAuth() as any;
  const [selectedPack, setSelectedPack] = useState<StakingPackage | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('1000');
  const [calcDuration, setCalcDuration] = useState<number>(30);

  const handleStake = async () => {
    if (!selectedPack) return;
    if ((userData?.currentBalance || 0) < selectedPack.amount) {
      toast.error("Insufficient wallet balance. Please deposit first.");
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userData.uid);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) throw new Error("User not found");
        const curBal = userDoc.data().currentBalance || 0;
        const curLocked = userDoc.data().lockedBalance || 0;
        if (curBal < selectedPack.amount) throw new Error("Insufficient balance");
        
        transaction.update(userRef, { 
          currentBalance: curBal - selectedPack.amount,
          lockedBalance: curLocked + selectedPack.amount
        });

        const txRef = doc(collection(db, "transactions"));
        transaction.set(txRef, {
          userId: userData.uid,
          username: userData.username,
          type: 'STAKE_CREATED',
          amount: selectedPack.amount,
          status: 'completed',
          date: Date.now(),
          details: `Purchased package ${selectedPack.id}`
        });

        const startDate = Date.now();
        const endDate = startDate + (selectedPack.lockDays * 24 * 60 * 60 * 1000);
        const stakeRef = doc(collection(db, "stakes"));
        transaction.set(stakeRef, {
          userId: userData.uid,
          packageId: selectedPack.id,
          amount: selectedPack.amount,
          startDate,
          endDate,
          totalClaimed: 0,
          lastClaimDate: startDate,
          status: 'active'
        });
      });

      toast.success("Staking successful!");
      await refreshUserData();
      setSelectedPack(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  // Calculator Logic
  const getInterestRate = (amount: number, days: number) => {
    let baseRate = 5;
    if (amount >= 100) baseRate = 5.5;
    if (amount >= 250) baseRate = 6.0;
    if (amount >= 500) baseRate = 6.5;
    if (amount >= 1000) baseRate = 7.0;

    if (days >= 90) baseRate += 0.5;
    if (days >= 180) baseRate += 1.0;
    if (days >= 365) baseRate += 2.0;

    return baseRate;
  };

  const numAmount = parseFloat(calcAmount) || 0;
  const monthlyRate = getInterestRate(numAmount, calcDuration);
  const durationMonths = calcDuration / 30;
  const projectedProfit = numAmount * (monthlyRate / 100) * durationMonths;
  const totalReturn = numAmount + projectedProfit;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staking Packages</h1>
        <p className="text-gray-400 mt-1">Select a package to start earning daily rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {STAKING_PACKAGES.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card 
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${selectedPack?.id === pkg.id ? 'ring-2 ring-gold-500 bg-navy-800/80' : 'hover:bg-navy-800/50'}`}
              onClick={() => setSelectedPack(pkg)}
            >
              {selectedPack?.id === pkg.id && (
                <div className="absolute top-4 right-4 bg-gold-500 text-navy-900 p-1 rounded-full">
                  <Check size={16} className="font-bold" />
                </div>
              )}
              
              <div className="mb-2 text-sm text-gold-500 font-medium tracking-wider uppercase">Premium</div>
              <div className="text-4xl font-bold mb-4">{formatCurrency(pkg.amount)}</div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-300">
                  <Timer className="mr-2 text-gold-500" size={16} />
                  Lock Duration: {pkg.lockDays} Days
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <ShieldAlert className="mr-2 text-gold-500" size={16} />
                  Monthly Reward: {pkg.monthlyRewardPercent}%
                </div>
              </div>

              <div className="pt-4 border-t border-navy-700/50 flex justify-between items-center text-sm">
                <span className="text-gray-400">Est. Profit</span>
                <span className="font-bold text-green-400">+{formatCurrency(pkg.amount * (pkg.monthlyRewardPercent / 100))}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedPack && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-gradient-to-r from-navy-800 to-navy-900 border-gold-500/20 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between p-6">
               <div className="mb-4 sm:mb-0">
                 <h3 className="text-lg font-bold">Selected: {formatCurrency(selectedPack.amount)}</h3>
                 <p className="text-sm text-gray-400">Current Balance: {formatCurrency(userData?.currentBalance || 0)}</p>
               </div>
               <Button onClick={handleStake} isLoading={loading} className="w-full sm:w-auto">
                 Confirm Stake
               </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12"
      >
        <Card className="p-6 md:p-8 bg-navy-800/40 border border-navy-700">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-navy-900 rounded-lg mr-4">
              <Calculator className="text-gold-500" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Yield Calculator</h2>
              <p className="text-sm text-gray-400">Simulate your projected earnings based on amount and duration.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <Input
                  label="Staking Amount (USD)"
                  type="number"
                  min="0"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="Enter amount..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">Lock Duration: {calcDuration} Days</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 90, 180, 365].map(days => (
                    <button
                      key={days}
                      onClick={() => setCalcDuration(days)}
                      className={`py-2 text-sm rounded-lg border transition-all ${
                        calcDuration === days 
                          ? 'bg-gold-500 text-navy-900 border-gold-500 font-bold' 
                          : 'bg-navy-900 border-navy-700 text-gray-300 hover:border-gold-500/50'
                      }`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-navy-900/50 rounded-2xl p-6 border border-navy-700 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Monthly Interest Rate</span>
                <span className="bg-green-500/10 text-green-400 py-1 px-3 rounded-full text-sm font-bold">
                  {monthlyRate.toFixed(1)}% / mo
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-navy-700/50 pb-4">
                  <span className="text-gray-400">Projected Profit</span>
                  <div className="flex items-center text-green-400 font-bold">
                    <TrendingUp size={16} className="mr-2" />
                    +{formatCurrency(projectedProfit)}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-medium text-gray-300">Total Return</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(totalReturn)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
