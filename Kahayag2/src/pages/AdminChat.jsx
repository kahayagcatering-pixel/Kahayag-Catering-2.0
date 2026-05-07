import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Image, Search, MoreHorizontal, MessageSquare, User, Clock, Check } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, doc, setDoc, where } from 'firebase/firestore';

export default function AdminChat({ user, searchTerm }) {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(location.state?.userId ? { uid: location.state.userId, name: location.state.userName } : null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Fetch all conversations
  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubscribe();
  }, []);

  // Fetch messages for active user
  useEffect(() => {
    if (!activeUser) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, 'chats', activeUser.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeUser.uid}/messages`);
    });

    return () => unsubscribe();
  }, [activeUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUser) return;

    const newMessage = {
      text: inputText,
      senderId: 'admin',
      senderName: 'Admin',
      createdAt: Timestamp.now(),
      type: 'text'
    };

    try {
      await addDoc(collection(db, 'chats', activeUser.uid, 'messages'), newMessage);
      
      // Update conversation index
      await setDoc(doc(db, 'conversations', activeUser.uid), {
        lastMessage: inputText,
        lastMessageAt: Timestamp.now(),
        userName: activeUser.name,
        unreadByAdmin: false,
        unreadByUser: true // Notification for client
      }, { merge: true });

      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${activeUser.uid}/messages`);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts instanceof Timestamp ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(c => 
    (c.userName && c.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.lastMessage && c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Loading conversations...</div>;

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[40px] overflow-hidden border border-beige-100 shadow-2xl">
      {/* Sidebar - Active Users */}
      <div className="w-96 border-r border-beige-100 flex flex-col bg-beige-50/30">
        <div className="p-8 border-b border-beige-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="serif text-2xl italic font-bold">Client Support</h2>
            <div className="bg-beige-900 text-white text-[10px] px-2 py-1 rounded-full font-bold">
              {conversations.filter(c => c.unreadByAdmin).length} NEW
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-300" size={16} />
            <input 
              type="text" 
              placeholder="Search client name..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-beige-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-beige-200 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {filteredConversations.length === 0 ? (
            <div className="p-10 text-center text-beige-300 text-xs italic">
              No active conversations yet.
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <motion.div 
                key={conv.uid}
                whileHover={{ scale: 1.02 }}
                onClick={() => setActiveUser({ uid: conv.uid, name: conv.userName })}
                className={`p-5 rounded-3xl cursor-pointer transition-all border ${
                  activeUser?.uid === conv.uid 
                    ? 'bg-beige-900 text-white border-beige-900 shadow-lg' 
                    : 'bg-white text-beige-800 border-beige-50 hover:border-beige-200 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold uppercase ${activeUser?.uid === conv.uid ? 'bg-white/10' : 'bg-beige-100 text-beige-400'}`}>
                        {conv.userName?.charAt(0) || '<'}
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{conv.userName || 'Client'}</p>
                        <p className={`text-[10px] font-mono ${activeUser?.uid === conv.uid ? 'text-beige-400' : 'text-beige-400'}`}>#{conv.uid.slice(-6)}</p>
                      </div>
                    </div>
                    {conv.unreadByAdmin && <span className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
                <div className="flex justify-between items-end">
                   <p className={`text-xs truncate italic max-w-[180px] ${activeUser?.uid === conv.uid ? 'text-beige-300' : 'text-beige-500'}`}>
                    {conv.lastMessage}
                   </p>
                   <p className={`text-[10px] font-bold ${activeUser?.uid === conv.uid ? 'text-beige-400' : 'text-beige-300'}`}>
                     {formatTime(conv.lastMessageAt)}
                   </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            <header className="p-8 border-b border-beige-50 flex justify-between items-center bg-white z-10 shadow-sm">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 bg-beige-100 rounded-3xl flex items-center justify-center text-beige-800 font-bold text-xl border border-beige-50">
                    {activeUser.name?.charAt(0) || 'U'}
                 </div>
                 <div>
                   <h3 className="serif text-2xl font-bold italic text-beige-900">{activeUser.name}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest leading-none">Online for Support</span>
                   </div>
                 </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-800 transition-all border border-beige-100">
                  <User size={20} />
                </button>
                <button className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-800 transition-all border border-beige-100">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-beige-50/10 custom-scrollbar" ref={scrollRef}>
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === 'admin';
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] space-y-2`}>
                       <div className={`p-5 rounded-[32px] text-sm shadow-sm leading-relaxed ${
                         isMe 
                          ? 'bg-beige-900 text-white rounded-br-none' 
                          : 'bg-white border border-beige-100 text-beige-800 rounded-bl-none shadow-md'
                       }`}>
                         {msg.text}
                       </div>
                       <div className={`flex items-center gap-2 px-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <p className="text-[10px] text-beige-300 font-bold tracking-widest uppercase">
                            {formatTime(msg.createdAt)}
                          </p>
                          {isMe && <Check size={12} className="text-beige-200" />}
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="p-8 pt-0 bg-white">
              <form 
                className="flex items-center gap-4 bg-beige-50 p-3 rounded-[32px] border border-beige-100 shadow-inner" 
                onSubmit={handleSend}
              >
                <div className="flex gap-2 pl-2">
                  <button type="button" className="p-3 text-beige-400 hover:text-beige-800 transition-all hover:bg-white rounded-2xl">
                    <Image size={24} />
                  </button>
                  <button type="button" className="p-3 text-beige-400 hover:text-beige-800 transition-all hover:bg-white rounded-2xl">
                    <Paperclip size={24} />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Draft your response..." 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-transparent py-4 text-sm font-medium outline-none text-beige-900 placeholder:text-beige-300"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-4 bg-beige-800 text-white rounded-2xl hover:bg-black transition-all disabled:opacity-20 shadow-xl active:scale-95"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20">
            <div className="w-24 h-24 bg-beige-50 rounded-full flex items-center justify-center text-beige-100 mb-8 border-4 border-dashed border-beige-100">
               <MessageSquare size={48} />
            </div>
            <h3 className="serif text-3xl mb-4 italic text-beige-300">Quiet in the Kitchen</h3>
            <p className="text-beige-400 max-w-sm leading-relaxed font-medium">Select a client from the left panel to begin managing their inquiries and event requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}
