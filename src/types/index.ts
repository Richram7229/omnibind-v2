export type UserRole = "user" | "admin" | "master_admin";

export interface UserData {
  uid: string;
  username: string;
  email: string;
  walletAddress: string;
  pin: string; // Stored securely (hashed in a real system)
  referralCode: string;
  sponsorCode: string | null;
  sponsorUid: string | null;
  role: UserRole;
  currentBalance: number;
  lockedBalance: number;
  totalEarnings: number;
  teamSize: number;
  createdAt: number;
  accountStatus?: "active" | "frozen";
}

export interface StakingPackage {
  id: string;
  amount: number;
  monthlyRewardPercent: number;
  lockDays: number;
}

export const STAKING_PACKAGES: StakingPackage[] = [
  { id: "p50", amount: 50, monthlyRewardPercent: 5, lockDays: 30 },
  { id: "p100", amount: 100, monthlyRewardPercent: 5.5, lockDays: 30 },
  { id: "p250", amount: 250, monthlyRewardPercent: 6, lockDays: 30 },
  { id: "p500", amount: 500, monthlyRewardPercent: 6.5, lockDays: 30 },
  { id: "p1000", amount: 1000, monthlyRewardPercent: 7, lockDays: 30 },
];

export interface ActiveStake {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  startDate: number;
  endDate: number;
  lastClaimDate: number;
  totalClaimed: number;
  status: "active" | "completed";
}

export type TransactionType = "deposit" | "withdrawal" | "reward" | "referral_commission" | "staking_purchase" | "DEPOSIT_APPROVED" | "WITHDRAW_APPROVED" | "STAKE_CREATED" | "ROI_REWARD" | "ADMIN_CREDIT" | "ADMIN_DEBIT";
export type TransactionStatus = "pending" | "completed" | "rejected";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  date: number;
  details: string;
  username?: string;
  walletAddress?: string;
}

export interface Treasury {
  balance: number;
  totalCredits: number;
  totalDebits: number;
}

export interface TreasuryLog {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  date: number;
  relatedUserId?: string;
  relatedTransactionId?: string;
}
