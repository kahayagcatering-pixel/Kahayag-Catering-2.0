import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { auth, googleProvider, signInWithPopup, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'kahayagcatering@gmail.com';
const ADMIN_EMAIL_2 = 'mabelleabatayo@gmail.com';
const ADMIN_EMAILS = [ADMIN_EMAIL, ADMIN_EMAIL_2];

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = 'template_j455ie1';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export default function AuthPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
    setMessage('');
    setSending(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Admin check — send OTP via EmailJS
        if (ADMIN_EMAILS.includes(email)) {
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
          isAdmin: ADMIN_EMAILS.includes(email),
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSending(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox and follow the link to reset your password.');
    } catch (err) {
      // Make error messages more user-friendly
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message);
      }
    } finally {
      setSending(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSending(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          isAdmin: ADMIN_EMAILS.includes(user.email),
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, userData);
      }

      if (ADMIN_EMAILS.includes(user.email)) {
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

  // ── Forgot Password View ──
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-beige-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-beige-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-beige-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-40" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-xl border border-beige-200 p-10 z-10"
        >
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-auto h-16 bg-beige-50 rounded-full flex items-center justify-center text-beige-800 mb-4">
              <img src="/KahayagLogo.png" alt="Kahayag Logo" className="w-auto h-16" />
            </div>
            <h2 className="serif text-3xl mb-2">Reset Password</h2>
            <p className="text-beige-500 text-sm">Enter your email and we'll send you a reset link.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-sm border border-green-100">
              {message}
            </div>
          )}

          {/* Only show the form if no success message yet */}
          {!message && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-beige-400" size={18} />
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full btn-luxury flex items-center justify-center gap-2 py-4"
              >
                {sending ? 'Sending...' : 'Send Reset Link'} {!sending && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setShowForgot(false);
              setError('');
              setMessage('');
              setEmail('');
            }}
            className="w-full mt-6 text-center text-beige-500 hover:text-beige-800 text-sm font-medium transition-colors"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Login / Register View ──
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-beige-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-beige-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-beige-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-xl border border-beige-200 p-10 z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-auto h-16 bg-beige-50 rounded-full flex items-center justify-center text-beige-800 mb-4">
            <img src="/KahayagLogo.png" alt="Kahayag Logo" className="w-auto h-16" />
          </div>
          <h2 className="serif text-3xl mb-2">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
          <p className="text-beige-500 text-sm">Your Vision. Our Masterpiece.</p>
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
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-beige-50 border border-beige-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-beige-400 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-beige-400 hover:text-beige-700 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot password link — login only */}
          {isLogin && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setError('');
                  setMessage('');
                }}
                className="text-xs font-bold text-beige-400 hover:text-beige-800 uppercase tracking-widest transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full btn-luxury flex items-center justify-center gap-2 py-4"
          >
            {sending ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!sending && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-beige-200 w-full" />
            <span className="bg-white px-4 text-xs text-beige-400 uppercase font-bold absolute">Or continue with</span>
          </div>
          <button
            onClick={handleGoogleLogin}
            disabled={sending}
            className="w-full flex items-center justify-center gap-3 py-3 border border-beige-200 rounded-2xl hover:bg-beige-50 transition-all text-beige-800 font-medium disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-beige-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
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