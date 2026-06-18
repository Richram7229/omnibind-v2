import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function generateReferralCode(username: string) {
  return `${username.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)}${Math.floor(Math.random() * 1000)}`;
}
