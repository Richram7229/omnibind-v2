import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { generateReferralCode } from '../../lib/utils';
import { Button, Input, Card } from '../../components/ui';
import { Mail, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { auth, db, googleProvider } from '../../services/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [params] = useSearchParams();
  let sponsorFromUrl = params.get('ref') || localStorage.getItem('sponsor') || '';
  if (sponsorFromUrl === 'undefined' || sponsorFromUrl === 'null') sponsorFromUrl = '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
      await refreshUserData();
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
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
        const emailAddress = user.email || "";
        const userData = {
           uid: user.uid,
           username: user.displayName || emailAddress.split('@')[0],
           email: emailAddress,
           walletAddress: '',
           pin: '000000',
           referralCode: generateReferralCode(emailAddress.split('@')[0]),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden mt-16 lg:mt-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-background to-background pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 py-8 lg:py-0"
      >
        <Card className="p-8 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-wider mb-2">
              OMNI<span className="text-gold-500">BIND</span>
            </h1>
            <p className="text-gray-400">Welcome back to the future of staking</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              icon={<Lock size={18} />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-gold-500 hover:text-gold-400">
                Forgot PIN/Password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              <LogIn className="mr-2" size={20} />
              Sign In
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
            Don't have an account?{' '}
            <Link to="/register" className="text-gold-500 hover:text-gold-400 font-medium">
              Create Account
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
