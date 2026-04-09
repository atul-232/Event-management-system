import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const PRICE_PER_TICKET = 500;

export default function Payment() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const qty = parseInt(searchParams.get('qty')) || 1;
  const totalAmount = qty * PRICE_PER_TICKET;

  const processPayment = async () => {
    try {
      await api.post('/payment', { bookingId, amount: totalAmount });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment Error');
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto bg-slate-800/60 p-8 rounded-2xl border border-amber-500/30 text-center shadow-xl">
        <span className="text-5xl block mb-4">⏳</span>
        <h2 className="text-2xl font-bold text-amber-400 mb-3">Payment Submitted!</h2>
        <p className="text-slate-400 mb-2">Your payment is now <span className="text-yellow-400 font-bold">PENDING</span> admin approval.</p>
        <p className="text-slate-500 text-sm mb-6">Once the admin reviews and approves your payment, your booking will be confirmed and tickets with QR codes will be generated automatically.</p>
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700 text-left mb-6 space-y-2">
          <p className="text-sm text-slate-400">Booking Ref: <span className="text-white font-mono">#{bookingId}</span></p>
          <p className="text-sm text-slate-400">Tickets: <span className="text-white font-bold">{qty}</span></p>
          <p className="text-sm text-slate-400">Price per Ticket: <span className="text-white">₹{PRICE_PER_TICKET}</span></p>
          <p className="text-sm text-slate-400">Total Amount: <span className="text-emerald-400 font-bold text-lg">₹{totalAmount.toLocaleString('en-IN')}</span></p>
          <p className="text-sm text-slate-400">Status: <span className="text-yellow-400 font-bold">⏳ Waiting for Admin Approval</span></p>
        </div>
        <button onClick={() => navigate('/my-account')} className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-bold transition">
          Go to My Account →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-800/60 p-8 rounded-2xl border border-slate-700 text-center shadow-xl backdrop-blur">
      <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
      <p className="text-slate-400 mb-2">Booking Reference: #{bookingId}</p>
      <p className="text-sm text-amber-400/80 mb-6 bg-amber-500/5 border border-amber-500/20 p-2 rounded">
        ⚠️ After payment, your booking stays PENDING until Admin approves it.
      </p>
      {error && <p className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
      
      <div className="bg-slate-900/60 p-5 rounded-lg border border-slate-700 mb-6 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Tickets</span>
          <span className="text-white font-bold">{qty}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Price per Ticket</span>
          <span className="text-white">₹{PRICE_PER_TICKET}</span>
        </div>
        <hr className="border-slate-700" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400 font-bold">Total Amount</span>
          <span className="text-2xl font-bold text-emerald-400">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <button onClick={processPayment} 
        className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition text-lg">
        💳 Pay ₹{totalAmount.toLocaleString('en-IN')}
      </button>
      <p className="mt-4 text-xs text-slate-500">Payment will be reviewed by the Admin before confirmation.</p>
    </div>
  );
}
