import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    CheckCircle2, 
    XCircle, 
    Calendar, 
    Clock, 
    MapPin, 
    History,
    ChevronDown,
    ChevronUp,
    Search,
    ArrowUpDown,
    Package
} from 'lucide-react';
import { format } from 'date-fns';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';

export default function FinalizedHistory({ searchTerm }) {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('status', 'in', ['Done', 'Denied']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedHistory = [...history].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (sortConfig.key === 'date' || sortConfig.key === 'createdAt') {
       aVal = aVal instanceof Timestamp ? aVal.toDate() : (aVal?.seconds ? new Date(aVal.seconds * 1000) : new Date(aVal));
       bVal = bVal instanceof Timestamp ? bVal.toDate() : (bVal?.seconds ? new Date(bVal.seconds * 1000) : new Date(bVal));
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  }).filter(o => 
    o.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.includes(searchTerm) ||
    (o.eventName && o.eventName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (date) => {
    if (date instanceof Timestamp) return format(date.toDate(), 'MMM dd, yyyy');
    if (date?.seconds) return format(new Date(date.seconds * 1000), 'MMM dd, yyyy');
    if (typeof date === 'string') return format(new Date(date), 'MMM dd, yyyy');
    return 'Invalid Date';
  };

  const formatDateTime = (date) => {
    if (date instanceof Timestamp) return format(date.toDate(), 'PPP p');
    if (date?.seconds) return format(new Date(date.seconds * 1000), 'PPP p');
    if (typeof date === 'string') return format(new Date(date), 'PPP p');
    return 'Invalid Date';
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400 font-mono tracking-widest text-[10px]">RECALLING ARCHIVES...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="serif text-5xl font-bold italic text-beige-900 leading-tight">Finalized History</h1>
          <p className="text-[10px] font-black text-beige-400 uppercase tracking-[0.4em]">The chronicle of fulfilled legacies</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-beige-900 text-white px-6 py-4 rounded-[20px] shadow-xl text-xs font-black tracking-widest uppercase flex items-center gap-3">
              <History size={18} />
              {history.length} Total Records
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[50px] border border-beige-100 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                  <tr className="bg-beige-50/50 border-b border-beige-100">
                      <th className="p-8 cursor-pointer group" onClick={() => handleSort('id')}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-beige-400 group-hover:text-beige-900 transition-colors">
                          Order ID <ArrowUpDown size={12} className={sortConfig.key === 'id' ? 'text-beige-900' : 'text-beige-200'} />
                        </div>
                      </th>
                      <th className="p-8 cursor-pointer group" onClick={() => handleSort('userName')}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-beige-400 group-hover:text-beige-900 transition-colors">
                          Client Name <ArrowUpDown size={12} className={sortConfig.key === 'userName' ? 'text-beige-900' : 'text-beige-200'} />
                        </div>
                      </th>
                      <th className="p-8 cursor-pointer group" onClick={() => handleSort('date')}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-beige-400 group-hover:text-beige-900 transition-colors">
                          Event Date <ArrowUpDown size={12} className={sortConfig.key === 'date' ? 'text-beige-900' : 'text-beige-200'} />
                        </div>
                      </th>
                      <th className="p-8 cursor-pointer group" onClick={() => handleSort('service')}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-beige-400 group-hover:text-beige-900 transition-colors">
                          Service Type <ArrowUpDown size={12} className={sortConfig.key === 'service' ? 'text-beige-900' : 'text-beige-200'} />
                        </div>
                      </th>
                      <th className="p-8 cursor-pointer group" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-beige-400 group-hover:text-beige-900 transition-colors">
                          Outcome <ArrowUpDown size={12} className={sortConfig.key === 'status' ? 'text-beige-900' : 'text-beige-200'} />
                        </div>
                      </th>
                      <th className="p-8"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-beige-50">
                  {sortedHistory.map((order) => (
                      <React.Fragment key={order.id}>
                          <tr 
                              className={`group hover:bg-beige-50/20 transition-all duration-300 cursor-pointer ${expandedId === order.id ? 'bg-beige-50/40' : ''}`}
                              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                          >
                              <td className="p-8 text-xs font-bold text-beige-300 tracking-widest uppercase">#{order.id.slice(-6)}</td>
                              <td className="p-8">
                                <div className="space-y-1">
                                  <p className="font-bold text-beige-900 text-lg leading-none">{order.userName}</p>
                                  <p className="text-[10px] text-beige-400 tracking-tight font-medium uppercase italic leading-none">{order.eventName || 'Unnamed Celebration'}</p>
                                </div>
                              </td>
                              <td className="p-8 text-sm font-bold text-beige-700">{formatDate(order.date)}</td>
                              <td className="p-8">
                                  <span className="px-5 py-2 rounded-full bg-beige-50 border border-beige-100 text-[10px] font-black uppercase tracking-tighter text-beige-500 shadow-sm transition-all group-hover:bg-white group-hover:border-beige-200">
                                      {order.service}
                                  </span>
                              </td>
                              <td className="p-8">
                                  <div className={`flex items-center gap-3 px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-inner ${
                                      order.status === 'Done' ? 'text-green-600 bg-green-50/50' : 'text-red-500 bg-red-50/50'
                                  }`}>
                                      {order.status === 'Done' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                      {order.status === 'Done' ? 'Fulfillment' : 'Denied'}
                                  </div>
                              </td>
                              <td className="p-8 text-beige-200 group-hover:text-beige-900 transition-all">
                                  {expandedId === order.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                              </td>
                          </tr>
                          <AnimatePresence>
                            {expandedId === order.id && (
                                <tr className="bg-beige-50/10 backdrop-blur-md">
                                    <td colSpan="6" className="p-0 border-b border-beige-100 overflow-hidden">
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="p-12 grid grid-cols-1 md:grid-cols-4 gap-12"
                                        >
                                            <div className="space-y-4 md:col-span-1">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-beige-300">Deployment Logistics</h5>
                                                <div className="space-y-5">
                                                  <div className="flex gap-4 items-start">
                                                      <MapPin size={20} className="text-beige-800 shrink-0" />
                                                      <div>
                                                         <p className="text-[10px] font-black text-beige-300 uppercase tracking-widest">Address</p>
                                                         <p className="text-sm font-bold text-beige-900 italic">"{order.address}"</p>
                                                      </div>
                                                  </div>
                                                  <div className="flex gap-4 items-start">
                                                      <Clock size={20} className="text-beige-800 shrink-0" />
                                                      <div>
                                                         <p className="text-[10px] font-black text-beige-300 uppercase tracking-widest">Timing</p>
                                                         <p className="text-sm font-bold text-beige-900">{order.time}</p>
                                                      </div>
                                                  </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6 md:col-span-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-beige-300">Culinary Specifications</h5>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {order.items.map((it, i) => (
                                                        <div key={i} className="bg-white p-4 rounded-2xl border border-beige-100 shadow-sm flex items-center justify-between">
                                                            <span className="text-xs font-bold text-beige-800">{it.name}</span>
                                                            <span className="text-[10px] font-black text-beige-300 italic">x{it.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {order.customRequests && (
                                                   <div className="pt-4 border-t border-beige-50">
                                                      <p className="text-[10px] text-beige-300 font-black uppercase tracking-widest mb-3">Custom Requirement Trace</p>
                                                      <p className="text-xs font-medium text-beige-500 bg-white p-6 rounded-[30px] border border-beige-100 italic leading-relaxed">
                                                         {order.customRequests}
                                                      </p>
                                                   </div>
                                                )}
                                            </div>

                                            <div className="space-y-4 text-right md:col-span-1">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-beige-300">Archive Metadata</h5>
                                                <div className="space-y-2">
                                                  <p className="text-[10px] font-bold text-beige-400 uppercase tracking-widest">Entry Finalized</p>
                                                  <p className="text-sm font-black text-beige-800">{formatDateTime(order.updatedAt || order.createdAt)}</p>
                                                </div>
                                                <div className="pt-8">
                                                   <div className="inline-block p-4 bg-white rounded-3xl border border-beige-100 shadow-sm">
                                                      <Package size={24} className="text-beige-900" />
                                                   </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </td>
                                </tr>
                            )}
                          </AnimatePresence>
                      </React.Fragment>
                  ))}
              </tbody>
          </table>
        </div>

        {sortedHistory.length === 0 && (
           <div className="py-40 text-center flex flex-col items-center justify-center">
             <div className="w-24 h-24 bg-beige-50 rounded-full flex items-center justify-center mb-8 border-4 border-dashed border-beige-100 text-beige-100">
                <History size={64} />
             </div>
             <h3 className="serif text-3xl mb-4 italic text-beige-300 tracking-tight">The archive stands pristine</h3>
             <p className="text-beige-400 max-w-sm leading-relaxed font-medium">No finalized entries match your current parameters. Please adjust filters or allow time for fulfillments.</p>
           </div>
        )}
      </div>
    </div>
  );
}
