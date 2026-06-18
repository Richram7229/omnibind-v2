import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { generateReferralCode } from '../../lib/utils';
import { Button, Input, Card } from '../../components/ui';
import { Mail, Lock, User, Wallet, KeyRound, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { auth, db, googleProvider } from '../../services/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Register() {
  const [params] = useSearchParams();
  let sponsorFromUrl = params.get('ref') || localStorage.getItem('sponsor') || '';
  if (sponsorFromUrl === 'undefined' || sponsorFromUrl === 'null') sponsorFromUrl = '';
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    pin: '',
    walletAddress: '',
    sponsorCode: sponsorFromUrl
  });
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pin.length !== 6 || !/^\d+$/.test(formData.pin)) {
      return toast.error("PIN must be exactly 6 digits");
    }
    if (formData.sponsorCode && formData.sponsorCode.toLowerCase() === formData.username.toLowerCase()) {
      return toast.error("Self-referral is not permitted");
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const newReferralCode = generateReferralCode(formData.username);

      const userData = {
        uid: user.uid,
        username: formData.username,
        email: formData.email,
        walletAddress: formData.walletAddress,
        pin: formData.pin,
        referralCode: newReferralCode,
        sponsorCode: formData.sponsorCode || null,
        role: formData.email === "admin@omnibind.com" ? "admin" : "user",
        balance: 1000,
        totalEarned: 0,
        teamSize: 0,
        createdAt: Date.now()
      };

      await setDoc(doc(db, "users", user.uid), userData);

      toast.success('Account created successfully!');
      await refreshUserData();
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const email = user.email || "";
        const userData = {
           uid: user.uid,
           username: user.displayName || email.split('@')[0],
           email: email,
           walletAddress: '',
           pin: '000000',
           referralCode: generateReferralCode(email.split('@')[0]),
           sponsorCode: sponsorFromUrl || null,
           role: "user",
           balance: 500,
           totalEarned: 0,
           teamSize: 0,
           createdAt: Date.now()
        };
        await setDoc(userDocRef, userData);
      }
      
      toast.success('Google Login successful!');
      await refreshUserData();
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden mt-16 lg:mt-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-gold-500/10 via-background to-background pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl z-10 py-8 lg:py-0"
      >
        <Card className="p-8 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-wider mb-2">
              JOIN OMNI<span className="text-gold-500">BIND</span>
            </h1>
            <p className="text-gray-400">Unlock premium staking rewards today.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                name="username"
                icon={<User size={18} />}
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <Input
                name="email"
                icon={<Mail size={18} />}
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Input
                name="password"
                icon={<Lock size={18} />}
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <Input
                name="pin"
                icon={<KeyRound size={18} />}
                type="password"
                placeholder="6-Digit Security PIN"
                maxLength={6}
                value={formData.pin}
                onChange={handleChange}
                required
              />
            </div>
            
            <Input
              name="walletAddress"
              icon={<Wallet size={18} />}
              placeholder="BEP20 Wallet Address"
              value={formData.walletAddress}
              onChange={handleChange}
              required
            />
            
            <Input
              name="sponsorCode"
              icon={<Share2 size={18} />}
              placeholder="Sponsor Referral Code (Optional)"
              value={formData.sponsorCode}
              onChange={handleChange}
            />

            <Button type="submit" className="w-full mt-4" size="lg" isLoading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-600 lg:w-1/4"></span>
            <span className="text-xs text-center text-gray-500 uppercase">or login with</span>
            <span className="w-1/5 border-b border-gray-600 lg:w-1/4"></span>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full mt-4" 
            size="lg" 
            onClick={signInWithGoogle} 
            isLoading={loading}
          >
            Google
          </Button>

          <div className="mt-8 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-500 hover:text-gold-400 font-medium">
              Sign In
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
