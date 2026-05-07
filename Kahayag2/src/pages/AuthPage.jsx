import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Leaf } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { auth, googleProvider, signInWithPopup, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'kahayagcatering@gmail.com';
const EMAILJS_SERVICE_ID = 'service_dxt1mqi';
const EMAILJS_TEMPLATE_ID = 'template_wx22ojo';
const EMAILJS_PUBLIC_KEY = 'q_m-wwo6cr4PvtUlH';

export default function AuthPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const sendAdminOTP = async (emailAddress) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      auth_code: code,
      to_email: emailAddress,
    }, EMAILJS_PUBLIC_KEY);
    return code;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Admin check — send OTP via EmailJS
        if (email === ADMIN_EMAIL) {
          const otp = await sendAdminOTP(email);
          navigate('/otp', { state: { email, otp, uid: user.uid } });
          return;
        }

        // Regular user — fetch Firestore data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUser({ ...user, ...userDoc.data() });
        } else {
          setUser(user);
        }
        navigate('/dashboard');
      } else {
        // Registration
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        await updateProfile(user, { displayName: name });

        const userData = {
          uid: user.uid,
          email: user.email,
          name: name,
          isAdmin: email === ADMIN_EMAIL,
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        setUser({ ...user, ...userData });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSending(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          isAdmin: user.email === ADMIN_EMAIL,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, userData);
      }

      if (user.email === ADMIN_EMAIL) {
        const otp = await sendAdminOTP(user.email);
        navigate('/otp', { state: { email: user.email, otp, uid: user.uid } });
        return;
      }

      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-beige-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-beige-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-beige-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-40"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-xl border border-beige-200 p-10 z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-beige-50 rounded-full flex items-center justify-center text-beige-800 mb-4">
            <Leaf size={32} />
          </div>
          <h2 className="serif text-3xl mb-2">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
          <p className="text-beige-500 text-sm">Experience the art of catering.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all"
            />
          </div>

          <button type="submit" disabled={sending} className="w-full btn-luxury flex items-center justify-center gap-2 py-4">
            {sending ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')} 
            {!sending && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-beige-200 w-full"></div>
            <span className="bg-white px-4 text-xs text-beige-400 uppercase font-bold absolute">Or continue with</span>
          </div>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={sending}
            className="w-full flex items-center justify-center gap-3 py-3 border border-beige-200 rounded-2xl hover:bg-beige-50 transition-all text-beige-800 font-medium"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-beige-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-semibold text-beige-800 hover:underline underline-offset-4"
            >
              {isLogin ? 'Register now' : 'Login instead'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
