import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Inbox, 
  CheckSquare, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  History, 
  Coffee,
  LogOut, 
  Search,
  Bell,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'motion/react';

// Admin Subpages
import OrderRequests from './AdminOrderRequests';
import ApprovedOrders from './AdminApprovedOrders';
import AdminChat from './AdminChat';
import AdminCalendar from './AdminCalendar';
import FinalizedHistory from './FinalizedHistory';
import ManageFood from './ManageFood';
import ManageGallery from './ManageGallery';

const AdminSidebar = ({ user, handleLogout }) => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Order Requests', icon: <Inbox size={20} />, path: '/dashboard/requests' },
    { name: 'Approved Orders', icon: <CheckSquare size={20} />, path: '/dashboard/approved' },
    { name: 'Chat', icon: <MessageSquare size={20} />, path: '/dashboard/admin-chat' },
    { name: 'Calendar', icon: <CalendarIcon size={20} />, path: '/dashboard/calendar' },
    { name: 'Finalized History', icon: <History size={20} />, path: '/dashboard/history' },
    { name: 'Manage Food', icon: <Coffee size={20} />, path: '/dashboard/food' },
    { name: 'Gallery', icon: <ImageIcon size={20} />, path: '/dashboard/gallery-manage' },
  ];

  return (
    <div className="w-72 bg-beige-900 flex flex-col h-screen fixed left-0 top-0 text-white z-30">
      <div className="p-8 border-b border-white/10 mb-6 flex flex-col items-center text-center">
        <img src="/KahayagLogo.png" className="w-24 h-auto mb-2 brightness-0 invert" />
        <div>
          <div className="flex items-center gap-2 mb-1 justify-center">
            <span className="display font-bold text-lg tracking-wider italic">KAHAYAG</span>
          </div>
          <p className="text-[10px] text-beige-400 font-bold tracking-widest uppercase">Admin Panel</p>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              location.pathname.startsWith(item.path) 
                ? 'bg-white text-beige-900 shadow-xl' 
                : 'text-beige-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-semibold text-sm">{item.name}</span>
          </Link>
        ))}
      </div>

      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl mb-4">
          <div className="w-10 h-10 rounded-full bg-beige-700 flex items-center justify-center font-bold text-white uppercase border border-white/20">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">Admin Central</p>
            <p className="text-[10px] text-beige-500 truncate">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-2xl transition-all"
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

export default function AdminDashboard({ user, setUser }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

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
      <AdminSidebar user={user} handleLogout={handleLogout} />
      
      <div className="flex-1 ml-72">
        <header className="h-24 bg-white border-b border-beige-100 flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
            <input 
              type="text" 
              placeholder="Search orders, clients, or menu..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-100">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span>
               <span className="text-xs font-bold text-green-700 uppercase">Live System</span>
            </div>
          </div>
        </header>

        <main className="p-10 pb-20">
          <Routes>
            <Route path="requests" element={<OrderRequests searchTerm={searchTerm} />} />
            <Route path="approved" element={<ApprovedOrders searchTerm={searchTerm} />} />
            <Route path="admin-chat" element={<AdminChat searchTerm={searchTerm} user={user} />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="history" element={<FinalizedHistory searchTerm={searchTerm} />} />
            <Route path="food" element={<ManageFood />} />
            <Route path="gallery-manage" element={<ManageGallery searchTerm={searchTerm} />} />
            <Route path="*" element={<Navigate to="requests" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
