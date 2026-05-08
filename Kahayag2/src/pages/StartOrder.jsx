import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, addDays } from 'date-fns';
import { 
  ChevronRight, 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  MapPin, 
  ShoppingBag,
  Calendar as CalendarIcon,
  AlertCircle,
  X,
  Info,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, Timestamp } from 'firebase/firestore';

const EVENT_TYPES = ['Fiesta', 'Wedding', 'Birthday', 'Corporate', 'Debut', 'Anniversary', 'Reunion', 'Graduation', 'Others'];
const FOOD_TYPES = ['All', 'Appetizer', 'Main Dish', 'Dessert', 'Drinks'];
const MIDNIGHT_START = 23;
const MORNING_END = 8;

export default function StartOrder({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [otherEventName, setOtherEventName] = useState('');
  const [eventName, setEventName] = useState('');
  const [selectedFood, setSelectedFood] = useState([]);
  const [customRequests, setCustomRequests] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [foods, setFoods] = useState([]);
  const [takenDates, setTakenDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [typeFilter, setTypeFilter] = useState('All');
  const [previewFood, setPreviewFood] = useState(null); // ← food detail modal

  useEffect(() => {
    const unsubscribeFood = onSnapshot(collection(db, 'foods'), (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'foods'));

    const qOrders = query(collection(db, 'orders'), where('status', '==', 'Approved'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.data()).map(order => {
        const d = order.date instanceof Timestamp ? order.date.toDate() : new Date(order.date);
        return d;
      });
      setTakenDates(dates);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    return () => { unsubscribeFood(); unsubscribeOrders(); };
  }, []);

  const totalPrice = selectedFood.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const isMidnightEvent = () => {
    if (!time) return false;
    const [hours] = time.split(':').map(Number);
    return hours >= MIDNIGHT_START || hours < MORNING_END;
  };

  const getMinimumDate = () => {
    return addDays(new Date(new Date().setHours(0, 0, 0, 0)), 3);
  };

  const foodMatchesService = (food) => {
    if (!service) return false;
    const foodCat = (food.category || '').toLowerCase().trim();
    const svc = service.toLowerCase().trim();
    return foodCat === svc || foodCat === 'both';
  };

  const isStep2Valid = () => {
    if (!eventName.trim()) return false;
    if (service === 'Food Trays') {
      if (!eventType) return false;
      if (eventType === 'Others' && !otherEventName.trim()) return false;
    }
    if (!time.trim()) return false;
    if (!address.trim()) return false;
    if (isSameDay(date, new Date())) return false;
    return true;
  };

  const isTrayBadgeGreen = () => {
    if (service === 'Food Trays') return selectedFood.length >= 6;
    return selectedFood.length > 0 && selectedFood.every(f => f.quantity >= 15);
  };

  const handleStep2Next = () => {
    const errors = {};
    if (!eventName.trim()) errors.eventName = true;
    if (service === 'Food Trays') {
      if (!eventType) errors.eventType = true;
      if (eventType === 'Others' && !otherEventName.trim()) errors.otherEventName = true;
    }
    if (!time.trim()) errors.time = true;
    if (!address.trim()) errors.address = true;
    if (isSameDay(date, new Date())) errors.dateToday = true;
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) {
      setTypeFilter('All');
      setStep(3);
    }
  };

  const handleStep3Submit = () => {
    const errors = {};
    if (service === 'Food Trays') {
      if (selectedFood.length < 6) errors.foodSelection = true;
    } else {
      if (selectedFood.length === 0 || selectedFood.some(f => f.quantity < 15)) errors.foodSelection = true;
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) setShowPolicy(true);
  };

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

  const handleSubmitOrder = async () => {
    const orderData = {
      userId: user.uid,
      userName: user.name || user.displayName || 'Guest',
      userEmail: user.email,
      eventName,
      service,
      eventType: eventType === 'Others' ? otherEventName : eventType,
      items: selectedFood,
      totalPrice,
      customRequests,
      date: Timestamp.fromDate(date),
      time,
      address,
      isMidnightEvent: isMidnightEvent(),
      status: 'Waiting',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    try {
      await addDoc(collection(db, 'orders'), orderData);
      navigate('/dashboard/history');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (date < getMinimumDate()) return 'opacity-20 grayscale cursor-not-allowed';
      if (takenDates.find(d => isSameDay(d, date))) return 'date-taken !bg-red-100 !text-red-800 font-bold';
      return 'date-available !bg-green-100 !text-green-800';
    }
  };

  const availableFoods = foods.filter(foodMatchesService);
  const filteredFoods = typeFilter === 'All' || service === 'Packed lunch'
    ? availableFoods
    : availableFoods.filter(f => f.type === typeFilter);

  // whether a food is already in the cart
  const isAdded = (foodId) => selectedFood.some(f => f.foodId === foodId);

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

        {/* ── STEP 1 ── */}
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
                { type: 'Food Trays', icon: <CalendarIcon size={48} />, desc: 'Full catering trays for grand celebrations. Minimum of 6 dish choices required.' }
              ].map(item => (
                <button 
                  key={item.type}
                  onClick={() => { 
                    setService(item.type);
                    setSelectedFood([]);
                    setEventType(null);
                    setOtherEventName('');
                    setValidationErrors({});
                    setStep(2);
                  }}
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

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
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
                    minDate={getMinimumDate()}
                    className="!w-full border-none"
                  />
                  <div className="mt-10 flex flex-wrap gap-8 text-[10px] font-bold uppercase tracking-[0.2em] justify-center">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-green-100 border border-green-200"></div> Available</div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-red-100 border border-red-200"></div> Fully Booked</div>
                  </div>
                  <p className="text-[10px] text-beige-400 mt-6 text-center italic">Orders must be placed minimum 3 days in advance</p>
                  {validationErrors.dateToday && (
                    <p className="text-[10px] text-red-500 mt-2 text-center font-bold uppercase tracking-widest">Please select a valid date (3+ days from today)</p>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <h2 className="display text-xl font-bold flex items-center gap-3">
                  <Clock size={24} className="text-beige-800" />
                  Event Details
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">
                      Event Name {validationErrors.eventName && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John's 25th Birthday"
                      value={eventName}
                      onChange={(e) => {
                        setEventName(e.target.value);
                        if (e.target.value.trim()) setValidationErrors(prev => ({ ...prev, eventName: false }));
                      }}
                      className={`w-full bg-white border p-4 rounded-2xl focus:outline-none focus:ring-2 shadow-sm transition-all ${
                        validationErrors.eventName ? 'border-red-400 focus:ring-red-400' : 'border-beige-100 focus:ring-beige-400'
                      }`}
                    />
                  </div>

                  {service === 'Food Trays' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">
                        Occasion Type {validationErrors.eventType && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={eventType || ''}
                        onChange={(e) => {
                          setEventType(e.target.value);
                          if (e.target.value) setValidationErrors(prev => ({ ...prev, eventType: false }));
                        }}
                        className={`w-full bg-white border p-4 rounded-2xl focus:outline-none focus:ring-2 shadow-sm transition-all ${
                          validationErrors.eventType ? 'border-red-400 focus:ring-red-400' : 'border-beige-100 focus:ring-beige-400'
                        }`}
                      >
                        <option value="" disabled>Select event type</option>
                        {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                  )}

                  {eventType === 'Others' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">
                        Specify Event {validationErrors.otherEventName && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="What celebration is this?"
                        value={otherEventName}
                        onChange={(e) => {
                          setOtherEventName(e.target.value);
                          if (e.target.value.trim()) setValidationErrors(prev => ({ ...prev, otherEventName: false }));
                        }}
                        className={`w-full bg-white border p-4 rounded-2xl focus:outline-none focus:ring-2 shadow-sm transition-all ${
                          validationErrors.otherEventName ? 'border-red-400 focus:ring-red-400' : 'border-beige-100 focus:ring-beige-400'
                        }`}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">
                      Delivery Time {validationErrors.time && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Clock className={`absolute left-6 top-1/2 -translate-y-1/2 size-5 ${validationErrors.time ? 'text-red-400' : 'text-beige-400'}`} />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => {
                          setTime(e.target.value);
                          if (e.target.value) setValidationErrors(prev => ({ ...prev, time: false }));
                        }}
                        className={`w-full pl-16 pr-6 py-5 bg-white border rounded-[32px] focus:outline-none focus:ring-2 shadow-sm font-bold transition-all ${
                          validationErrors.time ? 'border-red-400 focus:ring-red-400' : 'border-beige-100 focus:ring-beige-400'
                        }`}
                      />
                    </div>
                    {isMidnightEvent() && (
                      <p className="text-[10px] text-orange-600 font-bold italic">⚠️ Midnight event — Special cancellation restrictions apply</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-beige-400 uppercase tracking-widest pl-2">
                      Delivery Address {validationErrors.address && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <MapPin className={`absolute left-6 top-7 size-5 ${validationErrors.address ? 'text-red-400' : 'text-beige-400'}`} />
                      <textarea
                        placeholder="Full address for delivery"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (e.target.value.trim()) setValidationErrors(prev => ({ ...prev, address: false }));
                        }}
                        className={`w-full pl-16 pr-6 py-6 bg-white border rounded-[32px] focus:outline-none focus:ring-2 shadow-sm min-h-[140px] resize-none font-medium transition-all ${
                          validationErrors.address ? 'border-red-400 focus:ring-red-400' : 'border-beige-100 focus:ring-beige-400'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleStep2Next}
                    className="w-full btn-luxury flex items-center justify-center gap-2 py-4 active:scale-95 transition-all"
                  >
                    Choose Your Menu <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setStep(1)} className="w-full text-center text-xs font-bold text-beige-400 hover:text-beige-600 transition-colors py-2 uppercase tracking-widest">
                    Change Service
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-12"
          >
            <div className="grid lg:grid-cols-3 gap-12">

              {/* Food list */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="display text-lg font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-beige-800 text-white flex items-center justify-center text-xs">🍽</span>
                    Curate Your Menu
                  </h2>
                  {/* hint */}
                  <span className="text-[10px] text-beige-300 font-bold italic">Click a card to see details</span>
                </div>

                {validationErrors.foodSelection && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                    <p className="text-sm text-red-700">
                      {service === 'Food Trays'
                        ? 'Please select at least 6 dishes.'
                        : 'Each food item must have a minimum of 15 orders.'}
                    </p>
                  </div>
                )}

                {/* Type filter tabs — Food Trays only */}
                {service === 'Food Trays' && (
                  <div className="flex flex-wrap gap-2">
                    {FOOD_TYPES.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={`px-4 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest border transition-all
                          ${typeFilter === t
                            ? 'bg-beige-900 text-white border-beige-900 shadow-md'
                            : 'bg-white text-beige-400 border-beige-100 hover:bg-beige-50 hover:border-beige-300'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                    <span className="ml-auto text-[10px] font-bold text-beige-300 self-center">
                      {filteredFoods.length} item{filteredFoods.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Food cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredFoods.map(food => (
                    <div
                      key={food.id}
                      onClick={() => setPreviewFood(food)}
                      className={`group bg-white p-4 rounded-3xl border flex gap-4 items-center hover:shadow-lg transition-all duration-300 cursor-pointer
                        ${isAdded(food.id)
                          ? 'border-beige-400 ring-2 ring-beige-300 bg-beige-50/50'
                          : 'border-beige-100 hover:border-beige-300'
                        }`}
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-beige-50 flex-shrink-0 relative">
                        <img
                          src={food.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                          alt={food.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* "Added" badge on image */}
                        {isAdded(food.id) && (
                          <div className="absolute inset-0 bg-beige-900/50 flex items-center justify-center rounded-2xl">
                            <Check size={20} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-beige-900 truncate">{food.name}</p>
                        {food.type && (
                          <p className="text-[10px] text-beige-400 font-bold uppercase tracking-tighter mb-1">{food.type}</p>
                        )}
                        <p className="text-sm font-bold text-beige-800">
                          ₱{food.price}{service === 'Packed lunch' ? '/person' : '/Tray'}
                        </p>
                        {food.servingsPerTray && service !== 'Packed lunch' && (
                          <p className="text-[10px] text-beige-400 flex items-center gap-1">
                            <Users size={10} /> Good for {food.servingsPerTray} pax/tray
                          </p>
                        )}
                      </div>
                      {/* Info icon hint */}
                      <div className="flex flex-col items-center gap-2">
                        <Info size={14} className="text-beige-300 group-hover:text-beige-600 transition-colors" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // don't open preview when clicking Add
                            addFood(food);
                          }}
                          disabled={isAdded(food.id)}
                          className="p-3 bg-beige-50 text-beige-800 rounded-2xl hover:bg-beige-800 hover:text-white disabled:opacity-30 transition-all shadow-sm"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredFoods.length === 0 && (
                    <div className="col-span-2 py-20 text-center text-beige-300 italic">
                      No food items found{typeFilter !== 'All' ? ` for "${typeFilter}"` : ' for this service type'}.
                    </div>
                  )}
                </div>
              </div>

              {/* Order summary sidebar */}
              <div className="space-y-8">
                <div className="bg-white rounded-[40px] p-8 border border-beige-100 shadow-xl sticky top-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="serif text-2xl italic font-bold">Your Tray</h3>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      isTrayBadgeGreen() ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
                    }`}>
                      {service === 'Food Trays' ? `${selectedFood.length}/6 Dishes` : 'Min 15 qty/item'}
                    </div>
                  </div>

                  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 mb-4 custom-scrollbar">
                    {selectedFood.length === 0 && (
                      <div className="py-16 text-center space-y-4 opacity-30">
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
                          <p className="text-xs font-black text-beige-700 mt-1">= ₱{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                        <button onClick={() => removeFood(item.foodId)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {selectedFood.length > 0 && (
                    <div className="py-4 border-t border-b border-beige-100 mb-4 flex justify-between items-center">
                      <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">Estimated Total</span>
                      <span className="text-xl font-black text-beige-900">₱{totalPrice.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="bg-beige-50 rounded-3xl p-5 border border-beige-100 mb-4 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-beige-400 font-bold uppercase tracking-widest text-[9px]">Date</span><span className="font-bold">{format(date, 'MMM d, yyyy')}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-beige-400 font-bold uppercase tracking-widest text-[9px]">Time</span><span className="font-bold">{time || '—'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-beige-400 font-bold uppercase tracking-widest text-[9px]">Event</span><span className="font-bold truncate max-w-[150px]">{eventName || '—'}</span></div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-beige-400 uppercase tracking-widest mb-1">Special Requests</p>
                      <p className="text-[9px] text-beige-400 mb-2 italic">Format: "Food name" - "Quantity"</p>
                      <textarea
                        placeholder='e.g. "Extra Rice" - "5 trays"'
                        value={customRequests}
                        onChange={(e) => setCustomRequests(e.target.value)}
                        className="w-full p-4 bg-beige-50 border border-beige-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-beige-400 min-h-[80px] resize-none"
                      />
                    </div>
                    <button
                      onClick={handleStep3Submit}
                      className="w-full btn-luxury flex items-center justify-center gap-2 py-4 active:scale-95 transition-all"
                    >
                      Confirm Submission <Check size={18} />
                    </button>
                    <button onClick={() => { setStep(2); setValidationErrors({}); }} className="w-full text-center text-xs font-bold text-beige-400 hover:text-beige-600 transition-colors py-2 uppercase tracking-widest">
                      Back to Event Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Food Detail Preview Modal ── */}
      <AnimatePresence>
        {previewFood && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-beige-900/50 backdrop-blur-md"
            onClick={() => setPreviewFood(null)} // close on backdrop click
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} // don't close when clicking modal
              className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden relative"
            >
              {/* Food image header */}
              <div className="relative w-full h-64 bg-beige-100">
                <img
                  src={previewFood.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}
                  alt={previewFood.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-beige-900/80 via-transparent to-transparent" />

                {/* Close button */}
                <button
                  onClick={() => setPreviewFood(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
                >
                  <X size={20} />
                </button>

                {/* Name overlaid on image */}
                <div className="absolute bottom-6 left-8 right-8">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">
                    {previewFood.category} {previewFood.type ? `· ${previewFood.type}` : ''}
                  </p>
                  <h3 className="serif text-3xl font-bold italic text-white leading-tight">{previewFood.name}</h3>
                </div>
              </div>

              {/* Details */}
              <div className="p-8 space-y-6">

                {/* Price + servings row */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-beige-50 rounded-2xl p-4 border border-beige-100 text-center">
                    <p className="text-[9px] font-black text-beige-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-2xl font-black text-beige-900">
                      ₱{previewFood.price}
                      <span className="text-xs font-bold text-beige-400 ml-1">
                        {service === 'Packed lunch' ? '/person' : '/tray'}
                      </span>
                    </p>
                  </div>
                  {previewFood.servingsPerTray && service !== 'Packed lunch' && (
                    <div className="flex-1 bg-beige-50 rounded-2xl p-4 border border-beige-100 text-center">
                      <p className="text-[9px] font-black text-beige-400 uppercase tracking-widest mb-1">Good For</p>
                      <p className="text-2xl font-black text-beige-900">
                        {previewFood.servingsPerTray}
                        <span className="text-xs font-bold text-beige-400 ml-1">pax/tray</span>
                      </p>
                    </div>
                  )}
                  {service === 'Packed lunch' && (
                    <div className="flex-1 bg-beige-50 rounded-2xl p-4 border border-beige-100 text-center">
                      <p className="text-[9px] font-black text-beige-400 uppercase tracking-widest mb-1">Min. Order</p>
                      <p className="text-2xl font-black text-beige-900">
                        15
                        <span className="text-xs font-bold text-beige-400 ml-1">pax</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] font-black text-beige-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-beige-600 leading-relaxed italic">
                    "{previewFood.description || 'No description provided.'}"
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  {isAdded(previewFood.id) ? (
                    <button
                      onClick={() => {
                        removeFood(previewFood.id);
                        setPreviewFood(null);
                      }}
                      className="flex-1 py-4 bg-red-50 border border-red-200 text-red-500 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> Remove from Order
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        addFood(previewFood);
                        setPreviewFood(null);
                      }}
                      className="flex-1 py-4 btn-luxury rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Plus size={16} /> Add to Order
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewFood(null)}
                    className="px-6 py-4 bg-beige-50 border border-beige-100 text-beige-400 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-beige-100 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Cancellation Policy Modal ── */}
      <AnimatePresence>
        {showPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-beige-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[60px] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
                <div className="w-full py-4 px-6 bg-beige-900 text-white rounded-2xl mb-6 flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest">Order Total</span>
                  <span className="text-2xl font-black">₱{totalPrice.toLocaleString()}</span>
                </div>
                <div className="space-y-6 text-left mb-10 bg-beige-50 p-8 rounded-[40px] border border-beige-100 w-full">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed font-semibold">
                      Payment transactions will be finalized and managed through our integrated chat system.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed">
                      A <span className="font-bold text-beige-900 underline">70% non-refundable down payment</span> is required to secure your booking. (≈ ₱{Math.ceil(totalPrice * 0.7).toLocaleString()})
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                    <p className="text-sm text-beige-700 leading-relaxed">
                      <span className="font-bold text-beige-900">Standard Cancellation Policy:</span> Must be requested at least <span className="font-bold">3 days prior</span> to the event. After this period, the down payment will be forfeited.
                    </p>
                  </div>
                  {isMidnightEvent() ? (
                    <div className="flex gap-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                      <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-sm text-orange-900 font-bold mb-2">🌙 Midnight Event Special Terms</p>
                        <p className="text-sm text-orange-800 leading-relaxed">
                          For events between 11:00 PM – 8:00 AM, cancellations on the event day are <span className="font-bold">strictly prohibited</span>. The down payment cannot be refunded.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-beige-800 mt-2 shrink-0"></div>
                      <p className="text-sm text-beige-700 leading-relaxed italic">
                        For day events: You may request cancellation up to 24 hours before, but the down payment is non-refundable.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button onClick={handleSubmitOrder} className="flex-1 btn-luxury py-5 shadow-xl shadow-beige-800/20 active:scale-95">
                    I Understand & Submit Order
                  </button>
                  <button onClick={() => setShowPolicy(false)} className="flex-1 btn-outline-luxury py-5 active:scale-95">
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