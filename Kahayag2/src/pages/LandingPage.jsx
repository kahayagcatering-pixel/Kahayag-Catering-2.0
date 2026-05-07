import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Leaf, Utensils, Calendar, Phone, Search, Mail, X, ChevronLeft } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-beige-50/80 backdrop-blur-md border-b border-beige-200">
    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <img src="/KahayagLogo.png" alt="Kahayag Logo" className="w-10 h-10 object-contain" />
        <span className="display font-semibold text-xl tracking-tight text-beige-900">Kahayag Catering</span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {['Home', 'Services', 'Menu', 'Gallery', 'Contacts'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-beige-700 hover:text-beige-900 transition-colors uppercase tracking-widest">
            {item}
          </a>
        ))}
      </div>
      <Link to="/auth" className="btn-luxury text-sm">Login / Register</Link>
    </div>
  </nav>
);

const Hero = () => (
  <section id="home" className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
    <div className="grid md:grid-cols-2 gap-16 items-center">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
        <h1 className="serif text-7xl md:text-8xl leading-[0.9] text-beige-900 mb-8 font-light italic">
          Crafting <span className="font-normal not-italic">Memorable</span> Moments.
        </h1>
        <p className="text-lg text-beige-700 mb-10 max-w-md">
          Exquisite catering for your special events and daily nourishment. We bring elegance and taste to every table.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/auth" className="btn-luxury flex items-center gap-2">Start Your Order <ChevronRight size={18} /></Link>
          <a href="#services" className="btn-outline-luxury">Our Services</a>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }} className="relative">
        <img src="https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop" alt="Elegant catering" className="pill-image w-full h-[600px] shadow-2xl" />
        <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[32px] shadow-xl border border-beige-100 hidden lg:block">
          <p className="serif text-3xl italic text-beige-800">"Exceptional taste, impeccable service."</p>
        </div>
      </motion.div>
    </div>
  </section>
);

const Services = () => (
  <section id="services" className="py-24 bg-beige-100">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <h2 className="serif text-5xl mb-4 italic">Our Expertise</h2>
      <p className="text-beige-500 mb-16 tracking-widest uppercase text-xs font-semibold">Customized for Every Occasion</p>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { title: 'Personal Celebration', desc: 'Elegant dining for your most special day.', icon: <Leaf size={32} /> },
          { title: 'Corporate Events', desc: 'Professional catering for meetings and gala events.', icon: <Utensils size={32} /> },
          { title: 'Social Gatherings', desc: 'Birthdays, Anniversaries, and everything in between.', icon: <Calendar size={32} /> }
        ].map((service, idx) => (
          <motion.div key={idx} whileHover={{ y: -10 }} className="card-luxury p-10 flex flex-col items-center text-center">
            <div className="bg-beige-50 p-6 rounded-full mb-6 text-beige-800">{service.icon}</div>
            <h3 className="display font-semibold text-xl mb-4">{service.title}</h3>
            <p className="text-beige-600 leading-relaxed">{service.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const MenuSection = () => {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'foods'), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredFoods = foods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <section id="menu" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div>
          <h2 className="serif text-5xl italic mb-2">A Feast for the Senses</h2>
          <p className="text-beige-500 tracking-widest uppercase text-xs font-semibold">Premium Selection</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
          <input type="text" placeholder="Search menu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-beige-200 rounded-full focus:outline-none focus:ring-2 focus:ring-beige-400 text-sm shadow-sm" />
        </div>
      </div>
      {filteredFoods.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {filteredFoods.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="group">
              <div className="overflow-hidden rounded-[32px] mb-4 aspect-square shadow-md border border-beige-100">
                <img src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" crossOrigin="anonymous" />
              </div>
              <div className="px-2">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-beige-900 text-lg leading-tight">{item.name}</h4>
                  <span className="text-beige-700 font-bold">₱{item.price}</span>
                </div>
                <p className="text-xs text-beige-500 line-clamp-1 mb-1">{item.description}</p>
                <span className="text-[10px] bg-beige-100 px-2 py-0.5 rounded-full text-beige-600 font-bold uppercase tracking-tighter">
                  Good for {item.category === 'Events' ? 'Choice of pax' : '1 Pax'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-beige-400 italic">Exploring our kitchen for you...</div>
      )}
      <div className="mt-16 text-center">
        <Link to="/auth" className="btn-outline-luxury">View Full Menu</Link>
      </div>
    </section>
  );
};

const Gallery = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'), limit(6));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {
      const qFallback = query(collection(db, 'gallery'), limit(6));
      onSnapshot(qFallback, (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    });
    return () => unsubscribe();
  }, []);

  const openLightbox = (event) => {
    setSelectedEvent(event);
    setCurrentImageIdx(0);
  };

  const nextImage = () => setCurrentImageIdx(prev => (prev + 1) % selectedEvent.images.length);
  const prevImage = () => setCurrentImageIdx(prev => (prev - 1 + selectedEvent.images.length) % selectedEvent.images.length);

  return (
    <section id="gallery" className="py-24 bg-beige-900 text-beige-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="serif text-5xl mb-4 italic text-center text-white">Moments Captured</h2>
        <p className="text-beige-400 text-center mb-16 tracking-widest uppercase text-xs font-semibold">Our Recent Events</p>
        {events.length > 0 ? (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
            {events.map((event) => (
              <motion.div
                key={event.id}
                onClick={() => openLightbox(event)}
                className="flex-none w-80 md:w-96 snap-center bg-white/5 rounded-[40px] p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="rounded-[32px] overflow-hidden mb-4 aspect-[4/3] bg-beige-800 relative">
                  {event.images?.[0] ? (
                    <img src={event.images[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" crossOrigin="anonymous" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80'; }} />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80" alt={event.title} className="w-full h-full object-cover" />
                  )}
                  {event.images?.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-white">
                      +{event.images.length - 1} more
                    </div>
                  )}
                  <div className="absolute inset-0 bg-beige-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">View All</span>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <h4 className="display font-semibold text-lg text-white mb-1">{event.title}</h4>
                  <div className="flex justify-between items-center text-beige-400 text-xs">
                    <span>{event.date}</span>
                    <span className="italic">{event.type}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-beige-500 italic">Capturing memories...</div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4" onClick={() => setSelectedEvent(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl flex flex-col md:flex-row gap-8 items-center"
            >
              <button onClick={() => setSelectedEvent(null)} className="absolute top-0 right-0 md:-top-12 md:right-0 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                <X size={24} />
              </button>

              <div className="flex-1 relative w-full">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    src={selectedEvent.images?.[currentImageIdx]}
                    alt={`${selectedEvent.title} - ${currentImageIdx + 1}`}
                    className="w-full max-h-[70vh] object-contain rounded-3xl shadow-2xl"
                    crossOrigin="anonymous"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80'; }}
                  />
                </AnimatePresence>

                {selectedEvent.images?.length > 1 && (
                  <>
                    <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all backdrop-blur-md"><ChevronLeft size={24} /></button>
                    <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all backdrop-blur-md"><ChevronRight size={24} /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {selectedEvent.images.map((_, i) => (
                        <button key={i} onClick={() => setCurrentImageIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImageIdx ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="w-full md:w-72 text-white space-y-4 px-4 md:px-0">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-beige-400">{selectedEvent.type}</span>
                <h2 className="serif text-3xl font-bold italic">{selectedEvent.title}</h2>
                <p className="text-beige-400 text-sm">{selectedEvent.date}</p>
                <p className="text-beige-500 text-xs">{selectedEvent.images?.length} photo{selectedEvent.images?.length !== 1 ? 's' : ''}</p>

                {selectedEvent.images?.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 pt-4">
                    {selectedEvent.images.map((url, i) => (
                      <button key={i} onClick={() => setCurrentImageIdx(i)} className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === currentImageIdx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

const Contact = () => (
  <section id="contacts" className="py-24 px-6 max-w-7xl mx-auto text-center">
    <div className="bg-beige-200 rounded-[80px] p-12 md:p-24 relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="serif text-5xl mb-6 italic">Let's Create Something <span className="italic font-normal">Beautiful</span></h2>
        <p className="text-beige-700 mb-12 max-w-xl mx-auto text-lg">Ready to book your event or have questions? Our team is here to help you every step of the way.</p>
        <div className="grid md:grid-cols-3 gap-8 justify-center items-center max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-beige-800 shadow-sm"><Phone size={24} /></div>
            <div><p className="text-xs text-beige-500 font-bold uppercase tracking-widest mb-1">Call Us</p><span className="font-semibold text-beige-900">+63 (912) 345-6789</span></div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-beige-800 shadow-sm"><Mail size={24} /></div>
            <div><p className="text-xs text-beige-500 font-bold uppercase tracking-widest mb-1">Email</p><span className="font-semibold text-beige-900">kahayagcatering@gmail.com</span></div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-beige-800 shadow-sm"><FaFacebook size={24} /></div>
            <div><p className="text-xs text-beige-500 font-bold uppercase tracking-widest mb-1">Facebook</p><span className="font-semibold text-beige-900">Kahayag Catering Box</span></div>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-beige-300 rounded-full blur-[100px] opacity-40"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-white rounded-full blur-[80px] opacity-30"></div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-16 border-t border-beige-200 bg-white">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-12">
        <div className="flex items-center gap-4">
          <img src="/KahayagLogo.png" alt="Kahayag Logo" className="w-12 h-12 object-contain" />
          <div>
            <span className="display font-bold text-2xl tracking-tight text-beige-900">Kahayag Catering</span>
            <p className="text-[10px] text-beige-400 font-bold tracking-[0.2em] uppercase">The Art of Fine Dining</p>
          </div>
        </div>
        <div className="flex gap-10">
          {['Home', 'Services', 'Menu', 'Gallery'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-beige-600 hover:text-beige-900 transition-colors font-medium">{item}</a>
          ))}
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-beige-100 gap-6">
        <p className="text-beige-400 text-xs font-semibold tracking-wider">© 2024 Kahayag Catering Services. All rights reserved.</p>
        <div className="flex gap-6 text-beige-400 text-xs font-semibold tracking-wider">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </div>
  </footer>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen selection:bg-beige-200 selection:text-beige-900">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <MenuSection />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
