import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  ShoppingBag, 
  History, 
  MessageCircle, 
  LogOut, 
  Search,
  Bell,
  Menu as MenuIcon,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Subpages
import UserMenu from './UserMenu';
import StartOrder from './StartOrder';
import RecentOrders from './RecentOrders';
import UserChat from './UserChat';
import UserGallery from './UserGallery';

const Sidebar = ({ user, handleLogout, isMobile, sidebarOpen, closeSidebar }) => {
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'conversations', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setHasUnread(docSnap.data().unreadByUser === true);
      }
    });
    return () => unsubscribe();
  }, [user]);
  
  const menuItems = [
    { name: 'Menu', icon: <Utensils size={20} />, path: '/dashboard/menu' },
    { name: 'Start Order', icon: <ShoppingBag size={20} />, path: '/dashboard/order' },
    { name: 'Recent Orders', icon: <History size={20} />, path: '/dashboard/history' },
    { 
      name: 'Chat', 
      icon: (
        <div className="relative">
          <MessageCircle size={20} />
          {hasUnread && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
        </div>
      ), 
      path: '/dashboard/chat' 
    },
    { name: 'Gallery', icon: <ImageIcon size={20} />, path: '/dashboard/gallery' },
  ];

  return (
    <div className={`${
      isMobile
        ? `fixed left-0 top-0 h-screen w-72 z-40 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`
        : 'w-72 fixed left-0 top-0'
    } bg-white border-r border-beige-200 flex flex-col h-screen`}>
      <Link to="/" onClick={() => isMobile && closeSidebar()} className="p-8 border-b border-beige-100 mb-6 flex flex-col items-center text-center group">
        <img src="/KahayagLogo.png" alt="Kahayag Logo" className="w-24 h-auto mb-2 group-hover:scale-105 transition-transform" />        
        <div>
          <div className="flex items-center gap-2 mb-1 justify-center">
            <span className="display font-bold text-lg text-beige-900">Kahayag</span>
          </div>
          <p className="text-[10px] text-beige-400 font-bold tracking-widest uppercase">Catering Services</p>
        </div>
      </Link>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            onClick={() => isMobile && closeSidebar()}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              location.pathname.startsWith(item.path) 
                ? 'bg-beige-800 text-white shadow-lg shadow-beige-100' 
                : 'text-beige-500 hover:bg-beige-50 hover:text-beige-800'
            }`}
          >
            <span className={`${location.pathname.startsWith(item.path) ? 'text-white' : 'text-beige-400 group-hover:text-beige-800'}`}>
              {item.icon}
            </span>
            <span className="font-semibold text-sm">{item.name}</span>
          </Link>
        ))}
      </div>

      <div className="p-6 border-t border-beige-100">
        <div className="flex items-center gap-3 p-3 bg-beige-50 rounded-2xl mb-4">
          <div className="w-10 h-10 rounded-full bg-beige-300 flex items-center justify-center font-bold text-beige-800 uppercase flex-shrink-0">
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-sm font-bold text-beige-900 truncate">{user.name}</p>
            <p className="text-xs text-beige-500 truncate">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-semibold text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function UserDashboard({ user, setUser }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-beige-50">
      <Sidebar 
        user={user} 
        handleLogout={handleLogout}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
      />
      
      <div className={`flex-1 flex flex-col ${isMobile ? '' : 'ml-72'}`}>
        <header className="h-24 bg-beige-50 flex items-center justify-between px-4 md:px-10 sticky top-0 z-20 border-b border-beige-200">
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-beige-100 rounded-lg transition-all"
            >
              {sidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          )}
          
          <div className={`relative ${isMobile ? 'flex-1 mx-2' : 'max-w-md w-full'}`}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
            <input 
              type="text" 
              placeholder={isMobile ? "Search..." : "Search anything..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-beige-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 ml-2 md:ml-0">
            <button className="relative p-2 text-beige-400 hover:text-beige-800 transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-beige-50"></span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-10 flex-1 overflow-y-auto">
          <Routes>
            <Route path="menu" element={<UserMenu searchTerm={searchTerm} />} />
            <Route path="order" element={<StartOrder user={user} />} />
            <Route path="history" element={<RecentOrders user={user} />} />
            <Route path="chat" element={<UserChat user={user} />} />
            <Route path="gallery" element={<UserGallery searchTerm={searchTerm} />} />
            <Route path="*" element={<Navigate to="menu" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}