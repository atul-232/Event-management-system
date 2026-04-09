import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../components/Notifications';

function CountdownTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft('EXPIRED');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${mins}m`);
      else setTimeLeft(`${hours}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${expired ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/10 text-amber-400 animate-pulse'}`}>
      ⏱️ {timeLeft}
    </span>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();
  const notify = useNotification();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    api.get('/events').then(res => setEvents(res.data.events)).catch(console.error);
  }, []);

  const joinWaitlist = async (eventId) => {
    try {
      await api.post('/waitlist/join', { userId, eventId, quantity: 1 });
      notify('Added to waitlist!', 'success');
    } catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <span className="text-indigo-400">⚡</span> Upcoming Events & Venues
      </h2>
      {events.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <span className="text-5xl block mb-3">🏗️</span>
          <p className="text-lg">No events available right now.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.Event_Id} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 p-6 rounded-2xl transition-all duration-300 group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold group-hover:text-indigo-400 transition">{event.Event_Name}</h3>
              <div className="flex gap-1">
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-xs font-bold">{event.Event_Type}</span>
                {event.KYC_Required ? <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs font-bold">🪪 KYC</span> : null}
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-2">📅 {new Date(event.Event_Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">Booking closes in:</p>
              <CountdownTimer deadline={event.Booking_Deadline} />
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700/50">
              <span className={`font-semibold px-3 py-1 rounded-full text-sm ${event.Available_Seats > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {event.Available_Seats > 0 ? `${event.Available_Seats} Seats left` : 'SOLD OUT'}
              </span>
              {localStorage.getItem('token') ? (
                event.Available_Seats > 0 ? (
                  <button onClick={() => navigate(`/book/${event.Event_Id}`)} 
                    className="text-white hover:text-indigo-400 font-bold transition flex items-center gap-2">
                    Book Now <span>&rarr;</span>
                  </button>
                ) : (
                  <button onClick={() => joinWaitlist(event.Event_Id)} 
                    className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-lg text-sm font-bold hover:bg-amber-500/20 transition">
                    ⏳ Join Waitlist
                  </button>
                )
              ) : (
                <button onClick={() => navigate('/login')} 
                  className="text-slate-400 hover:text-white border border-slate-600 px-4 py-1 rounded transition text-sm">
                  Login to Book
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

