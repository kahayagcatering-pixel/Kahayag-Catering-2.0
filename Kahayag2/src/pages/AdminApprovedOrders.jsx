import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
    CheckCircle, 
    MessageCircle, 
    Calendar, 
    Clock, 
    MapPin, 
    AlertCircle,
    Check,
    Trash2,
    Menu,
    X
} from 'lucide-react';
import { format, isSameDay, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';

export default function ApprovedOrders({ searchTerm }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('status', '==', 'Approved'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsDone = async (order) => {
    const orderDate = order.date instanceof Timestamp ? order.date.toDate() : new Date(order.date);
    const canComplete = isSameDay(orderDate, now) || isAfter(now, orderDate);
    
    if (!canComplete) {
        alert("You can only mark an order as 'Done' on or after the scheduled date.");
        return;
    }

    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'Done', updatedAt: Timestamp.now() });
      setSelectedOrder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!confirm("Are you sure you want to cancel this approved order? This will move it back to the history as Denied.")) return;
    
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'Denied', updatedAt: Timestamp.now() });
      setSelectedOrder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm) ||
    (o.eventName && o.eventName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const parseOrderDate = (date) => {
    if (date instanceof Timestamp) return date.toDate();
    return new Date(date);
  };

  const getTotal = (order) =>
    order.totalPrice || order.items.reduce((s, i) => s + (i.price * i.quantity), 0);

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading schedule...</div>;

  return (
    <div className="flex gap-8 h-full relative">
      {/* Mobile hamburger menu */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-beige-900 text-white rounded-lg lg:hidden"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${
          isMobile
            ? `fixed left-0 top-0 h-full w-3/4 bg-white z-40 transform transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } pt-16 overflow-y-auto custom-scrollbar`
            : 'w-1/2 space-y-6 overflow-y-auto pr-2 custom-scrollbar'
        } space-y-6`}
      >
        <div className={`${isMobile ? 'px-4 space-y-6' : ''} flex flex-col gap-6`}>
          <div className="flex justify-between items-center mb-4">
              <h1 className="serif text-3xl">Approved Schedule</h1>
              <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-beige-400">Current System Time</p>
                  <p className="text-sm font-bold text-beige-800">{format(now, 'PPP p')}</p>
              </div>
          </div>

          {filteredOrders.map((order, idx) => (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => {
                setSelectedOrder(order);
                if (isMobile) setSidebarOpen(false);
              }}
              className={`cursor-pointer p-6 rounded-[24px] border transition-all duration-300 ${
                  selectedOrder?.id === order.id 
                  ? 'bg-beige-900 text-white border-beige-900 shadow-xl scale-[1.02]' 
                  : 'bg-white border-beige-100 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                          <h3 className="font-bold">{order.userName}</h3>
                          <p className={`text-xs font-bold italic ${selectedOrder?.id === order.id ? 'text-beige-300' : 'text-beige-600'}`}>
                            {order.eventName || '—'}
                          </p>
                          <p className={`text-[10px] uppercase font-bold ${selectedOrder?.id === order.id ? 'text-beige-400' : 'text-beige-500'}`}>
                            {order.eventType || order.service}
                          </p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className={`text-sm font-bold ${selectedOrder?.id === order.id ? 'text-white' : 'text-beige-900'}`}>
                        {format(parseOrderDate(order.date), 'MMM dd')}
                      </p>
                      <p className="text-xs opacity-60">{order.time}</p>
                  </div>
              </div>
            </motion.div>
          ))}

          {filteredOrders.length === 0 && (
             <div className="py-20 text-center opacity-40">
               <CheckCircle size={48} className="mx-auto mb-4" />
               <p>No active schedule at the moment.</p>
             </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'}`}>
        {selectedOrder ? (
          <motion.div 
            key={selectedOrder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card-luxury p-10 space-y-8 ${isMobile ? '' : 'sticky top-0'} overflow-y-auto`}
          >
            <div className="flex justify-between items-start">
               <div>
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">Order Approved</span>
                 <h2 className="serif text-3xl">{selectedOrder.userName}</h2>
                 {selectedOrder.eventName && (
                   <p className="text-beige-900 font-bold text-lg mt-1 italic">
                     "{selectedOrder.eventName}"
                   </p>
                 )}
                 <p className="text-beige-500 text-sm italic mt-1">
                   {selectedOrder.service} package
                   {selectedOrder.eventType ? ` — ${selectedOrder.eventType}` : ''}
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-beige-100">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-beige-50 rounded-xl text-beige-800"><Calendar size={18} /></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-beige-400">Scheduled Date</p>
                            <p className="text-sm font-bold">{format(parseOrderDate(selectedOrder.date), 'PPP')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-beige-50 rounded-xl text-beige-800"><Clock size={18} /></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-beige-400">Scheduled Time</p>
                            <p className="text-sm font-bold">{selectedOrder.time}</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-beige-50 rounded-xl text-beige-800"><MapPin size={18} /></div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-beige-400">Venue / Location</p>
                            <p className="text-sm font-bold line-clamp-2">{selectedOrder.address}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
               <h3 className="font-bold text-sm">Dishes to Prepare</h3>

               <div className="bg-beige-50 rounded-[24px] p-6 space-y-3 border border-beige-100">
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
               </div>

               <div className="flex justify-between items-center px-2 pt-2">
                 <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">Total Price</span>
                 <span className="text-2xl font-black text-beige-900">
                   ₱{getTotal(selectedOrder).toLocaleString()}
                 </span>
               </div>

               <div className="flex justify-between items-center px-2">
                 <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">70% Down Payment</span>
                 <span className="text-sm font-black text-amber-600">
                   ₱{Math.ceil(getTotal(selectedOrder) * 0.7).toLocaleString()}
                 </span>
               </div>
            </div>

            <div className="flex flex-col gap-4 pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <button 
                      onClick={() => navigate('/dashboard/admin-chat', { state: { userId: selectedOrder.userId } })}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white border border-beige-200 rounded-2xl font-bold hover:bg-beige-50 transition-all shadow-sm"
                    >
                      <MessageCircle size={20} /> Chat
                    </button>
                    <button 
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={20} /> Cancel Order
                    </button>
                </div>
                <button 
                  onClick={() => handleMarkAsDone(selectedOrder)}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-5 rounded-2xl font-bold transition-all shadow-lg ${
                    isSameDay(parseOrderDate(selectedOrder.date), now) || isAfter(now, parseOrderDate(selectedOrder.date))
                    ? 'bg-beige-900 text-white hover:bg-black'
                    : 'bg-beige-200 text-beige-500 cursor-not-allowed'
                  }`}
                >
                  <Check size={20} /> Mark as Done
                </button>
            </div>
            {!(isSameDay(parseOrderDate(selectedOrder.date), now) || isAfter(now, parseOrderDate(selectedOrder.date))) && (
                <p className="text-[10px] text-center text-red-400 font-bold uppercase flex items-center justify-center gap-1 mt-2">
                    <AlertCircle size={12} /> Only available on or after the scheduled date
                </p>
            )}
          </motion.div>
        ) : (
          <div className="h-[600px] flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-beige-200 rounded-[40px] opacity-40">
            <CheckCircle size={64} className="mb-6" />
            <h3 className="serif text-2xl mb-2">Select an approved order</h3>
            <p className="text-sm">Manage final logistics and completion here.</p>
          </div>
        )}
      </div>
    </div>
  );
}