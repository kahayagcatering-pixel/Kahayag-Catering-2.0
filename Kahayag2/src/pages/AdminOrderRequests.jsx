import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Clock, 
    Calendar, 
    MessageCircle, 
    Check, 
    X, 
    ChevronRight, 
    AlertTriangle,
    MapPin,
    User,
    Package,
    Inbox,
    ArrowUpDown
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';

export default function OrderRequests({ searchTerm }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('time-asc');

  useEffect(() => {
    const qAll = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOrders(orderData);
      setOrders(orderData.filter(o => o.status === 'Waiting'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (order) => {
    const approvedOrders = allOrders.filter(o => o.status === 'Approved');
    
    const orderDate = order.date instanceof Timestamp ? order.date.toDate() : (order.date?.seconds ? new Date(order.date.seconds * 1000) : new Date(order.date));
    
    const conflict = approvedOrders.find(o => {
      const d = o.date instanceof Timestamp ? o.date.toDate() : (o.date?.seconds ? new Date(o.date.seconds * 1000) : new Date(o.date));
      return isSameDay(d, orderDate);
    });

    if (conflict) {
      setError(`Conflict detected with an already Approved order for ${format(orderDate, 'PPP')}. Conflicted with: ${conflict.userName}`);
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'Approved', updatedAt: Timestamp.now() });
      setSelectedOrder(null);
      setError('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleDecline = async (order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'Denied', updatedAt: Timestamp.now() });
      setSelectedOrder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const sortedOrders = [...orders].filter(o => 
    o.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm) ||
    (o.eventName && o.eventName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt));
    const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt));
    
    if (sortBy === 'time-asc') return dateA - dateB;
    if (sortBy === 'time-desc') return dateB - dateA;
    if (sortBy === 'name-asc') return a.userName.localeCompare(b.userName);
    if (sortBy === 'name-desc') return b.userName.localeCompare(a.userName);
    return 0;
  });

  const formatDate = (date) => {
    if (date instanceof Timestamp) return format(date.toDate(), 'PPP');
    if (date?.seconds) return format(new Date(date.seconds * 1000), 'PPP');
    if (typeof date === 'string') return format(new Date(date), 'PPP');
    return 'Invalid Date';
  };

  const formatDateTime = (date) => {
    if (date instanceof Timestamp) return format(date.toDate(), 'PPP p');
    if (date?.seconds) return format(new Date(date.seconds * 1000), 'PPP p');
    if (typeof date === 'string') return format(new Date(date), 'PPP p');
    return 'Invalid Date';
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading requests...</div>;

  return (
    <div className="flex gap-10 h-full pb-10">
      <div className="w-1/2 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="serif text-4xl italic">Pending Requests</h1>
              <p className="text-xs text-beige-400 font-bold uppercase tracking-widest mt-1">Found {sortedOrders.length} New Clients</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-beige-400 font-bold uppercase tracking-[0.2em] pl-1">Sort Orders</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-beige-100 p-3 rounded-2xl text-xs font-bold text-beige-700 focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
              >
                <option value="time-asc">First Requester (Prioritize)</option>
                <option value="time-desc">Latest Request First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
        </div>

        {sortedOrders.map((order, idx) => (
          <motion.div 
            key={order.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => { setSelectedOrder(order); setError(''); }}
            className={`group cursor-pointer p-8 rounded-[40px] border transition-all duration-500 ${
                selectedOrder?.id === order.id 
                ? 'bg-beige-900 text-white border-beige-900 shadow-2xl scale-[1.02]' 
                : 'bg-white border-beige-100 hover:border-beige-300 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-all ${selectedOrder?.id === order.id ? 'bg-white/10 text-white' : 'bg-beige-50 text-beige-800 group-hover:scale-105'}`}>
                    {order.userName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{order.userName}</h3>
                    {/* ── FIX: event name shown below customer name in list card ── */}
                    <p className={`text-xs font-bold italic ${selectedOrder?.id === order.id ? 'text-beige-300' : 'text-beige-600'}`}>
                      {order.eventName || '—'}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-beige-400' : 'text-beige-400'}`}>
                      {order.id.slice(-6)}
                    </p>
                  </div>
               </div>
               <div className="text-right">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-beige-400' : 'text-beige-400'}`}>Service</p>
                  <p className="font-bold italic">{order.service || 'N/A'}</p>
               </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-2 text-xs font-bold ${selectedOrder?.id === order.id ? 'text-white' : 'text-beige-800'}`}>
                      <Calendar size={14} className="opacity-50" />
                      {formatDate(order.date)}
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-bold ${selectedOrder?.id === order.id ? 'text-beige-300' : 'text-beige-400'}`}>
                      <Clock size={14} className="opacity-50" />
                      {order.time}
                  </div>
                </div>
                <ChevronRight size={20} className={`transition-transform duration-300 ${selectedOrder?.id === order.id ? 'translate-x-1' : 'opacity-0'}`} />
            </div>
          </motion.div>
        ))}

        {sortedOrders.length === 0 && (
           <div className="py-24 text-center">
             <div className="bg-beige-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-beige-300">
                <Inbox size={40} />
             </div>
             <h3 className="serif text-2xl text-beige-800 mb-2">No active requests</h3>
             <p className="text-beige-400">All caught up! Check back later.</p>
           </div>
        )}
      </div>

      <div className="w-1/2 sticky top-24 h-fit">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div 
              key={selectedOrder.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[50px] p-10 space-y-8 border border-beige-100 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-beige-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
              
              <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <h2 className="serif text-4xl italic font-bold text-beige-900 leading-tight">{selectedOrder.userName}</h2>
                    {/* ── FIX: event name shown prominently in detail panel ── */}
                    {selectedOrder.eventName && (
                      <p className="text-beige-900 font-bold text-lg italic">
                        "{selectedOrder.eventName}"
                      </p>
                    )}
                    <p className="text-[10px] text-beige-400 font-bold uppercase tracking-[0.2em]">{selectedOrder.userEmail}</p>
                    <p className="text-xs text-beige-500 flex items-center gap-2 pt-2"><Clock size={14} /> Requested {formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ height: 0, scaleY: 0 }}
                  animate={{ height: 'auto', scaleY: 1 }}
                  className="bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-start gap-4 text-red-600 shadow-sm"
                >
                  <AlertTriangle className="shrink-0 mt-1" size={20} />
                  <div>
                    <h5 className="font-bold text-sm uppercase tracking-wider mb-1">Scheduling Conflict</h5>
                    <p className="text-sm font-medium leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-8 py-8 border-y border-beige-50">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-beige-300 tracking-widest mb-1">Event Type</p>
                      <p className="text-lg font-bold text-beige-800">{selectedOrder.service} — {selectedOrder.eventType || 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-sm font-bold flex items-center gap-3 text-beige-900 uppercase tracking-tighter">
                          <MapPin size={18} className="text-beige-800 shrink-0" />
                          <span className="line-clamp-2">{selectedOrder.address}</span>
                       </p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <div className="bg-beige-50 p-4 rounded-3xl inline-block border border-beige-100 text-right">
                      <div className="flex items-center gap-3 justify-end text-sm font-bold mb-1">
                        {formatDate(selectedOrder.date)} <Calendar size={16} className="text-beige-800" />
                      </div>
                      <div className="flex items-center gap-3 justify-end text-sm font-bold">
                        {selectedOrder.time} <Clock size={16} className="text-beige-800" />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-beige-400">
                    <Package size={14} className="text-beige-800" /> Menu Selection ({selectedOrder.items.length})
                  </h4>
                  <div className="bg-beige-50 rounded-[32px] p-8 max-h-52 overflow-y-auto custom-scrollbar space-y-4 border border-beige-100">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm items-center pb-3 border-b border-beige-100 last:border-none">
                        <span className="text-beige-800 font-bold">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-beige-400">x{item.quantity}</span>
                          <span className="bg-white px-3 py-1 rounded-full font-black text-beige-700 text-[10px]">
                            ₱{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedOrder.customRequests && (
                       <div className="pt-4 mt-4">
                          <p className="text-[10px] uppercase font-bold text-beige-300 tracking-[0.2em] mb-3">Custom Client Requests</p>
                          <p className="text-sm italic text-beige-600 bg-white p-5 rounded-2xl border border-beige-100 line-relaxed">"{selectedOrder.customRequests}"</p>
                       </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center px-2 pt-2">
                    <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">Total Price</span>
                    <span className="text-2xl font-black text-beige-900">
                      ₱{(selectedOrder.totalPrice || selectedOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0)).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">70% Down Payment</span>
                    <span className="text-sm font-black text-amber-600">
                      ₱{Math.ceil((selectedOrder.totalPrice || selectedOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0)) * 0.7).toLocaleString()}
                    </span>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => navigate('/dashboard/admin-chat', { state: { userId: selectedOrder.userId, userName: selectedOrder.userName } })}
                  className="p-5 bg-white border border-beige-100 rounded-[24px] text-beige-800 hover:bg-beige-50 transition-all shadow-sm active:scale-95"
                >
                  <MessageCircle size={24} />
                </button>
                <button 
                  onClick={() => handleDecline(selectedOrder)}
                  className="flex-1 flex items-center justify-center gap-2 p-5 bg-red-50 text-red-500 rounded-[24px] font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-all active:scale-95"
                >
                  <X size={20} /> Decline Order
                </button>
                <button 
                  onClick={() => handleApprove(selectedOrder)}
                  className="flex-[1.5] flex items-center justify-center gap-2 p-5 bg-beige-900 text-white rounded-[24px] font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  <Check size={20} /> Approve Booking
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-[700px] flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-beige-100 rounded-[60px]">
              <div className="w-24 h-24 bg-beige-50 rounded-full flex items-center justify-center mb-8 text-beige-100">
                <Inbox size={64} />
              </div>
              <h3 className="serif text-3xl mb-4 text-beige-300 italic">Awaiting Engagement</h3>
              <p className="text-beige-400 max-w-xs leading-relaxed font-medium">Please select a request from the list to review event details, check for scheduling conflicts, and manage the booking status.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}