import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function OTPPage({ setUser }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const generatedOTP = location.state?.otp || '';
  const uid = location.state?.uid || '';

  // Redirect if accessed directly without going through login
  if (!email || !generatedOTP) {
    navigate('/auth');
    return null;
  }

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otp.join('');

    if (enteredOtp === generatedOTP) {
      // Fetch admin user data from Firestore and set as logged in
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const adminUser = auth.currentUser;
        if (userDoc.exists()) {
          setUser({ ...adminUser, ...userDoc.data(), isAdmin: true });
        } else {
          setUser({ uid, email, isAdmin: true });
        }
        navigate('/dashboard');
      } catch (err) {
        setUser({ uid, email, isAdmin: true });
        navigate('/dashboard');
      }
    } else {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-beige-900 border-beige-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-12 text-center"
      >
        <div className="w-20 h-20 bg-beige-100 rounded-full flex items-center justify-center text-beige-800 mx-auto mb-8">
          <ShieldCheck size={40} />
        </div>
        
        <h2 className="serif text-3xl mb-4">OTP Verification</h2>
        <p className="text-beige-600 mb-10">
          We've sent a verification code to <br />
          <span className="font-semibold text-beige-900">{email}</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 mb-8">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                className="w-12 h-14 bg-beige-50 border border-beige-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-beige-800 focus:outline-none"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <button type="submit" className="w-full btn-luxury py-4 mb-6">
            Verify & Continue
          </button>
        </form>

        <button 
          onClick={() => navigate('/auth')}
          className="flex items-center justify-center gap-2 text-beige-500 hover:text-beige-800 transition-colors mx-auto"
        >
          <ArrowLeft size={16} /> Back to Sign In
        </button>
      </motion.div>
    </div>
  );
}
