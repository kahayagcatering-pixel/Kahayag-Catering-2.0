import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { isSameDay, format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, MapPin } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';

export default function AdminCalendar() {
  const [date, setDate] = useState(new Date());
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [selectedDayOrder, setSelectedDayOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'Approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApprovedOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const found = approvedOrders.find(o => {
      const d = o.date instanceof Timestamp ? o.date.toDate() : new Date(o.date);
      return isSameDay(d, date);
    });
    setSelectedDayOrder(found || null);
  }, [date, approvedOrders]);

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (approvedOrders.find(o => {
        const d = o.date instanceof Timestamp ? o.date.toDate() : new Date(o.date);
        return isSameDay(d, date);
      })) {
        return 'date-taken';
      }
      return 'date-available';
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading calendar...</div>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="serif text-4xl mb-2">Booking Calendar</h1>
        <p className="text-beige-500">Monitor all scheduled and available dates.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
            <div className="bg-white p-10 rounded-[40px] border border-beige-200 shadow-xl overflow-hidden min-h-[500px]">
                <Calendar 
                    onChange={setDate} 
                    value={date} 
                    tileClassName={tileClassName}
                    className="admin-calendar-large"
                />
                <div className="mt-10 flex gap-8 text-xs font-bold justify-center border-t border-beige-50 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-beige-600 uppercase tracking-widest">Available</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                        <span className="text-beige-600 uppercase tracking-widest">Booked</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="card-luxury p-8">
                <h3 className="display text-sm font-bold border-b border-beige-100 pb-4 mb-6 uppercase tracking-wider text-beige-400 font-mono">
                    Details for {format(date, 'MMM dd, yyyy')}
                </h3>
                
                <AnimatePresence mode="wait">
                    {selectedDayOrder ? (
                        <motion.div 
                            key={selectedDayOrder.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-beige-900 rounded-2xl flex items-center justify-center text-white font-bold">
                                    {(selectedDayOrder.userName || 'U').charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-lg truncate">{selectedDayOrder.userName}</h4>
                                    <p className="text-xs text-beige-500 truncate">{selectedDayOrder.service} • {selectedDayOrder.eventType || 'Standard'}</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-beige-50">
                                <div className="flex items-start gap-4 text-sm">
                                    <Clock size={18} className="text-beige-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-beige-400">Time</p>
                                        <p className="font-semibold">{selectedDayOrder.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 text-sm">
                                    <MapPin size={18} className="text-beige-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-beige-400">Location</p>
                                        <p className="font-semibold line-clamp-2">{selectedDayOrder.address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button className="w-full btn-luxury gap-2 text-xs py-3">
                                    View Full Details
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="no-order"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-20 text-center opacity-40 flex flex-col items-center"
                        >
                            <AlertCircle size={48} className="mb-4 text-beige-200" />
                            <p className="serif italic text-xl">No approved orders</p>
                            <p className="text-xs mt-2">This date is currently open for bookings.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="bg-beige-900 rounded-[32px] p-8 text-white">
                <h4 className="serif text-xl mb-4 italic">Quick Overview</h4>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-beige-400">Total Bookings</span>
                        <span className="font-bold">{approvedOrders.length}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
