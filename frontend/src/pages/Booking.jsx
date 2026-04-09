import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Booking() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [qty, setQty] = useState(1);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/login'); return; }
    
    // Fetch event details
    api.get('/events').then(res => {
      const found = res.data.events.find(e => String(e.Event_Id) === String(eventId));
      if (found) setEvent(found);
    }).catch(console.error);
  }, [eventId, navigate]);

  const handleBooking = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/login'); return; }
    
    if (!memberName || !memberEmail || !memberPhone) {
      setError("Please fill in all member details.");
      return;
    }

    try {
      const res = await api.post('/booking', { userId, eventId, quantity: qty });
      navigate(`/payment/${res.data.bookingId}?qty=${qty}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize booking');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Event Summary Card */}
      {event && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-2">{event.Event_Name}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>🎪 {event.Event_Type}</span>
            <span>📅 {new Date(event.Event_Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="text-emerald-400 font-bold">💺 {event.Available_Seats} seats left</span>
          </div>
        </div>
      )}

      {/* Booking Form */}
      <div className="bg-slate-800/60 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur">
        <h2 className="text-2xl font-bold mb-6">Complete Booking</h2>
        {error && <p className="text-red-400 mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
        
        <form onSubmit={handleBooking} className="space-y-4">
          <div>
            <label className="block text-slate-400 mb-1 text-sm">Full Name of Primary Member</label>
            <input type="text" required value={memberName} onChange={e => setMemberName(e.target.value)}
                   placeholder="e.g. Atul Pandey"
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 text-sm">Email Address</label>
            <input type="email" required value={memberEmail} onChange={e => setMemberEmail(e.target.value)}
                   placeholder="e.g. atul@gmail.com"
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 text-sm">Phone Number</label>
            <input type="tel" required value={memberPhone} onChange={e => setMemberPhone(e.target.value)}
                   placeholder="e.g. 9354428960"
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 text-sm">Number of Tickets</label>
            <input type="number" min="1" max={event?.Available_Seats || 10} required value={qty} onChange={(e) => setQty(parseInt(e.target.value))}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500 transition" />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-3 text-lg rounded-lg transition shadow-lg shadow-indigo-600/30 mt-4">
            Reserve Tickets →
          </button>
        </form>
      </div>
    </div>
  );
}
