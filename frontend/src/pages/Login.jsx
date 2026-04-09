import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    setCaptcha({ num1: Math.floor(Math.random() * 5) + 1, num2: Math.floor(Math.random() * 5) + 1, answer: '' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (parseInt(captcha.answer) !== captcha.num1 + captcha.num2) {
      setError("CAPTCHA Verification Failed.");
      generateCaptcha();
      return;
    }
    
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.userId);
      localStorage.setItem('userRole', res.data.user.role);
      
      if(res.data.user.role === 'ADMIN') window.location.href = '/admin';
      else if(res.data.user.role === 'OWNER') window.location.href = '/owner';
      else window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Login Failed');
      generateCaptcha();
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-800/60 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur">
      <h2 className="text-3xl font-bold mb-6">Welcome Back</h2>
      {error && <p className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-slate-400 mb-2">Email</label>
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-slate-400 mb-2">Password</label>
          <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" />
        </div>

        <div className="bg-slate-900/50 border border-indigo-500/30 p-4 rounded-lg flex items-center justify-between mt-4">
           <span className="font-mono text-indigo-300 font-bold tracking-widest text-md">🤖 Prove Human: {captcha.num1} + {captcha.num2} = </span>
           <input type="number" required placeholder="?" value={captcha.answer} onChange={e => setCaptcha({...captcha, answer: e.target.value})}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg p-2 text-center ml-2" />
        </div>

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold py-3 rounded-lg transition mt-4 shadow-lg shadow-indigo-600/30">
          Login
        </button>
      </form>
    </div>
  );
}
