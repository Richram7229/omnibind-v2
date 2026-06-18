import React, { createContext, useContext, useEffect, useState } from "react";
import { UserData, Transaction } from "../types";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

  const fetchUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setUserData(null);
      setTransactions([]);
      return;
    }
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Derive balance deterministically from transactions ledger
        const txQuery = query(collection(db, "transactions"), where("userId", "==", currentUser.uid));
        const txSnapshot = await getDocs(txQuery);
        
        let derivedBalance = 0;
        let totalEarned = 0;
        const allTransactions: Transaction[] = [];
        
        txSnapshot.forEach(docSnap => {
          const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
          allTransactions.push(tx);
          if (tx.status === "rejected") return; // Ignore rejected transactions
          
          if (tx.type === "deposit" && tx.status === "completed") derivedBalance += tx.amount;
          if (tx.type === "withdrawal") derivedBalance -= tx.amount; // Deduct immediately for pending & completed
          if (tx.type === "staking_purchase" && tx.status === "completed") derivedBalance -= tx.amount;
          if (tx.type === "reward" && tx.status === "completed") {
            derivedBalance += tx.amount;
            totalEarned += tx.amount;
          }
          if (tx.type === "referral_commission" && tx.status === "completed") {
            derivedBalance += tx.amount;
            totalEarned += tx.amount;
          }
        });

        // Sort globally
        allTransactions.sort((a, b) => b.date - a.date);
        setTransactions(allTransactions);

        // Ensure balance doesn't go below 0 (for edge cases)
        data.balance = Math.max(0, derivedBalance);
        data.totalEarned = totalEarned;
        
        setUserData(data);
      } else {
        setUserData(null);
      }
    } catch (e: any) {
      console.error("Failed to fetch user data:", e);
    }
  };

  const refreshUserData = async () => {
    await fetchUserData(user);
  };
  
  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchUserData(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
