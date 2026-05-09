import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

export default function UserMenu({ searchTerm }) {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  useEffect(() => {
    const q = query(collection(db, 'foods'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'foods');
    });
    return () => unsubscribe();
  }, []);

  const filteredFood = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesService = activeService === 'All' || food.category === activeService || food.category === 'Both';
    const matchesType = activeType === 'All' || food.type === activeType;
    return matchesSearch && matchesService && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return 0;
  });

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading menu...</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="serif text-5xl mb-2 italic">Our Exquisite Menu</h1>
          <p className="text-beige-500 font-medium">Categorized and sorted for your convenience.</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-beige-400 font-bold uppercase tracking-widest pl-2">Service Type</span>
            <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-beige-100 shadow-sm">
              {['All', 'Food Trays', 'Packed lunch'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveService(tab)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeService === tab ? 'bg-beige-800 text-white shadow-md' : 'text-beige-400 hover:text-beige-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-beige-400 font-bold uppercase tracking-widest pl-2">Course Type</span>
            <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-beige-100 shadow-sm">
              {['All', 'Appetizer', 'Main Dish', 'Dessert', 'Drinks'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveType(tab)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeType === tab ? 'bg-beige-600 text-white shadow-md' : 'text-beige-400 hover:text-beige-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-beige-400 font-bold uppercase tracking-widest pl-2">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-beige-100 p-3 rounded-2xl text-xs font-bold text-beige-700 focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
            >
              <option value="name-asc">Alphabetical (A-Z)</option>
              <option value="name-desc">Alphabetical (Z-A)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredFood.map((food) => (
            <motion.div
              layout
              key={food.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white rounded-[32px] overflow-hidden border border-beige-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
            >
              {/* Fixed height image */}
              <div className="relative h-48 overflow-hidden flex-shrink-0">
                <img
                  src={food.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'}
                  alt={food.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-beige-800 border border-beige-100 uppercase tracking-tight">
                    {food.type}
                  </span>
                  <span className="bg-beige-800/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 uppercase tracking-tight">
                    {food.category}
                  </span>
                </div>
              </div>

              {/* Card body — flex-grow so all cards stretch to same height in row */}
              <div className="p-6 flex flex-col flex-1">
                {/* Name + price */}
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="serif text-lg font-bold text-beige-900 group-hover:text-beige-700 transition-colors leading-tight line-clamp-2">
                    {food.name}
                  </h3>
                  <span className="font-black text-lg text-beige-800 shrink-0">₱{food.price}</span>
                </div>

                {/* Description — fixed height so cards align */}
                <p className="text-xs text-beige-400 font-medium line-clamp-2 italic leading-relaxed flex-1">
                  "{food.description}"
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-beige-50">
                  <span className="text-[10px] text-beige-400 font-bold uppercase tracking-widest">
                    {food.servingsPerTray ? `Good for ${food.servingsPerTray} pax/tray` : food.category === 'Food Trays' ? 'Per tray' : '1 Box'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredFood.length === 0 && (
        <div className="text-center py-24">
          <div className="bg-beige-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-beige-300">
            <Filter size={40} />
          </div>
          <h3 className="serif text-2xl text-beige-800 mb-2">No delicacies found</h3>
          <p className="text-beige-400">Try adjusting your filters or search term.</p>
        </div>
      )}
    </div>
  );
}