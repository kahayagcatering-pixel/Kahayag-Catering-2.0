import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Image, MoreHorizontal, MessageSquare, Check, ArrowLeft } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';

export default function UserChat({ user }) {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(location.state?.orderId || null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showChat, setShowChat] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'chats', user.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      
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
      
      await setDoc(doc(db, 'conversations', user.uid), {
        lastMessage: inputText,
        lastMessageAt: Timestamp.now(),
        userName: user.name || 'User',
        unreadByAdmin: true
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

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  if (loading) return <div className="flex items-center justify-center p-20 text-beige-400">Connecting to support...</div>;

  return (
    <div className={`${isMobile ? 'h-[calc(100vh-120px)] flex flex-col' : 'h-[calc(100vh-160px)] flex'} bg-white rounded-[40px] overflow-hidden border border-beige-100 shadow-2xl`}>

      {/* Desktop: Sidebar */}
      {!isMobile && (
        <div className="w-96 border-r border-beige-100 flex flex-col bg-beige-50/30">
          <div className="p-8 border-b border-beige-100">
            <div className="flex justify-between items-center">
              <h2 className="serif text-2xl italic font-bold">Messages</h2>
              <div className="bg-beige-900 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                Support
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-3xl cursor-pointer transition-all border bg-beige-900 text-white border-beige-900 shadow-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-white/10 text-white text-lg">
                    K
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">Kahayag Admin</p>
                    <p className="text-[10px] font-mono text-beige-400">Support Team</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xs truncate italic max-w-[200px] text-beige-300">
                  {lastMessage ? lastMessage.text : 'Start a conversation...'}
                </p>
                <p className="text-[10px] font-bold text-beige-400">
                  {lastMessage ? formatTime(lastMessage.createdAt) : ''}
                </p>
              </div>
              {activeOrderId && (
                <div className="mt-3 text-[10px] bg-white/10 text-white px-2 py-1 rounded inline-block border border-white/10">
                  Order #{activeOrderId.slice(0, 8)}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Mobile: Contact List View */}
      {isMobile && !showChat && (
        <div className="flex-1 flex flex-col bg-beige-50/30 overflow-hidden">
          <div className="p-6 border-b border-beige-100 bg-white">
            <div className="flex justify-between items-center">
              <h2 className="serif text-2xl italic font-bold">Messages</h2>
              <div className="bg-beige-900 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                Support
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowChat(true)}
              className="p-4 rounded-3xl cursor-pointer transition-all border bg-white text-beige-800 border-beige-50 shadow-sm active:bg-beige-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold bg-beige-900 text-white text-lg flex-shrink-0">
                    K
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Kahayag Admin</p>
                    <p className="text-[10px] text-beige-500 truncate">
                      {lastMessage ? lastMessage.text : 'Start a conversation...'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-beige-300 font-bold flex-shrink-0 ml-2">
                  {lastMessage ? formatTime(lastMessage.createdAt) : ''}
                </p>
              </div>
              {activeOrderId && (
                <div className="mt-1 ml-1 text-[10px] bg-beige-100 text-beige-600 px-2 py-1 rounded inline-block">
                  Order #{activeOrderId.slice(0, 8)}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Desktop & Mobile: Main Chat Area */}
      {(!isMobile || (isMobile && showChat)) && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <header className={`${isMobile ? 'p-4' : 'p-8'} border-b border-beige-50 flex justify-between items-center bg-white z-10 shadow-sm`}>
            <div className="flex items-center gap-3 md:gap-5 flex-1">
              {isMobile && (
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-beige-50 rounded-lg transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className={`${isMobile ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl'} bg-beige-900 rounded-3xl flex items-center justify-center text-white font-bold border border-beige-50`}>
                K
              </div>
              <div className="min-w-0">
                <h3 className={`serif font-bold italic text-beige-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>Kahayag Admin</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-[10px] font-black text-beige-400 uppercase tracking-widest">Support Team</span>
                </div>
              </div>
            </div>
            {!isMobile && (
              <button className="p-3 bg-beige-50 text-beige-400 rounded-2xl hover:text-beige-800 transition-all border border-beige-100">
                <MoreHorizontal size={20} />
              </button>
            )}
          </header>

          <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-10'} space-y-6 md:space-y-8 bg-beige-50/10 custom-scrollbar`} ref={scrollRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                <MessageSquare size={isMobile ? 40 : 48} className="mb-4" />
                <p className="text-sm">No messages yet. Say hello to start chatting!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`${isMobile ? 'max-w-[85%]' : 'max-w-[75%]'} space-y-2`}>
                    <div className={`p-4 md:p-5 rounded-[32px] text-sm shadow-sm leading-relaxed ${
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

          <div className={`${isMobile ? 'p-4 pt-2' : 'p-8 pt-0'} bg-white`}>
            <form
              className="flex items-center gap-3 md:gap-4 bg-beige-50 p-2 md:p-3 rounded-[32px] border border-beige-100 shadow-inner"
              onSubmit={handleSend}
            >
              <div className={`flex gap-1 ${isMobile ? 'pl-1' : 'pl-2'}`}>
                <button type="button" className="p-2 md:p-3 text-beige-400 hover:text-beige-800 transition-all hover:bg-white rounded-2xl">
                  <Image size={isMobile ? 20 : 24} />
                </button>
                <button type="button" className="p-2 md:p-3 text-beige-400 hover:text-beige-800 transition-all hover:bg-white rounded-2xl">
                  <Paperclip size={isMobile ? 20 : 24} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent py-3 text-sm font-medium outline-none text-beige-900 placeholder:text-beige-300"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 md:p-4 bg-beige-800 text-white rounded-2xl hover:bg-black transition-all disabled:opacity-20 shadow-xl active:scale-95"
              >
                <Send size={isMobile ? 18 : 24} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}