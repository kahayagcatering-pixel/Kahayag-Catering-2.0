import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Image as ImageIcon, Calendar, AlertTriangle, Upload, Loader, GripVertical, XCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { uploadImage, deleteImage } from '../supabase';

function DraggableImageList({ images, onRemove, onReorder }) {
  const dragIndex = useRef(null);
  const dragOverIndex = useRef(null);

  const handleDragStart = (i) => { dragIndex.current = i; };
  const handleDragEnter = (i) => { dragOverIndex.current = i; };
  const handleDragEnd = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onReorder(updated);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  return (
    <div className="space-y-2 mt-3">
      {images.map((url, i) => (
        <div
          key={url + i}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragEnter={() => handleDragEnter(i)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className="flex items-center gap-3 p-2 bg-beige-50 border border-beige-100 rounded-2xl cursor-grab active:cursor-grabbing group hover:border-beige-400 transition-all"
        >
          <GripVertical size={14} className="text-beige-300 shrink-0" />
          <img src={url} alt="" className="w-12 h-12 rounded-xl object-cover border border-beige-200 shrink-0" />
          <span className="text-[9px] font-bold text-beige-500 truncate flex-1">Image {i + 1}</span>
          <span className="text-[9px] text-beige-300 font-bold mr-1">Drag to reorder</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="p-1.5 rounded-full text-beige-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
          >
            <XCircle size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ManageGallery({ searchTerm }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Event',
    images: [],
  });

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'gallery'));
    return () => unsubscribe();
  }, []);

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item.id);
      setFormData({
        title: item.title || '',
        date: item.date || format(new Date(), 'yyyy-MM-dd'),
        type: item.type || 'Event',
        images: Array.isArray(item.images) ? [...item.images] : [],
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', date: format(new Date(), 'yyyy-MM-dd'), type: 'Event', images: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, 'gallery')));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleReorderImages = (reordered) => {
    setFormData(prev => ({ ...prev, images: reordered }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const data = {
      title: formData.title.trim(),
      date: formData.date,
      type: formData.type,
      images: formData.images,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'gallery', editingItem), data);
      } else {
        await addDoc(collection(db, 'gallery'), { ...data, createdAt: Timestamp.now() });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'gallery');
    }
  };

  const handleDelete = async (id) => {
    if (!deleteConfirm) {
      setDeleteConfirm({ id, step: 1 });
    } else if (deleteConfirm.step === 1) {
      setDeleteConfirm({ id, step: 2 });
    } else {
      try {
        const event = events.find(e => e.id === id);
        if (event?.images?.length) {
          await Promise.all(event.images.map(url => deleteImage(url, 'gallery').catch(() => {})));
        }
        await deleteDoc(doc(db, 'gallery', id));
        setDeleteConfirm(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
      }
    }
  };

  const filteredEvents = events.filter(e =>
    (e.title || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-beige-400 font-bold tracking-widest text-[10px]">
      SYNCING GALLERY...
    </div>
  );

  return (
    <div className="space-y-12 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="serif text-5xl font-bold italic text-beige-900 leading-tight">Visual Archive</h1>
          <p className="text-[10px] font-black text-beige-400 uppercase tracking-[0.4em]">Managing past celebrations</p>
        </div>
        <button
          onClick={() => openModal()}
          className="group flex items-center gap-3 px-10 py-5 bg-beige-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95"
        >
          <Plus size={18} className="group-hover:rotate-180 transition-transform duration-700" />
          Archive New Event
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {filteredEvents.map(event => (
          <motion.div
            key={event.id}
            layout
            className="group relative bg-white rounded-[40px] border border-beige-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-700"
          >
            <div className="aspect-[4/5] overflow-hidden relative bg-beige-50">
              {event.images && event.images[0] ? (
                <img
                  src={event.images[0]}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-beige-200">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-beige-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(event)}
                    className="flex-1 py-3 bg-white/20 backdrop-blur-md rounded-2xl text-[10px] uppercase font-bold text-white hover:bg-white/40 border border-white/20 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-3 bg-red-500/80 backdrop-blur-md rounded-2xl text-white hover:bg-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {event.images?.length > 1 && (
                <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black text-beige-800 z-10">
                  +{event.images.length - 1} Images
                </div>
              )}
            </div>

            <div className="p-8 space-y-3">
              <h3 className="serif text-2xl font-bold text-beige-900 truncate italic">{event.title}</h3>
              <div className="flex gap-2 items-center">
                <Calendar size={12} className="text-beige-300" />
                <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">
                  {event.date ? format(new Date(event.date + 'T00:00:00'), 'MMMM d, yyyy') : '—'}
                </span>
              </div>
              <span className="px-3 py-1 bg-beige-50 border border-beige-100 rounded-full text-[9px] font-bold text-beige-500 uppercase tracking-widest inline-block">
                {event.type || 'Event'}
              </span>
            </div>

            <AnimatePresence>
              {deleteConfirm?.id === event.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-beige-900/95 backdrop-blur-lg flex flex-col items-center justify-center p-12 text-center"
                >
                  <AlertTriangle className="text-red-500 mb-6" size={48} />
                  <h4 className="serif text-white text-2xl mb-4 italic font-bold">
                    {deleteConfirm.step === 1 ? 'Archive Deletion' : 'CRITICAL WARNING'}
                  </h4>
                  <p className="text-beige-400 text-[10px] uppercase tracking-widest font-black mb-8 leading-relaxed">
                    {deleteConfirm.step === 1
                      ? 'Are you sure you want to remove this memory?'
                      : 'THIS IS DESTRUCTIVE AND IRREVERSIBLE.'}
                  </p>
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={() => handleDelete(event.id)}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deleteConfirm.step === 1 ? 'bg-white text-beige-900' : 'bg-red-600 text-white'}`}
                    >
                      Confirm Deletion
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="py-4 text-white text-[10px] font-black uppercase tracking-widest hover:text-beige-300"
                    >
                      Abort
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-4 text-center py-20 text-beige-300 italic">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No events archived yet.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-beige-900/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[60px] p-12 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={closeModal}
                className="absolute top-10 right-10 p-3 bg-beige-50 rounded-full text-beige-400 hover:text-beige-900 transition-all border border-beige-100 z-10"
              >
                <X size={20} />
              </button>

              <div className="mb-10 text-center">
                <div className="bg-beige-50 w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-beige-400 border border-beige-100">
                  <ImageIcon size={32} />
                </div>
                <h2 className="serif text-4xl italic font-bold text-beige-900">
                  {editingItem ? 'Edit Event Archive' : 'Archive New Event'}
                </h2>
              </div>

              <form onSubmit={handleSave} className="space-y-8">

                {/* Name & Date */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Event Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g., Rustic Wedding"
                      className="w-full p-5 bg-beige-50 border border-beige-100 rounded-[28px] text-sm font-bold outline-none focus:ring-2 focus:ring-beige-400"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Event Date</label>
                    <input
                      required
                      type="date"
                      className="w-full p-5 bg-beige-50 border border-beige-100 rounded-[28px] text-sm font-bold outline-none focus:ring-2 focus:ring-beige-400"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Celebration Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Celebration Type</label>
                  <div className="flex gap-3">
                    {['Event', 'Packed Lunch', 'Personal'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t })}
                        className={`flex-1 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest border transition-all ${
                          formData.type === t
                            ? 'bg-beige-900 text-white border-beige-900 shadow-xl'
                            : 'bg-white border-beige-100 text-beige-400 hover:bg-beige-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest pl-2">Upload Images</label>
                  <label className="block cursor-pointer">
                    <div className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-[28px] transition-all ${uploading ? 'border-beige-300 bg-beige-50' : 'border-beige-200 hover:border-beige-500 hover:bg-beige-50'}`}>
                      {uploading ? (
                        <>
                          <Loader size={32} className="text-beige-400 animate-spin" />
                          <p className="text-[10px] font-bold text-beige-400 uppercase tracking-widest">Uploading…</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-beige-400" />
                          <p className="text-[10px] font-black text-beige-900 uppercase tracking-widest">Click to upload images</p>
                          <p className="text-[9px] text-beige-400">PNG, JPG — multiple allowed</p>
                        </>
                      )}
                    </div>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>

                {/* Draggable image list */}
                {formData.images.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pl-2">
                      <label className="text-[10px] font-black text-beige-400 uppercase tracking-widest">
                        {formData.images.length} Image{formData.images.length > 1 ? 's' : ''} — Drag to reorder
                      </label>
                      <span className="text-[9px] text-beige-300 font-bold">First image = cover</span>
                    </div>
                    <DraggableImageList
                      images={formData.images}
                      onRemove={handleRemoveImage}
                      onReorder={handleReorderImages}
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-5 bg-beige-900 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {editingItem ? 'Save Changes' : 'Archive Memory'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}