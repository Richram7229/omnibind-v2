import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: any;
  type?: "button" | "submit" | "reset";
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95 duration-200';
  
  const variants = {
    primary: 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 shadow-lg hover:shadow-gold-500/20',
    secondary: 'bg-navy-800 text-white hover:bg-navy-700 border border-navy-700',
    outline: 'border border-gold-500 text-gold-500 hover:bg-gold-500/10',
    ghost: 'hover:bg-navy-800 text-gray-300 hover:text-white',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}

