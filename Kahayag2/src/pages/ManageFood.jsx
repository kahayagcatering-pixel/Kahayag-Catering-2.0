import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Utensils, AlertTriangle, Upload, Loader } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { uploadImage, deleteImage } from '../supabase';

export default function ManageFood() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', category: 'Events',
    type: 'Main Dish', imageUrl: '', servingsPerTray: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'foods'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFoods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'foods'));
    return () => unsubscribe();
  }, []);

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item.id);
      setFormData({ name: item.name, description: item.description, price: item.price, category: item.category || 'Events', type: item.type || 'Main Dish', imageUrl: item.imageUrl || '', servingsPerTray: item.servingsPerTray || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: 'Events', type: 'Main Dish', imageUrl: '', servingsPerTray: '' });
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'foods');
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = { ...formData, price: Number(formData.price), servingsPerTray: formData.servingsPerTray ? Number(formData.servingsPerTray) : null, updatedAt: Timestamp.now() };
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'foods', editingItem), data);
      } else {
        await addDoc(collection(db, 'foods'), { ...data, createdAt: Timestamp.now() });
      }
      setShowModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'foods');
    }
  };

  const handleDelete = async (id) => {
    if (!deleteConfirm) {
      setDeleteConfirm({ id, step: 1 });
    } else if (deleteConfirm.step === 1) {
      setDeleteConfirm({ id, step: 2 });
    } else {
      try {
        const food = foods.find(f => f.id === id);
        if (food?.imageUrl) await deleteImage(food.imageUrl, 'foods').catch(() => {});
        await deleteDoc(doc(db, 'foods', id));
        setDeleteConfirm(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `foods/${id}`);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400 font-mono tracking-tighter">PREPARING MENU...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="serif text-5xl italic font-bold text-beige-900 leading-tight">Master Menu</h1>
          <p className="text-sm font-bold text-beige-400 uppercase tracking-[0.3em]">Curating the culinary experience</p>
        </div>
        <button onClick={() => openModal()} className="group flex items-center gap-3 px-10 py-5 bg-beige-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95">
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          Add To Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {foods.map(food => (
          <motion.div key={food.id} layout className="group relative bg-white rounded-[50px] p-10 border border-beige-100 shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden">
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-16 h-16 bg-beige-50 rounded-[28px] overflow-hidden flex items-center justify-center text-beige-900 shadow-inner group-hover:bg-beige-900 group-hover:text-white transition-all duration-500">
                {food.imageUrl ? <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" /> : <Utensils size={32} />}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <button onClick={() => openModal(food)} className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-900 hover:bg-white border border-transparent hover:border-beige-100 shadow-sm transition-all"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(food.id)} className="p-3 bg-red-50 text-red-300 rounded-2xl hover:text-red-500 transition-all shadow-sm"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-400">{food.category}</span>
                <span className="text-beige-200 text-[8px]">●</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-beige-700">{food.type}</span>
              </div>
              <h3 className="serif text-3xl font-bold text-beige-800 leading-tight group-hover:italic transition-all duration-500">{food.name}</h3>
              <p className="text-sm text-beige-500 font-medium leading-relaxed italic opacity-80 min-h-[60px] line-clamp-3">"{food.description}"</p>
              <div className="pt-6 mt-6 border-t border-beige-50 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-beige-300 uppercase tracking-widest mb-1">Price per Head</p>
                  <p className="text-3xl font-black text-beige-900">₱{food.price}</p>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase tracking-tighter">Active</span>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-beige-50/30 rounded-full transition-transform group-hover:scale-150 duration-700"></div>

            <AnimatePresence>
              {deleteConfirm?.id === food.id && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-beige-900/95 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center gap-6">
                  <div className={`p-6 rounded-[32px] ${deleteConfirm.step === 1 ? 'bg-white/10 text-white' : 'bg-red-500 text-white animate-pulse'}`}><AlertTriangle size={48} /></div>
                  <div className="space-y-4">
                    <h4 className="serif text-2xl text-white italic font-bold">{deleteConfirm.step === 1 ? "Removal Confirmation" : "FINAL WARNING"}</h4>
                    <p className="text-beige-300 text-sm leading-relaxed max-w-xs">{deleteConfirm.step === 1 ? `Remove "${food.name}" from the menu?` : "This will permanently delete all food data."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button onClick={() => handleDelete(food.id)} className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${deleteConfirm.step === 1 ? 'bg-white text-beige-900' : 'bg-red-600 text-white'}`}>
                      {deleteConfirm.step === 1 ? "Yes, Proceed" : "PURGE ITEM"}
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="py-4 border border-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 bg-beige-900/80 backdrop-blur-lg">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.05, y: 20 }} className="bg-white rounded-[60px] p-12 max-w-4xl w-full shadow-2xl relative h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 p-3 bg-beige-50 rounded-full text-beige-400 hover:text-beige-900 transition-all"><X size={24} /></button>
              <div className="mb-12">
                <h3 className="serif text-5xl font-bold text-beige-900 italic mb-2">Item Specification</h3>
                <p className="text-xs font-bold text-beige-400 uppercase tracking-[0.3em]">Defining the culinary profile</p>
              </div>

              <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Descriptive Title</label>
                    <input required type="text" placeholder="e.g., Truffle Herb Pasta" className="w-full p-6 bg-beige-50 border border-beige-100 rounded-[32px] text-lg font-bold outline-none focus:ring-2 focus:ring-beige-400 placeholder:text-beige-200" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Menu Classification</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Events', 'Packed lunch', 'Both'].map(cat => (
                        <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest border transition-all ${formData.category === cat ? 'bg-beige-900 text-white border-beige-900 shadow-xl' : 'bg-white border-beige-100 text-beige-400 hover:bg-beige-50'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Course Archetype</label>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {['Appetizer', 'Main Dish', 'Dessert', 'Drinks'].map(t => (
                        <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`py-4 rounded-[24px] font-black uppercase tracking-widest border transition-all ${formData.type === t ? 'bg-beige-900 text-white border-beige-900 shadow-xl' : 'bg-white border-beige-100 text-beige-400 hover:bg-beige-50'}`}>{t}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Item Photo</label>
                    <label className="block cursor-pointer">
                      <div className={`flex flex-col items-center gap-4 p-8 bg-beige-50 border border-beige-100 rounded-[32px] transition-all hover:border-beige-400 ${uploading ? 'opacity-70' : ''}`}>
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Preview" className="w-full aspect-video rounded-[20px] object-cover border border-beige-200" />
                        ) : uploading ? (
                          <><Loader size={32} className="text-beige-400 animate-spin" /><p className="text-[9px] font-bold text-beige-400 uppercase">Uploading...</p></>
                        ) : (
                          <><Upload size={32} className="text-beige-400" /><p className="text-[10px] font-black text-beige-900 uppercase tracking-widest">Click to upload photo</p><p className="text-[9px] text-beige-400">PNG, JPG recommended</p></>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {formData.imageUrl && (
                      <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="text-[9px] text-red-400 hover:text-red-600 font-bold uppercase tracking-widest pl-2">Remove Image</button>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Chef's Description</label>
                    <textarea required placeholder="Detail the flavor profile, ingredients..." className="w-full p-6 bg-beige-50 border border-beige-100 rounded-[32px] text-sm font-medium outline-none focus:ring-2 focus:ring-beige-400 min-h-[140px] placeholder:text-beige-200 leading-relaxed italic" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Valuation (₱)</label>
                      <input required type="number" placeholder="0" className="w-full p-6 bg-beige-50 border border-beige-100 rounded-[32px] text-2xl font-black outline-none focus:ring-2 focus:ring-beige-400 placeholder:text-beige-200" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Servings/Tray</label>
                      <input type="number" placeholder="e.g., 10" className="w-full p-6 bg-beige-50 border border-beige-100 rounded-[32px] text-2xl font-black outline-none focus:ring-2 focus:ring-beige-400 placeholder:text-beige-200" value={formData.servingsPerTray} onChange={(e) => setFormData({...formData, servingsPerTray: e.target.value})} />
                    </div>
                  </div>

                  <div className="pt-8">
                    <button type="submit" disabled={uploading} className="w-full py-6 bg-beige-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                      {editingItem ? 'Finalize Changes' : 'Integrate Into Collection'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
