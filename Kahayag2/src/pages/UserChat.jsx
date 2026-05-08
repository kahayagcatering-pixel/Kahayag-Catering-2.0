import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Image, Search, MoreHorizontal, MessageSquare } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';

export default function UserChat({ user }) {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(location.state?.orderId || null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    // Using a simpler collection for now: messages collection with senderId and recipientId
    // Or chats/{userId}/messages
    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      
      // Clear notification when user views chat
      if (user) {
        setDoc(doc(db, 'conversations', user.uid), { unreadByUser: false }, { merge: true });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${user.uid}/messages`);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      text: inputText,
      senderId: user.uid,
      senderName: user.name || 'User',
      createdAt: Timestamp.now(),
      type: 'text',
      orderId: activeOrderId || null
    };

    try {
      await addDoc(collection(db, 'chats', user.uid, 'messages'), newMessage);
      
      // Update global conversation index for admin visibility
      await setDoc(doc(db, 'conversations', user.uid), {
        lastMessage: inputText,
        lastMessageAt: Timestamp.now(),
        userName: user.name || 'User',
        unreadByAdmin: true // Admin sees notification
      }, { merge: true });

      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${user.uid}/messages`);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Connecting to support...</div>;

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[32px] overflow-hidden border border-beige-200 shadow-xl">
      {/* Sidebar - Contacts/Context */}
      <div className="w-80 border-r border-beige-100 flex flex-col bg-beige-50/50">
        <div className="p-6 border-b border-beige-100">
          <h2 className="display text-lg font-bold mb-4">Messages</h2>
          
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
             <div className="p-4 bg-beige-900 text-white rounded-2xl border border-beige-800 shadow-lg transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm">Kahayag Admin</span>
                    <span className="text-[10px] text-beige-400 font-bold uppercase tracking-wider">Support</span>
                </div>
                <p className="text-xs text-beige-300 truncate italic">
                  {messages.length > 0 ? messages[messages.length-1].text : 'Start a chat with our admin...'}
                </p>
                {activeOrderId && (
                   <div className="mt-3 text-[10px] bg-white/10 text-white px-2 py-1 rounded inline-block border border-white/10">
                     Context: Order #{activeOrderId.slice(0, 8)}
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="p-6 border-b border-beige-100 flex justify-between items-center bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-beige-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
               K
             </div>
             <div>
               <h3 className="font-bold text-beige-900">Kahayag Admin</h3>
               <p className="text-xs text-green-500 flex items-center gap-1">
                 <span className="w-2 h-2 bg-green-500 rounded-full"></span> Support Team
               </p>
             </div>
          </div>
          <button className="text-beige-400 hover:text-beige-800 transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-beige-50/10 custom-scrollbar" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
              <MessageSquare size={48} className="mb-4" />
              <p>No messages yet. Send a message to reach our admin board.</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.uid;
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] space-y-2`}>
                   <div className={`p-4 rounded-3xl text-sm shadow-sm ${
                     isMe 
                      ? 'bg-beige-900 text-white rounded-br-none' 
                      : 'bg-white border border-beige-100 text-beige-900 rounded-bl-none'
                   }`}>
                     {msg.text}
                   </div>
                   <p className={`text-[10px] text-beige-400 px-2 ${isMe ? 'text-right' : 'text-left'}`}>
                     {formatTime(msg.createdAt)}
                   </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="p-6 border-t border-beige-100 flex items-center gap-4 bg-white">
          <div className="flex gap-2">
            <button className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-800 transition-all">
              <Image size={20} />
            </button>
            <button className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-800 transition-all">
              <Paperclip size={20} />
            </button>
          </div>
          <form className="flex-1 relative" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-beige-50 border border-beige-200 p-4 pr-16 rounded-3xl outline-none focus:ring-2 focus:ring-beige-400 transition-all text-sm"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-beige-800 text-white rounded-2xl hover:bg-beige-900 transition-all disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
