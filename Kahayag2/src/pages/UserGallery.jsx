import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Filter } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const CATEGORIES = ['All', 'Food Trays', 'Packed lunch', 'Both'];
const TYPES = ['All', 'Appetizer', 'Main Dish', 'Dessert', 'Drinks'];

export default function UserMenu({ searchTerm }) {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
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
    const matchesCategory = categoryFilter === 'All' || food.category === categoryFilter || food.category === 'Both';
    const matchesType = typeFilter === 'All' || categoryFilter === 'Packed lunch' || food.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="serif text-5xl mb-2 italic">Our Exquisite Menu</h1>
          <p className="text-beige-500 font-medium">Categorized and sorted for your convenience.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-6 bg-white border border-beige-100 rounded-[32px] shadow-sm space-y-4">
        {/* Category */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-black text-beige-300 uppercase tracking-widest mr-1">Category</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setTypeFilter('All'); }}
              className={`px-5 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest border transition-all ${
                categoryFilter === cat
                  ? 'bg-beige-900 text-white border-beige-900 shadow-lg'
                  : 'bg-white text-beige-400 border-beige-100 hover:bg-beige-50 hover:border-beige-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Type — hidden for Packed Lunch */}
        <AnimatePresence>
          {categoryFilter !== 'Packed lunch' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-3 items-center overflow-hidden"
            >
              <span className="text-[10px] font-black text-beige-300 uppercase tracking-widest mr-1">Type</span>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-5 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest border transition-all ${
                    typeFilter === t
                      ? 'bg-beige-700 text-white border-beige-700 shadow-md'
                      : 'bg-white text-beige-400 border-beige-100 hover:bg-beige-50 hover:border-beige-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-beige-300 uppercase tracking-widest mr-1">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-beige-100 px-4 py-2.5 rounded-[16px] text-[10px] font-black text-beige-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-beige-400 shadow-sm"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="price-asc">Price (Low → High)</option>
            <option value="price-desc">Price (High → Low)</option>
          </select>
        </div>
      </div>

      <p className="text-[10px] font-black text-beige-300 uppercase tracking-widest pl-2">
        {filteredFood.length} item{filteredFood.length !== 1 ? 's' : ''} shown
      </p>

      {/* Grid — same as ManageFood */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredFood.map(food => (
          <motion.div
            key={food.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white rounded-[50px] p-10 border border-beige-100 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden"
          >
            {/* Icon / image thumbnail */}
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-16 h-16 bg-beige-50 rounded-[28px] overflow-hidden flex items-center justify-center text-beige-900 shadow-inner group-hover:bg-beige-900 group-hover:text-white transition-all duration-500">
                {food.imageUrl
                  ? <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
                  : <Utensils size={32} />
                }
              </div>
            </div>

            {/* Info */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-400">{food.category}</span>
                {food.type && (
                  <>
                    <span className="text-beige-200 text-[8px]">●</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-700">{food.type}</span>
                  </>
                )}
                {food.servingsPerTray && (
                  <>
                    <span className="text-beige-200 text-[8px]">●</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-500">{food.servingsPerTray} pax/tray</span>
                  </>
                )}
              </div>

              <h3 className="serif text-3xl font-bold text-beige-800 leading-tight group-hover:italic transition-all duration-500">
                {food.name}
              </h3>

              <p className="text-sm text-beige-500 font-medium leading-relaxed italic opacity-80 min-h-[60px] line-clamp-3">
                "{food.description}"
              </p>

              <div className="pt-6 mt-6 border-t border-beige-50 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-beige-300 uppercase tracking-widest mb-1">Price per Head</p>
                  <p className="text-3xl font-black text-beige-900">₱{food.price}</p>
                </div>
                <span className="px-3 py-1 bg-beige-50 border border-beige-100 rounded-full text-[9px] font-bold text-beige-500 uppercase tracking-widest">
                  {food.category === 'Packed lunch' ? '1 box' : 'per tray'}
                </span>
              </div>
            </div>

            {/* Decorative circle */}
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-beige-50/30 rounded-full transition-transform group-hover:scale-150 duration-700" />
          </motion.div>
        ))}
      </div>

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