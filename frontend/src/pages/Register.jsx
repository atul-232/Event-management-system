import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'CUSTOMER', address: '', age: '', gender: 'Male', proofId: '', country: 'India (+91)' });
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    setCaptcha({ num1: Math.floor(Math.random() * 10) + 1, num2: Math.floor(Math.random() * 10) + 1, answer: '' });
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (parseInt(captcha.answer) !== captcha.num1 + captcha.num2) {
      setError("CAPTCHA Verification Failed. Are you a bot?");
      generateCaptcha();
      return;
    }
    if (!validateEmail(formData.email)) {
      setError("Please put gmail in the proper format (e.g. user@domain.com)");
      return;
    }
    if (!validatePassword(formData.password)) {
      setError("Weak Password! Must be at least 8 chars, 1 uppercase, 1 number, and 1 special symbol.");
      return;
    }

    // Phone Country Logic Verification
    const onlyNums = /^\d+$/.test(formData.phone);
    if (!onlyNums) return setError("Phone number must contain absolute digits only.");
    if (formData.country.includes('India') && formData.phone.length !== 10) return setError("Indian phone numbers must be exactly 10 digits.");
    if (formData.country.includes('USA') && formData.phone.length !== 10) return setError("US phone numbers must be exactly 10 digits.");
    if (formData.country.includes('UK') && (formData.phone.length < 10 || formData.phone.length > 11)) return setError("UK phone numbers must be 10-11 digits.");


    try {
      await api.post('/auth/register', formData);
      alert("Registration Successful!");
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed internally. Check DB logs.');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800/60 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur">
      <h2 className="text-3xl font-bold mb-6">Create Account</h2>
      {error && <p className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
      <form onSubmit={handleRegister} className="space-y-4">
        <input type="text" placeholder="Full Name" required onChange={e => setFormData({...formData, name: e.target.value})}
               className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
        <input type="email" placeholder="Email Address (e.g., you@company.com)" required onChange={e => setFormData({...formData, email: e.target.value})}
               className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />

        {/* Detailed Profile Info */}
        <div className="grid grid-cols-2 gap-4">
            <select onChange={e => setFormData({...formData, country: e.target.value})} value={formData.country}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 text-slate-300">
               <option value="India (+91)">India (+91)</option>
               <option value="USA (+1)">USA (+1)</option>
               <option value="UK (+44)">UK (+44)</option>
            </select>
            <input type="tel" placeholder="Phone Number (Digits only)" required onChange={e => setFormData({...formData, phone: e.target.value})}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
        </div>

        <input type="text" placeholder="Full Home/Office Address" required onChange={e => setFormData({...formData, address: e.target.value})}
               className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
        
        <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Age" required onChange={e => setFormData({...formData, age: e.target.value})} min="18" max="120"
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
            <select onChange={e => setFormData({...formData, gender: e.target.value})} value={formData.gender}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 text-slate-300">
               <option value="Male">Male</option>
               <option value="Female">Female</option>
               <option value="Other">Other</option>
            </select>
        </div>

        <input type="text" placeholder="Government/Govt. ID Proof (e.g. SSN/Aadhar)" required onChange={e => setFormData({...formData, proofId: e.target.value})}
               className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />

        <select onChange={e => setFormData({...formData, role: e.target.value})} value={formData.role}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 text-slate-300">
           <option value="CUSTOMER">Standard Customer</option>
           <option value="OWNER">Venue Owner (Business Account)</option>
        </select>

        <input type="password" placeholder="Secure Password" required onChange={e => setFormData({...formData, password: e.target.value})}
               className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
        <p className="text-xs text-slate-500">Requires 8+ chars, uppercase, number, & special character (!@#$).</p>

        <div className="bg-slate-900/50 border border-indigo-500/30 p-4 rounded-lg flex items-center justify-between">
           <span className="font-mono text-indigo-300 font-bold tracking-widest text-lg">🤖 CAPTCHA: {captcha.num1} + {captcha.num2} = </span>
           <input type="number" required placeholder="?" value={captcha.answer} onChange={e => setCaptcha({...captcha, answer: e.target.value})}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-2 text-center ml-2" />
        </div>
        
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-3 text-lg rounded-lg transition mt-4 shadow-lg shadow-indigo-600/30">
          Verify & Register
        </button>
      </form>
    </div>
  );
}
