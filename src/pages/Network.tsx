import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { Users, Copy, Check, Share2, Network as NetIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Network() {
  const { userData } = useAuth() as any;
  const [copied, setCopied] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const referralUrl = userData?.referralCode ? `${window.location.origin}/register?ref=${userData.referralCode}` : '';

  useEffect(() => {
    const fetchTeam = async () => {
      if (!userData?.uid) return;
      try {
        const q = query(
          collection(db, "users"),
          where("sponsorUid", "==", userData.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedTeam: any[] = [];
        snapshot.forEach((doc) => {
          fetchedTeam.push({ id: doc.id, ...doc.data() });
        });
        setTeam(fetchedTeam);
      } catch(e) {
        console.error("Error fetching team", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [userData?.uid]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Network</h1>
        <p className="text-gray-400 mt-1">Build your team and earn commissions up to 10 levels deep.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-4">Referral Link</h3>
          <div className="flex space-x-2">
            <div className="flex-1">
               <Input readOnly value={referralUrl} icon={<Share2 size={16} />} />
            </div>
            <Button variant="secondary" onClick={handleCopy} className="h-12 w-12 p-0 flex-shrink-0">
              {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-4">Share this link to automatically set yourself as their sponsor.</p>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-gold-500/10 rounded-full mb-4">
            <NetIcon size={32} className="text-gold-500" />
          </div>
          <div className="text-3xl font-bold">{team.length}</div>
          <div className="text-sm text-gray-400 mt-1">Direct Referrals</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Users className="mr-2 text-gold-500" /> Direct Level (Level 1)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-800 text-sm text-gray-400">
                <th className="pb-3 font-medium border-none p-4">Username</th>
                <th className="pb-3 font-medium border-none p-4">Joined Date</th>
                <th className="pb-3 font-medium border-none p-4">Team Size</th>
                <th className="pb-3 font-medium border-none p-4 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : team.length > 0 ? (
                team.map((member) => (
                  <tr key={member.id} className="border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors">
                    <td className="py-4 border-none px-4 font-medium">{member.username}</td>
                    <td className="py-4 border-none px-4 text-gray-400 text-sm">{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 border-none px-4 text-gray-400">{member.teamSize || 0}</td>
                    <td className="py-4 border-none px-4">
                      <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-medium">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No referrals found. Start sharing your link!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
