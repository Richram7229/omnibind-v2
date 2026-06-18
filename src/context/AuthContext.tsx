import React, { createContext, useContext, useEffect, useState } from "react";
import { UserData, Transaction } from "../types";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  transactions: Transaction[];
  loading: boolean;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setTransactions([]);
        localStorage.removeItem('auth_uid');
        localStorage.removeItem('auth_session');
        setLoading(false);
      } else {
        localStorage.setItem('auth_uid', currentUser.uid);
        localStorage.setItem('auth_session', 'active');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Real-time synchronization for User Data
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Save fallback locally for extreme edge cases, but prefer live DB state
        localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(data));
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false); // Only set loading false once user document is resolved
    }, (error) => {
      console.error("Failed to sync user data:", error);
      const cached = localStorage.getItem(`user_profile_${user.uid}`);
      if (cached) setUserData(JSON.parse(cached));
      setLoading(false);
    });

    // Real-time synchronization for Transactions
    const txQuery = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribeTx = onSnapshot(txQuery, (txSnapshot) => {
      const allTransactions: Transaction[] = [];
      txSnapshot.forEach(docSnap => {
        allTransactions.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
      });
      allTransactions.sort((a, b) => b.date - a.date);
      setTransactions(allTransactions);
    }, (error) => {
      console.error("Failed to sync transactions:", error);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTx();
    };
  }, [user]);

  const refreshUserData = async () => {
    // With onSnapshot, this is mostly a fallback, but we can leave it returning instantly
    // or you can explicitly trigger a manual fetch if needed.
    return Promise.resolve();
  };
  
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, transactions, loading, refreshUserData, logout }}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center bg-navy-900 text-gold-500">
          <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
