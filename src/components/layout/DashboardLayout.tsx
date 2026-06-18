import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  Wallet, 
  Network, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon,
  ShieldCheck,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DashboardLayout() {
  const { userData, logout } = useAuth() as any; // We'll add isAdmin later
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Staking', path: '/staking', icon: <Award size={20} /> },
    { name: 'Network', path: '/network', icon: <Network size={20} /> },
    { name: 'Wallet', path: '/wallet', icon: <Wallet size={20} /> },
    { name: 'History', path: '/history', icon: <History size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  if (userData?.role === 'admin' || userData?.role === 'master_admin') {
    navLinks.push({ name: 'Admin Panel', path: '/admin', icon: <ShieldCheck size={20} className="text-gold-500" /> });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col glass border-r-0 border-r-navy-800 z-20">
        <div className="h-20 flex items-center px-8 border-b border-navy-800/50">
          <h1 className="text-2xl font-bold tracking-wider">
            OMNI<span className="text-gold-500">BIND</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navLinks.map((link) => (
             <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-gold-500/10 to-transparent text-gold-500 border-l-2 border-gold-500' 
                    : 'text-gray-400 hover:text-white hover:bg-navy-800/50'
                }`
              }
            >
              {link.icon}
              <span className="font-medium">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-800/50">
          <div className="flex items-center justify-between px-4 py-2 mb-4 bg-navy-900/50 rounded-xl">
             <div className="flex flex-col">
               <span className="text-xs text-gray-400">Logged in as</span>
               <span className="text-sm font-semibold truncate max-w-[120px]">{userData?.username || 'User'}</span>
             </div>
             <button onClick={toggleTheme} className="text-gray-400 hover:text-gold-500 transition-colors">
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass z-30 flex items-center justify-between px-4 border-b border-navy-800/50">
        <h1 className="text-xl font-bold tracking-wider">
          OMNI<span className="text-gold-500">BIND</span>
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-20 pt-16 bg-background/95 backdrop-blur-xl"
          >
            <nav className="p-4 space-y-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-4 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-gold-500/10 text-gold-500' 
                        : 'text-gray-300'
                    }`
                  }
                >
                  {link.icon}
                  <span className="font-medium">{link.name}</span>
                </NavLink>
              ))}
              <div className="h-px bg-navy-800 my-4" />
              <button 
                onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                className="flex items-center space-x-3 w-full px-4 py-4 text-gray-300"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span className="font-medium">Toggle Theme</span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-4 text-red-400"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0 scroll-smooth">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gold-500/5 via-background to-background pointer-events-none" />
        <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
