import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, differenceInDays } from 'date-fns';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  MapPin, 
  ShoppingBag,
  Calendar as CalendarIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, Timestamp } from 'firebase/firestore';

const EVENT_TYPES = ['Fiesta', 'Wedding', 'Birthday', 'Corporate', 'Debut', 'Anniversary', 'Reunion', 'Graduation', 'Others'];

export default function StartOrder({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null); // 'Packed lunch' or 'Events'
  const [eventType, setEventType] = useState(null);
  const [otherEventName, setOtherEventName] = useState('');
  const [eventName, setEventName] = useState('');
  const [selectedFood, setSelectedFood] = useState([]); // { foodId, quantity }
  const [customRequests, setCustomRequests] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [foods, setFoods] = useState([]);
  const [takenDates, setTakenDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    // Listen for food
    const unsubscribeFood = onSnapshot(collection(db, 'foods'), (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'foods'));

    // Listen for approved orders to block dates
    const qOrders = query(collection(db, 'orders'), where('status', '==', 'Approved'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const dates = snapshot.docs
        .map(doc => doc.data())
        .map(order => {
          const d = order.date instanceof Timestamp ? order.date.toDate() : new Date(order.date);
          return d;
        });
      setTakenDates(dates);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    return () => {
      unsubscribeFood();
      unsubscribeOrders();
    };
  }, []);

  const addFood = (food) => {
    setSelectedFood(prev => {
      const existing = prev.find(f => f.foodId === food.id);
      if (existing) return prev;
      return [...prev, { 
        foodId: food.id, 
        name: food.name, 
        price: food.price, 
        quantity: service === 'Packed lunch' ? 15 : 1,
        imageUrl: food.imageUrl
      }];
    });
  };

  const updateQuantity = (id, delta) => {
    setSelectedFood(prev => prev.map(f => {
      if (f.foodId === id) {
        const minQty = service === 'Packed lunch' ? 15 : 1;
        const newQty = Math.max(minQty, f.quantity + delta);
        return { ...f, quantity: newQty };
      }
      return f;
    }));
  };

  const removeFood = (id) => {
    setSelectedFood(prev => prev.filter(f => f.foodId !== id));
  };

  const validateStep2 = () => {
    if (service === 'Events') {
      return selectedFood.length >= 6;
    } else {
      return selectedFood.length > 0 && selectedFood.every(f => f.quantity >= 15);
    }
  };

  const handleSubmitOrder = async () => {
    const orderData = {
      userId: user.uid,
      userName: user.name || user.displayName || 'Guest',
      userEmail: user.email,
      eventName: eventName,
      service,
      eventType: eventType === 'Others' ? otherEventName : eventType,
      items: selectedFood,
      customRequests,
      date: Timestamp.fromDate(date),
      time,
      address,
      status: 'Waiting',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      navigate('/dashboard/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (takenDates.find(d => isSameDay(d, date))) {
        return 'date-taken !bg-red-100 !text-red-800 font-bold';
      }
      if (date < new Date(new Date().setHours(0,0,0,0))) {
        return 'opacity-20 grayscale cursor-not-allowed';
      }
      return 'date-available !bg-green-100 !text-green-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Initializing kitchen...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="serif text-5xl mb-2 italic">Start Your Culinary Journey</h1>
          <p className="text-beige-500 font-medium">Follow our simple 3-step process to book your event.</p>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 w-16 rounded-full transition-all duration-500 ${step >= i ? 'bg-beige-800' : 'bg-beige-200'}`}></div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <h2 className="display text-xl font-bold text-center mb-12 uppercase tracking-widest text-beige-400">Choose Your Service Type</h2>
            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {[
                { type: 'Packed lunch', icon: <ShoppingBag size={48} />, desc: 'Individual meals perfect for offices or small gatherings. Minimum of 15 orders per food item.' },
                { type: 'Events', icon: <CalendarIcon size={48} />, desc: 'Full catering trays for grand celebrations. Minimum of 6 dish choices required.' }
              ].map(item => (
                <button 
                  key={item.type}
                  onClick={() => { setService(item.type); setStep(2); }}
                  className={`group relative bg-white border border-beige-100 rounded-[48px] p-12 text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${service === item.type ? 'ring-4 ring-beige-800 shadow-xl' : 'shadow-lg'}`}
                >
                  <div className="w-24 h-24 bg-beige-50 rounded-full flex items-center justify-center text-beige-800 mb-8 mx-auto group-hover:scale-110 transition-transform duration-500">
                    {item.icon}
                  </div>
                  <h3 className="serif text-3xl mb-4 italic font-bold">{item.type}</h3>
                  <p className="text-beige-500 leading-relaxed text-sm">{item.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-12"
          >
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <div className="space-y-6">
                  <h2 className="display text-lg font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-beige-800 text-white flex items-center justify-center text-xs">1</span>
                    Event Details
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">Event Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. John's 25th Birthday"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="w-full bg-white border border-beige-100 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
                      />
                    </div>
                    {service === 'Events' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">Occasion Type</label>
                        <select 
                          value={eventType || ''}
                          onChange={(e) => setEventType(e.target.value)}
                          className="w-full bg-white border border-beige-100 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
                        >
                          <option value="" disabled>Select event type</option>
                          {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  {eventType === 'Others' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">Specify Event</label>
                      <input 
                        type="text"
                        placeholder="What celebration is this?"
                        value={otherEventName}
                        onChange={(e) => setOtherEventName(e.target.value)}
                        className="w-full bg-white border border-beige-100 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h2 className="display text-lg font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-beige-800 text-white flex items-center justify-center text-xs">2</span>
                    Curate Your Menu
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {foods.filter(f => f.category === service || f.category === 'Both').map(food => (
                      <div key={food.id} className="group bg-white p-4 rounded-3xl border border-beige-100 flex gap-4 items-center hover:shadow-lg transition-all duration-300">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-beige-50 flex-shrink-0">
                          <img src={food.imageUrl || `https://source.unsplash.com/200x200/?food`} alt={food.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-beige-900 truncate">{food.name}</p>
                          <p className="text-[10px] text-beige-400 font-bold uppercase tracking-tighter mb-1">{food.type}</p>
                          <p className="text-sm font-bold text-beige-800">₱{food.price}</p>
                        </div>
                        <button 
                          onClick={() => addFood(food)}
                          disabled={selectedFood.some(f => f.foodId === food.id)}
                          className="p-3 bg-beige-50 text-beige-800 rounded-2xl hover:bg-beige-800 hover:text-white disabled:opacity-30 transition-all shadow-sm"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white rounded-[40px] p-8 border border-beige-100 shadow-xl sticky top-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="serif text-2xl italic font-bold">Your Tray</h3>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${validateStep2() ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                      {service === 'Events' ? `${selectedFood.length}/6 Dishes` : 'Min 15 qty/item'}
                    </div>
                  </div>

                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 mb-8 custom-scrollbar">
                    {selectedFood.length === 0 && (
                      <div className="py-20 text-center space-y-4 opacity-30">
                        <ShoppingBag size={40} className="mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-widest">Bag is Empty</p>
                      </div>
                    )}
                    {selectedFood.map(item => (
                      <div key={item.foodId} className="flex gap-4 items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-beige-900 truncate uppercase tracking-tight">{item.name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2 bg-beige-50 px-3 py-1 rounded-xl border border-beige-100">
                              <button onClick={() => updateQuantity(item.foodId, -1)} className="text-beige-400 hover:text-beige-800"><div className="w-3 h-0.5 bg-current"></div></button>
                              <span className="text-xs font-black text-beige-900 w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.foodId, 1)} className="text-beige-400 hover:text-beige-800"><Plus size={14} /></button>
                            </div>
                            <span className="text-xs font-bold text-beige-400">× ₱{item.price}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFood(item.foodId)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-beige-100">
                    <p className="text-[10px] font-bold text-beige-400 uppercase tracking-widest">Custom Requests</p>
                    <textarea 
                      placeholder="e.g. 'Food' - 'Qty'" 
                      value={customRequests}
                      onChange={(e) => setCustomRequests(e.target.value)}
                      className="w-full p-4 bg-beige-50 border border-beige-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-beige-400 min-h-[80px] resize-none"
                    />
                    
                    <button 
                      onClick={() => setStep(3)}
                      disabled={!validateStep2() || (service === 'Events' && !eventType) || !eventName}
                      className="w-full btn-luxury flex items-center justify-center gap-2 py-4 disabled:opacity-50 mt-4 active:scale-95"
                    >
                      Logistics <ChevronRight size={18} />
                    </button>
                    <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-beige-400 hover:text-beige-600 transition-colors py-2 uppercase tracking-widest">Change Service</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-12"
          >
            <div className="grid lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <h2 className="display text-xl font-bold flex items-center gap-3">
                  <CalendarIcon size={24} className="text-beige-800" /> 
                  Reservation Calendar
                </h2>
                <div className="bg-white p-10 rounded-[48px] border border-beige-100 shadow-xl">
                  <Calendar 
                    onChange={setDate} 
                    value={date} 
                    tileClassName={tileClassName}
                    minDate={new Date(new Date().setDate(new Date().getDate() + 3))} // Recommend 3 days advance
                    className="!w-full border-none"
                  />
                  <div className="mt-10 flex flex-wrap gap-8 text-[10px] font-bold uppercase tracking-[0.2em] justify-center">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-green-100 border border-green-200"></div> Available</div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-red-100 border border-red-200"></div> Fully Booked</div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <h2 className="display text-xl font-bold flex items-center gap-3">
                    <Clock size={24} className="text-beige-800" /> 
                    Order Specifics
                  </h2>
                  <div className="grid gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">Delivery Time</label>
                       <div className="relative">
                        <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-beige-400" size={20} />
                        <input 
                          type="time" 
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full pl-16 pr-6 py-5 bg-white border border-beige-100 rounded-[32px] focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">Delivery Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-6 top-7 text-beige-400" size={20} />
                        <textarea 
                          placeholder="Full address for delivery" 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-16 pr-6 py-6 bg-white border border-beige-100 rounded-[32px] focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm min-h-[160px] resize-none font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-beige-900 rounded-[48px] p-10 text-white shadow-2xl">
                  <h3 className="serif text-3xl mb-8 italic">Final Review</h3>
                  <div className="space-y-5 mb-10">
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-beige-400">Total Selection</span>
                      <span className="font-bold">{selectedFood.length} DELICACIES</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-beige-400">Event Date</span>
                      <span className="font-bold">{format(date, 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-beige-400">Location</span>
                      <span className="font-bold truncate max-w-[200px]">{address || 'Required*'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPolicy(true)}
                    disabled={!time || !address || isSameDay(date, new Date())}
                    className="w-full btn-luxury !bg-white !text-beige-900 hover:!bg-beige-50 flex items-center justify-center gap-2 py-5 shadow-lg active:scale-95 disabled:opacity-30 disabled:hover:!bg-white"
                  >
                    Confirm Submission <Check size={20} />
                  </button>
                  {isSameDay(date, new Date()) && <p className="text-[10px] text-red-300 mt-2 text-center uppercase tracking-widest font-bold">Orders must be placed in advance</p>}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setStep(2)}
              className="group flex items-center gap-2 text-beige-400 hover:text-beige-800 transition-all font-bold uppercase tracking-widest text-xs"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Edit Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Policy Modal */}
      <AnimatePresence>
        {showPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-beige-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[60px] p-12 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setShowPolicy(false)} className="p-2 hover:bg-beige-50 rounded-full transition-colors text-beige-400">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-beige-100 rounded-[32px] flex items-center justify-center text-beige-800 mb-8">
                  <AlertCircle size={40} />
                </div>
                <h2 className="serif text-4xl mb-6 italic">Our Booking Policies</h2>
                
                <div className="space-y-6 text-left mb-10 bg-beige-50 p-8 rounded-[40px] border border-beige-100">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed font-semibold">
                      Payment transactions will be finalized and managed through our integrated chat system.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed">
                      A <span className="font-bold text-beige-900 underline">70% non-refundable down payment</span> is required to secure your booking.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed">
                      <span className="font-bold text-beige-900">Cancellation Policy:</span> Must be requested at least <span className="font-bold">3 days prior</span> to the event. Beyond this window, the down payment will be forfeited.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed italic">
                      Special Note: For early morning or midnight events (11PM - 8AM), cancellations on the event day are strictly prohibited.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={handleSubmitOrder}
                    className="flex-1 btn-luxury py-5 shadow-xl shadow-beige-800/20 active:scale-95"
                  >
                    I Understand & Submit Order
                  </button>
                  <button 
                    onClick={() => setShowPolicy(false)}
                    className="flex-1 btn-outline-luxury py-5 active:scale-95"
                  >
                    Review Details
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
