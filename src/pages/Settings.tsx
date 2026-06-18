import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import toast from 'react-hot-toast';
import { User, Wallet, Lock } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function Settings() {
  const { userData, refreshUserData, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(userData?.walletAddress || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", userData.uid);
      await updateDoc(userRef, { walletAddress: wallet });
      await refreshUserData();
      toast.success("Profile updated successfully!");
    } catch(e: any) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences and security.</p>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <User className="mr-2 text-gold-500" /> Profile Information
        </h2>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-navy-900/50 rounded-xl border border-navy-800">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Username</label>
            <div className="font-medium text-lg mt-1">{userData?.username}</div>
          </div>
          <div className="p-4 bg-navy-900/50 rounded-xl border border-navy-800">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
            <div className="font-medium text-lg mt-1">{userData?.email}</div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-6 flex items-center pt-6 border-t border-navy-800/50">
          <Wallet className="mr-2 text-gold-500" /> Financial Details
        </h2>

        <form onSubmit={handleUpdate} className="space-y-6">
          <Input 
            label="BEP20 Wallet Address"
            icon={<Wallet size={18} />}
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
          <Button type="submit" isLoading={loading}>Update Wallet</Button>
        </form>

        <div className="pt-8 mt-8 border-t border-navy-800/50">
          <h2 className="text-xl font-bold mb-4 flex items-center text-red-400">
            <Lock className="mr-2" /> Account Security
          </h2>
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-200">Sign Out</h3>
              <p className="text-sm text-red-400/80">Securely log out of your account on this device.</p>
            </div>
            <Button 
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border-red-500/50"
            >
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
