import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Calendar, MapPin, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';

export default function UserGallery({ searchTerm }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [failedImages, setFailedImages] = useState(new Set());

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
    });
    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openLightbox = (event) => {
    setSelectedEvent(event);
    setCurrentImageIdx(0);
  };

  const nextImage = () => {
    if (!selectedEvent) return;
    setCurrentImageIdx((prev) => (prev + 1) % selectedEvent.images.length);
  };

  const prevImage = () => {
    if (!selectedEvent) return;
    setCurrentImageIdx((prev) => (prev - 1 + selectedEvent.images.length) % selectedEvent.images.length);
  };

  const handleImageError = (url) => {
    setFailedImages(prev => new Set([...prev, url]));
  };

  const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f5f0e8'/%3E%3Crect x='160' y='100' width='80' height='60' rx='6' fill='%23d6cfc4'/%3E%3Ccircle cx='200' cy='135' r='18' fill='%23b8b0a5'/%3E%3C/svg%3E`;
const getImageUrl = (url) => failedImages.has(url) ? FALLBACK_IMG : url;

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400 italic">Exploring archive...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="serif text-5xl font-bold italic text-beige-900 leading-tight">Celebration Gallery</h1>
        <p className="text-sm font-bold text-beige-400 uppercase tracking-[0.3em] flex items-center gap-3">
          Our finest culinary moments <span className="w-12 h-[1px] bg-beige-200"></span> Inspiring your next event
        </p>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
        {filteredEvents.map((event, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => openLightbox(event)}
            className="break-inside-avoid relative group cursor-pointer bg-white rounded-[40px] overflow-hidden border border-beige-50 hover:shadow-2xl transition-all duration-700"
          >
            <div className="relative overflow-hidden bg-beige-50">
               {event.images && event.images.length > 0 ? (
                 <img 
                    src={getImageUrl(event.images[0])} 
                    alt={event.title}
                    className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-1000"
                    crossOrigin="anonymous"
                    onError={() => handleImageError(event.images[0])}
                 />
               ) : (
                 <div className="w-full h-64 flex items-center justify-center text-beige-200">
                    <ImageIcon size={48} />
                 </div>
               )}
               <div className="absolute inset-0 bg-beige-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-white/90 p-4 rounded-full text-beige-900 shadow-xl opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 delay-100">
                    <ImageIcon size={24} />
                  </div>
               </div>
            </div>
            
            <div className="p-8">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-400">{event.type}</span>
              <h3 className="serif text-2xl font-bold text-beige-900 mt-2 italic">{event.title}</h3>
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-beige-50">
                <div className="flex items-center gap-2 text-[10px] font-black text-beige-400 uppercase tracking-widest">
                  <Calendar size={12} className="text-beige-300" />
                  {format(new Date(event.date), 'MMMM yyyy')}
                </div>
                {event.images?.length > 1 && (
                  <div className="ml-auto text-[10px] font-black text-beige-300 uppercase tracking-widest">
                    +{event.images.length - 1} View More
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
         <div className="py-32 text-center">
           <div className="bg-white w-20 h-20 rounded-[30px] shadow-sm flex items-center justify-center mx-auto mb-8 border border-beige-100 text-beige-200">
              <Search size={40} />
           </div>
           <h3 className="serif text-3xl text-beige-800 italic mb-2">No event found</h3>
           <p className="text-beige-400 font-medium">Try searching for a different celebration.</p>
         </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-beige-900/95 backdrop-blur-2xl p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl flex flex-col md:flex-row gap-8 md:gap-12 items-center"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 md:top-10 md:right-10 z-10 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md"
              >
                <X size={24} />
              </button>

              <div className="flex-1 relative group w-full h-[50vh] md:h-[70vh] flex items-center justify-center mt-12 md:mt-0">
                 <AnimatePresence mode="wait">
                    {selectedEvent.images && selectedEvent.images[currentImageIdx] ? (
                      <motion.img 
                        key={currentImageIdx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        src={getImageUrl(selectedEvent.images[currentImageIdx])}
                        alt={`${selectedEvent.title} - ${currentImageIdx + 1}`}
                        className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(selectedEvent.images[currentImageIdx])}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-beige-300">
                        <ImageIcon size={64} />
                      </div>
                    )}
                 </AnimatePresence>
                 
                 {selectedEvent.images && selectedEvent.images.length > 1 && (
                   <>
                     <button onClick={prevImage} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all backdrop-blur-md"><ChevronLeft size={24} /></button>
                     <button onClick={nextImage} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all backdrop-blur-md"><ChevronRight size={24} /></button>
                     
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {selectedEvent.images.map((_, i) => (
                          <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentImageIdx ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}></div>
                        ))}
                     </div>
                   </>
                 )}
              </div>

              <div className="w-full md:w-80 space-y-6 md:space-y-8 text-white px-4 md:px-0 pb-8 md:pb-0">
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-beige-400">{selectedEvent.type}</span>
                    <h2 className="serif text-4xl md:text-5xl font-bold italic mt-4 leading-tight">{selectedEvent.title}</h2>
                 </div>
                 
                 <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white/10 rounded-2xl flex-shrink-0"><Calendar size={20} className="text-beige-300" /></div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-beige-400">Captured On</p>
                          <p className="text-lg font-bold">{format(new Date(selectedEvent.date), 'PPPP')}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white/10 rounded-2xl flex-shrink-0"><ImageIcon size={20} className="text-beige-300" /></div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-beige-400">Collection Size</p>
                          <p className="text-lg font-bold">{selectedEvent.images?.length || 0} High-Res Assets</p>
                       </div>
                    </div>
                 </div>

                 <div className="pt-8 md:pt-12">
                   <p className="text-xs text-beige-500 leading-relaxed font-medium italic opacity-60">
                    "This event exemplifies our dedication to refined taste and aesthetic precision in catering."
                   </p>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
