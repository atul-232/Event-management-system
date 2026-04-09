import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../components/Notifications';

export default function OwnerDashboard() {
  const [businessStatus, setBusinessStatus] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [extendingEvent, setExtendingEvent] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [bestDays, setBestDays] = useState([]);
  const [checkinStats, setCheckinStats] = useState({});
  const [layoutSuggestion, setLayoutSuggestion] = useState(null);
  const [eventForm, setEventForm] = useState({ name: '', type: 'Concert', seats: 100, date: '', deadline: '', commission: 50 });

  const userId = localStorage.getItem('userId');
  const notify = useNotification();

  const getPage = () => window.location.hash.replace('#','') || 'properties';
  const [page, setPage] = useState(getPage());
  useEffect(() => {
    const handler = () => setPage(getPage());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const res = await api.get(`/business/status/${userId}`);
      if (res.data.business) {
        setBusinessStatus(res.data.business.Approval_Status);
        if (res.data.business.Approval_Status === 'APPROVED') {
          const evRes = await api.get(`/business/events/${userId}`);
          setMyEvents(evRes.data.events || []);
          try { const bkRes = await api.get(`/business/bookings/${userId}`); setMyBookings(bkRes.data.bookings || []); } catch(e){}
          try { const sRes = await api.get(`/owner/suggestions/${userId}`); setSuggestions(sRes.data.suggestions || []); setBestDays(sRes.data.bestDays || []); } catch(e){}
        }
      } else { setBusinessStatus(null); }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const applyForBusiness = async () => {
    try { await api.post('/business', { userId, fee: 5000 }); notify('Application submitted!', 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events/create', { ...eventForm, userId });
      notify('Property listed!', 'success');
      setEventForm({ name: '', type: 'Concert', seats: 100, date: '', deadline: '', commission: 50 });
      fetchAll();
    } catch(err) { notify(err.response?.data?.error || 'Error', 'error'); }
  };

  const updateCommission = async (eventId, rate) => {
    try { await api.post('/events/update-commission', { eventId, commissionRate: parseInt(rate) }); notify(`Commission: ₹${rate}/ticket`, 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const extendDeadline = async (eventId) => {
    if (!newDeadline) { notify("Select a deadline", 'warning'); return; }
    try {
      await api.post('/events/extend-deadline', { eventId, newDeadline: newDeadline.replace('T', ' ') + ':00' });
      notify('Deadline extended!', 'success'); setExtendingEvent(null); setNewDeadline(''); fetchAll();
    } catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const duplicateEvent = async (eventId) => {
    try { await api.post(`/events/duplicate/${eventId}`); notify('Event duplicated!', 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event? All bookings & tickets will be removed.')) return;
    try { await api.post('/admin/cancel-event', { eventId }); notify('Event deleted!', 'warning'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const loadCheckinStats = async (eventId) => {
    try { const res = await api.get(`/events/checkin-stats/${eventId}`); setCheckinStats(prev => ({...prev, [eventId]: res.data.stats})); }
    catch(err) { console.error(err); }
  };

  const loadLayout = async (type) => {
    try { const res = await api.get(`/venue/layout-suggestion/${type}`); setLayoutSuggestion(res.data.suggestion); }
    catch(err) { console.error(err); }
  };

  const isExpired = (d) => new Date(d) < new Date();

  if (loading) return <div className="text-center p-10 text-slate-400">Loading...</div>;

  const totalTicketsBooked = myEvents.reduce((sum, ev) => sum + (ev.Total_Seats - ev.Available_Seats), 0);
  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };

  const navItems = [
    { id: 'properties', label: '📋 Properties' }, { id: 'bookings', label: '👥 Bookings' },
    { id: 'create', label: '➕ Create' },
    { id: 'checkin', label: '🧾 Check-in' }, { id: 'suggestions', label: '🧠 Insights' },
    { id: 'layout', label: '📍 Layout' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏢</span>
          <div><h2 className="text-3xl font-bold">Owner Dashboard</h2><p className="text-slate-400 text-sm">Manage venues, properties & analytics</p></div>
        </div>
        <div className="flex items-center gap-3">
          {businessStatus === 'APPROVED' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">✅ Verified</span>}
          <button onClick={handleLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-2 rounded-lg transition text-sm font-bold">🚪 Logout</button>
        </div>
      </div>

      {error && <p className="text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
      {successMsg && <p className="text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">{successMsg}</p>}

      {/* Stats */}
      {businessStatus === 'APPROVED' && myEvents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-black text-indigo-400">{myEvents.length}</p><p className="text-slate-400 text-xs">Properties</p></div>
          <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-black text-emerald-400">{totalTicketsBooked}</p><p className="text-slate-400 text-xs">Tickets Booked</p></div>
          <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-black text-yellow-400">₹{myEvents.reduce((s,e)=>(s + (e.Total_Seats-e.Available_Seats)*(e.Commission_Rate||50)),0)}</p><p className="text-slate-400 text-xs">Commission</p></div>
          <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-black text-purple-400">{myEvents.reduce((s,e)=>s+e.Available_Seats,0)}</p><p className="text-slate-400 text-xs">Seats Left</p></div>
        </div>
      )}

      {/* Nav */}
      {businessStatus === 'APPROVED' && (
        <div className="grid grid-cols-6 gap-2">
          {navItems.map(n => (
            <a key={n.id} href={`#${n.id}`}
              className={`p-2 rounded-xl text-center text-xs font-bold transition border ${page === n.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'}`}>
              {n.label}
            </a>
          ))}
        </div>
      )}

      {businessStatus === null && (
        <div className="bg-slate-800/60 p-8 rounded-2xl border border-indigo-500/50 text-center">
          <span className="text-5xl block mb-4">🚀</span>
          <h3 className="text-2xl font-bold mb-3">Start Earning from your Properties</h3>
          <p className="text-slate-400 mb-6">Register your Business Account by paying ₹5000 Setup Fee.</p>
          <button onClick={applyForBusiness} className="bg-indigo-600 hover:bg-indigo-700 font-bold py-3 px-10 rounded-lg transition">💳 Pay ₹5000 & Apply</button>
        </div>
      )}

      {businessStatus === 'PENDING' && (
        <div className="bg-orange-500/10 border border-orange-500/50 p-8 rounded-2xl text-center">
          <span className="text-5xl block mb-3">⏳</span>
          <h3 className="text-xl font-bold text-orange-400 mb-2">Application Under Review</h3>
          <p className="text-orange-200/80">Admin must approve before you can list properties.</p>
        </div>
      )}

      {businessStatus === 'APPROVED' && (
        <>
          {/* PROPERTIES PAGE */}
          {page === 'properties' && (
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-indigo-400 mb-4">📋 Your Properties ({myEvents.length})</h3>
              {myEvents.length === 0 ? <p className="text-center py-10 text-slate-500">No properties. Use Create tab!</p> : (
                <div className="grid md:grid-cols-2 gap-4">
                  {myEvents.map(ev => (
                    <div key={ev.Event_Id} className="bg-slate-900/70 border border-slate-700/50 p-5 rounded-xl">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-bold">{ev.Event_Name}</h4>
                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-xs font-bold">{ev.Event_Type}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-400"><span>📅 Event Date</span><span className="text-white">{new Date(ev.Event_Date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>
                        <div className="flex justify-between text-slate-400"><span>🛡️ Status</span><span className={`font-bold ${ev.Approval_Status === 'APPROVED' ? 'text-emerald-400' : ev.Approval_Status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400 animate-pulse'}`}>{ev.Approval_Status === 'PENDING' ? '⏳ PENDING APPROVAL' : ev.Approval_Status}</span></div>
                        <div className="flex justify-between text-slate-400"><span>⏱️ Deadline</span><span className={`font-bold ${isExpired(ev.Booking_Deadline)?'text-red-400':'text-amber-400'}`}>{isExpired(ev.Booking_Deadline)?'❌ EXPIRED':new Date(ev.Booking_Deadline).toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between text-slate-400"><span>💺 Seats</span><span className={`font-bold ${ev.Available_Seats>0?'text-emerald-400':'text-red-400'}`}>{ev.Available_Seats}/{ev.Total_Seats}</span></div>
                        <div className="flex justify-between text-slate-400"><span>💰 Commission</span><span className="text-yellow-400 font-bold">₹{ev.Commission_Rate||50}/ticket</span></div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{width:`${((ev.Total_Seats-ev.Available_Seats)/ev.Total_Seats)*100}%`}}></div>
                        </div>
                        <div className="flex gap-2">
                          {extendingEvent === ev.Event_Id ? (
                            <div className="flex gap-2 flex-1">
                              <input type="datetime-local" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm" />
                              <button onClick={()=>extendDeadline(ev.Event_Id)} className="bg-amber-600 px-3 py-1 rounded-lg text-sm font-bold">Save</button>
                              <button onClick={()=>setExtendingEvent(null)} className="text-slate-400 px-2 text-sm">✕</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={()=>setExtendingEvent(ev.Event_Id)} className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 py-2 rounded-lg text-xs font-bold">⏱️ Extend</button>
                              <button onClick={()=>duplicateEvent(ev.Event_Id)} className="flex-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-2 rounded-lg text-xs font-bold">📋 Duplicate</button>
                              <button onClick={()=>deleteEvent(ev.Event_Id)} className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition">🗑️ Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS PAGE */}
          {page === 'bookings' && (
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-cyan-400 mb-4">👥 Ticket Bookings ({myBookings.length})</h3>
              {myBookings.length === 0 ? <p className="text-center py-10 text-slate-500">No bookings yet for your events.</p> : (
                <div className="space-y-3">
                  {myBookings.map(bk => (
                    <div key={bk.Booking_Id} className="bg-slate-900/70 border border-slate-700/50 p-4 rounded-xl">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">👤</span>
                            <span className="font-bold text-white">{bk.UserName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              bk.Booking_Status === 'CONFIRMED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              bk.Booking_Status === 'CANCELLED' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                              'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>{bk.Booking_Status}</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <p>📧 {bk.UserEmail} &nbsp;•&nbsp; 📱 {bk.Phone_Number}</p>
                            <p>🎪 <span className="text-indigo-400 font-semibold">{bk.Event_Name}</span> ({bk.Event_Type}) &nbsp;•&nbsp; 📅 {new Date(bk.Event_Date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-lg font-black text-indigo-400">{bk.Quantity}</p>
                            <p className="text-[10px] text-slate-500">Tickets</p>
                          </div>
                          {bk.payment && (
                            <div className="text-center">
                              <p className="text-lg font-black text-yellow-400">₹{bk.payment.Amount}</p>
                              <p className={`text-[10px] font-bold ${
                                bk.payment.Payment_Status === 'SUCCESS' ? 'text-emerald-400' :
                                bk.payment.Payment_Status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                              }`}>{bk.payment.Payment_Status}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {bk.tickets && bk.tickets.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 mb-1.5">🎫 Seats:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {bk.tickets.map(t => (
                              <span key={t.Ticket_Id} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-mono">{t.Seat_Number}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-slate-600">Booking #{bk.Booking_Id} • {new Date(bk.Booking_Date).toLocaleDateString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE PAGE */}
          {page === 'create' && (
            <div className="bg-slate-800/60 p-8 rounded-2xl border border-emerald-500/30">
              <h3 className="text-2xl font-bold text-emerald-400 mb-6">➕ Create New Property</h3>
              <form onSubmit={createEvent} className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1">Event / Property Name</label>
                  <input type="text" required value={eventForm.name} onChange={e=>setEventForm({...eventForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Type</label>
                  <select value={eventForm.type} onChange={e=>setEventForm({...eventForm, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white">
                    <option>Concert</option><option>Marriage</option><option>Conference</option><option>Sports</option><option>College Fest</option><option>Show</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Event Date</label>
                  <input type="date" required value={eventForm.date} onChange={e=>setEventForm({...eventForm, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Booking Deadline</label>
                  <input type="datetime-local" required value={eventForm.deadline} onChange={e=>setEventForm({...eventForm, deadline: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Total Seats</label>
                  <input type="number" min="10" required value={eventForm.seats} onChange={e=>setEventForm({...eventForm, seats: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Commission (₹/ticket)</label>
                  <input type="number" min="0" required value={eventForm.commission} onChange={e=>setEventForm({...eventForm, commission: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
                </div>
                <button type="submit" className="md:col-span-2 mt-4 bg-emerald-600 hover:bg-emerald-700 font-bold py-3 text-lg rounded-lg transition">🚀 Publish to Market</button>
              </form>
            </div>
          )}

          {/* CHECK-IN PAGE (Feature 15) */}
          {page === 'checkin' && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🧾 Event Check-in Dashboard</h3>
              {myEvents.map(ev => {
                const stats = checkinStats[ev.Event_Id];
                return (
                  <div key={ev.Event_Id} className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold">{ev.Event_Name} <span className="text-xs text-slate-500">{ev.Event_Type}</span></h4>
                      <button onClick={() => loadCheckinStats(ev.Event_Id)} className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg text-xs font-bold transition">🔄 Load Stats</button>
                    </div>
                    {stats && (
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-700">
                          <p className="text-2xl font-black text-indigo-400">{stats.totalTickets || 0}</p>
                          <p className="text-slate-400 text-xs">Total Tickets</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-lg text-center border border-emerald-500/30">
                          <p className="text-2xl font-black text-emerald-400">{stats.checkedIn || 0}</p>
                          <p className="text-slate-400 text-xs">Checked In</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-lg text-center border border-amber-500/30">
                          <p className="text-2xl font-black text-amber-400">{stats.remaining || 0}</p>
                          <p className="text-slate-400 text-xs">Remaining</p>
                        </div>
                        <div className="col-span-3">
                          <div className="w-full bg-slate-700 rounded-full h-4">
                            <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{width:`${stats.totalTickets > 0 ? (stats.checkedIn/stats.totalTickets)*100 : 0}%`}}></div>
                          </div>
                          <p className="text-center text-sm text-slate-400 mt-1">{stats.totalTickets > 0 ? Math.round((stats.checkedIn/stats.totalTickets)*100) : 0}% checked in</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SUGGESTIONS PAGE (Feature 8) */}
          {page === 'suggestions' && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🧠 Smart Insights & Suggestions</h3>
              {suggestions.length === 0 ? <p className="text-slate-500 text-center py-10">List more events to see insights!</p> : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <h4 className="font-bold text-indigo-400 mb-3">📊 Performance by Type</h4>
                    {suggestions.map((s,i) => (
                      <div key={i} className="mb-3">
                        <div className="flex justify-between text-sm mb-1"><span>{s.Event_Type}</span><span className="text-emerald-400 font-bold">{s.AvgFillRate}% fill</span></div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{width:`${s.AvgFillRate}%`}}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{s.EventCount} events • Avg ₹{Math.round(s.AvgCommission)}/ticket</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
                    <h4 className="font-bold text-purple-400 mb-3">📅 Best Days for Bookings</h4>
                    {bestDays.length === 0 ? <p className="text-slate-500 text-sm">Not enough data yet</p> : (
                      bestDays.map((d,i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                          <span className="text-sm">{d.Day}</span>
                          <span className="text-purple-400 font-bold">{d.Count} bookings</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="md:col-span-2 bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl">
                    <h4 className="font-bold text-emerald-400 mb-2">💡 Recommendation</h4>
                    {suggestions[0] && <p className="text-sm text-slate-300">Your best performing event type is <span className="text-emerald-400 font-bold">{suggestions[0].Event_Type}</span> with {suggestions[0].AvgFillRate}% fill rate. Consider listing more of this type with ₹{Math.round(suggestions[0].AvgCommission)} commission.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAYOUT PAGE (Feature 16) */}
          {page === 'layout' && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">📍 Venue Layout Suggestions</h3>
              <div className="flex flex-wrap gap-2">
                {['Concert','Marriage','Conference','Sports','College Fest','Show'].map(t => (
                  <button key={t} onClick={() => loadLayout(t)} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${layoutSuggestion && layoutSuggestion.type === t ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {layoutSuggestion && (
                <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl">
                  <h4 className="text-lg font-bold text-indigo-400 mb-3">🏗️ {layoutSuggestion.layout}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {layoutSuggestion.sections.map((s,i) => (
                      <div key={i} className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-center">
                        <span className="text-2xl block mb-1">{['🎤','👥','🪑','🎭'][i]}</span>
                        <p className="text-sm font-bold">{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    <p className="text-sm text-amber-400">💡 {layoutSuggestion.tip}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
