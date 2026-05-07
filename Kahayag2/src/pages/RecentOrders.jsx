import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  MessageCircle, 
  X,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function RecentOrders({ user }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Denied': return 'bg-red-100 text-red-700 border-red-200';
      case 'Waiting': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Done': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-beige-100 text-beige-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 size={14} />;
      case 'Denied': return <XCircle size={14} />;
      case 'Waiting': return <Clock3 size={14} />;
      case 'Done': return <CheckCircle2 size={14} />;
      default: return null;
    }
  };

  const formatDate = (date) => {
    if (date instanceof Timestamp) return format(date.toDate(), 'PPP');
    if (date?.seconds) return format(new Date(date.seconds * 1000), 'PPP');
    if (typeof date === 'string') return format(new Date(date), 'PPP');
    return 'Invalid Date';
  };

  const canCancelSelf = (date) => {
    const orderDate = date instanceof Timestamp ? date.toDate() : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date));
    const today = startOfDay(new Date());
    const serviceDate = startOfDay(orderDate);
    return differenceInDays(serviceDate, today) >= 3;
  };

  const handleCancelClick = async (order) => {
    if (canCancelSelf(order.date)) {
      if (window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
        try {
          await deleteDoc(doc(db, 'orders', order.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `orders/${order.id}`);
        }
      }
    } else {
      setCancellingOrder(order);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading orders...</div>;

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="serif text-4xl mb-2 italic">Order History</h1>
        <p className="text-beige-500 font-medium">Track your culinary events and manage your bookings.</p>
      </div>

      <div className="grid gap-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-[48px] p-24 text-center border border-dashed border-beige-200">
             <div className="bg-beige-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-beige-300">
               <Calendar size={40} />
             </div>
            <h3 className="serif text-2xl text-beige-800 mb-2">No orders yet</h3>
            <p className="text-beige-400 mb-8">Your future delicious moments will appear here.</p>
            <button onClick={() => navigate('/dashboard/start')} className="btn-luxury">Start My First Order</button>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              className="bg-white rounded-[40px] border border-beige-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500"
            >
              <div className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-widest flex items-center gap-2 ${getStatusStyle(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                    <span className="text-[10px] text-beige-300 font-bold uppercase tracking-widest">Order ID: {order.id.slice(-6)}</span>
                    <span className="text-[10px] text-beige-300 font-bold uppercase tracking-widest">•</span>
                    <span className="text-[10px] text-beige-300 font-bold uppercase tracking-widest">{formatDate(order.createdAt)}</span>
                  </div>
                  
                  <h3 className="serif text-3xl font-bold text-beige-900 leading-tight">
                    {order.eventName || `${order.service}${order.eventType ? ` — ${order.eventType}` : ''}`}
                  </h3>

                  <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-semibold text-beige-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2"><Calendar size={16} className="text-beige-300" /> {formatDate(order.date)}</div>
                    <div className="flex items-center gap-2"><Clock size={16} className="text-beige-300" /> {order.time}</div>
                    <div className="flex items-center gap-2"><MapPin size={16} className="text-beige-300" /> <span className="truncate max-w-[200px]">{order.address}</span></div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-beige-50">
                  <button 
                    onClick={() => navigate('/dashboard/chat', { state: { orderId: order.id, userName: 'Admin' } })}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-beige-50 border border-beige-100 rounded-2xl text-beige-800 font-bold text-xs uppercase tracking-widest hover:bg-beige-100 transition-all active:scale-95"
                  >
                    <MessageCircle size={18} /> Chat with Admin
                  </button>
                  <button 
                    onClick={() => handleCancelClick(order)}
                    disabled={order.status === 'Done' || order.status === 'Denied'}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 border border-red-100 bg-red-50 text-red-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 disabled:opacity-30"
                  >
                    <X size={18} /> Cancel
                  </button>
                  <button 
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="p-3 bg-white border border-beige-100 rounded-2xl text-beige-400 hover:text-beige-800 transition-colors shadow-sm"
                  >
                    {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-beige-50/50 border-t border-beige-50 overflow-hidden"
                  >
                    <div className="p-8 grid md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-400">Order Menu</h4>
                        <div className="space-y-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-beige-100 shadow-sm">
                              <span className="font-bold text-sm text-beige-800">{item.name}</span>
                              <span className="text-xs font-black text-beige-400 uppercase tracking-widest">Qty: {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-400">Custom Requests</h4>
                        <div className="bg-white p-6 rounded-[32px] border border-beige-100 shadow-sm text-sm text-beige-600 leading-relaxed italic whitespace-pre-line min-h-[100px]">
                          {order.customRequests || "No specific instructions provided."}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Cancellation Warning Modal */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-beige-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[60px] p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 mx-auto mb-8">
                <AlertTriangle size={40} />
              </div>
              <h3 className="serif text-3xl mb-4 italic font-bold">Cancellation Policy</h3>
              <p className="text-beige-600 mb-8 leading-relaxed">
                You are within the <span className="font-bold text-red-500 underline">3-day threshold</span>. Self-cancellation is no longer possible. 
                <br /><br />
                As per our terms, the <span className="font-bold">70% down payment will be forfeited</span>. Please chat with our Admin to proceed with the cancellation request.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    navigate('/dashboard/chat', { state: { orderId: cancellingOrder.id, initialMessage: `I want to request cancellation for order #${cancellingOrder.id.slice(-6)}. I understand the policy.` } });
                    setCancellingOrder(null);
                  }}
                  className="flex-1 btn-luxury py-4 shadow-xl"
                >
                  Chat with Admin
                </button>
                <button 
                  onClick={() => setCancellingOrder(null)}
                  className="flex-1 btn-outline-luxury py-4"
                >
                  Keep Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
