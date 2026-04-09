import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../components/Notifications';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDeadline, setEditDeadline] = useState('');
  const [editSeats, setEditSeats] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userActivity, setUserActivity] = useState({ bookings: [], payments: [] });
  const [analytics, setAnalytics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [blacklisted, setBlacklisted] = useState([]);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [adminTransfers, setAdminTransfers] = useState([]);
  const [adminWaitlist, setAdminWaitlist] = useState([]);

  const getPage = () => window.location.hash.replace('#','') || 'overview';
  const [page, setPage] = useState(getPage());
  useEffect(() => {
    const handler = () => setPage(getPage());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => { fetchAll(); }, []);
  const notify = useNotification();

  const fetchAll = async () => {
    try {
      const [sRes, uRes, bRes, eRes, pRes, bkRes] = await Promise.all([
        api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/businesses'),
        api.get('/admin/events'), api.get('/admin/payments'), api.get('/admin/bookings')
      ]);
      setStats(sRes.data.stats || {}); setUsers(uRes.data.users || []);
      setBusinesses(bRes.data.businesses || []); setEvents(eRes.data.events || []);
      setPayments(pRes.data.payments || []); setBookings(bkRes.data.bookings || []);
      // Fetch extras
      try { const aRes = await api.get('/admin/analytics'); setAnalytics(aRes.data.analytics); } catch(e){}
      try { const prRes = await api.get('/admin/predictions'); setPredictions(prRes.data.predictions || []); } catch(e){}
      try { const blRes = await api.get('/admin/blacklisted'); setBlacklisted(blRes.data.blacklisted || []); } catch(e){}
      try { const trRes = await api.get('/admin/transfers'); setAdminTransfers(trRes.data.transfers || []); } catch(e){}
      try { const waRes = await api.get('/admin/waitlist'); setAdminWaitlist(waRes.data.waitlist || []); } catch(e){}
    } catch(err) { console.error(err); }
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/login'; };
  const approveBusiness = async (id) => { await api.post('/admin/approve-business', { businessId: id }); notify('Business approved!', 'success'); fetchAll(); };
  const approveEvent = async (id) => {
    try { await api.post('/admin/events/approve', { eventId: id }); notify('Event approved and live!', 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Approval failed', 'error'); }
  };
  const rejectEvent = async (id) => {
    try { await api.post('/admin/events/reject', { eventId: id }); notify('Event rejected.', 'warning'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Rejection failed', 'error'); }
  };
  const removeEvent = async (id) => {
    if (!window.confirm("Delete this event listing (and all its data) completely?")) return;
    try { await api.delete(`/admin/events/${id}`); notify('Event removed from platform.', 'warning'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Removal failed', 'error'); }
  };
  const cancelBooking = async (id) => { if (!window.confirm("Cancel this booking?")) return; await api.post('/admin/cancel-booking', { bookingId: id }); notify('Booking cancelled.', 'warning'); fetchAll(); };
  const cancelTicket = async (ticketId, bookingId) => {
    if (!window.confirm("Cancel this ticket?")) return;
    try { await api.post('/tickets/cancel', { ticketId, bookingId }); notify('Ticket cancelled.', 'info'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };
  const approvePayment = async (id) => {
    try { await api.post('/admin/approve-payment', { paymentId: id }); notify('Payment approved!', 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };
  const extendDeadline = async (eventId) => {
    if (!editDeadline) return notify("Select a deadline", 'warning');
    await api.post('/events/extend-deadline', { eventId, newDeadline: editDeadline.replace('T', ' ') + ':00' });
    notify('Deadline extended!', 'success'); setEditingEvent(null); setEditDeadline(''); fetchAll();
  };
  const updateSeats = async (eventId) => {
    try { await api.post('/events/update-seats', { eventId, newTotal: parseInt(editSeats) }); notify('Seats updated!', 'success'); setEditingEvent(null); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || "Failed", 'error'); }
  };
  const updateCommission = async (eventId) => {
    try { await api.post('/events/update-commission', { eventId, commissionRate: parseInt(editCommission) }); notify(`Commission set to ₹${editCommission}/ticket`, 'success'); setEditingEvent(null); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || "Failed", 'error'); }
  };
  const blacklistUser = async (userId) => {
    try { await api.post('/admin/blacklist', { userId, reason: blacklistReason || 'Admin action' }); notify('User blacklisted!', 'warning'); setBlacklistReason(''); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || "Failed", 'error'); }
  };
  const unblacklistUser = async (userId) => {
    try { await api.post('/admin/unblacklist', { userId }); notify('User unblocked.', 'success'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || "Failed", 'error'); }
  };
  const toggleOverbooking = async (eventId, allow) => {
    try { await api.post('/events/toggle-overbooking', { eventId, allow, pct: 10 }); notify(allow ? 'Overbooking ON' : 'Overbooking OFF', 'info'); fetchAll(); }
    catch(err) { notify('Failed', 'error'); }
  };
  const toggleKYC = async (eventId, kycRequired) => {
    try { await api.post('/events/toggle-kyc', { eventId, kycRequired }); notify(kycRequired ? 'KYC enabled' : 'KYC disabled', 'info'); fetchAll(); }
    catch(err) { notify('Failed', 'error'); }
  };
  const viewUserActivity = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    try {
      const res = await api.get(`/admin/user-activity/${userId}`);
      setUserActivity({ bookings: res.data.bookings || [], payments: res.data.payments || [] });
      setExpandedUser(userId);
    } catch(err) { console.error(err); }
  };

  const statusBadge = (s) => s === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : s === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30';
  const riskColor = (r) => r === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/30' : r === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  const isBlacklisted = (userId) => blacklisted.some(b => b.UserId === userId);

  const navItems = [
    { id: 'overview', label: '📊 Overview' }, { id: 'events', label: '🎪 Events' },
    { id: 'members', label: '👥 Members' }, { id: 'bookings', label: '🎫 Bookings' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'transfers', label: '🔄 Transfers' },
    { id: 'waitlist', label: '⏳ Waitlist' },
    { id: 'users', label: '👥 Users' },
    { id: 'analytics', label: '📈 Analytics' }, { id: 'predictions', label: '🧠 Predictions' },
    { id: 'blacklist', label: '🚫 Blacklist' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div><h2 className="text-3xl font-bold">Admin Control Panel</h2><p className="text-slate-400 text-sm">Supreme authority — Only 1 Admin</p></div>
        </div>
        <button onClick={handleLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-5 py-2 rounded-lg transition font-bold">🚪 Logout</button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
        {navItems.map(n => (
          <a key={n.id} href={`#${n.id}`}
            className={`p-2 rounded-xl text-center text-xs font-bold transition border ${page === n.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-indigo-500/50 hover:text-white'}`}>
            {n.label}
          </a>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {page === 'overview' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">📊 System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl text-center"><p className="text-3xl font-black text-indigo-400">{stats.totalUsers||0}</p><p className="text-slate-400 text-sm">Users</p></div>
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl text-center"><p className="text-3xl font-black text-purple-400">{stats.totalEvents||0}</p><p className="text-slate-400 text-sm">Events</p></div>
            <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-center">
              <p className="text-3xl font-black text-indigo-400">{adminTransfers.length}</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Transfers</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-center">
              <p className="text-3xl font-black text-amber-400">{adminWaitlist.length}</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Waitlisted</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl text-center"><p className="text-3xl font-black text-yellow-400">₹{stats.totalRevenue||0}</p><p className="text-slate-400 text-sm">Revenue</p></div>
            <div className="bg-slate-800/60 border border-orange-500/30 p-5 rounded-xl text-center"><p className="text-3xl font-black text-orange-400">{stats.pendingBusinesses||0}</p><p className="text-slate-400 text-sm">Pending</p></div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl">
            <h4 className="font-bold text-indigo-400 mb-3">Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <p className="text-slate-400">Customers: <span className="text-white font-bold">{users.filter(u=>u.Role==='CUSTOMER').length}</span></p>
              <p className="text-slate-400">Owners: <span className="text-white font-bold">{users.filter(u=>u.Role==='OWNER').length}</span></p>
              <p className="text-slate-400">Blacklisted: <span className="text-red-400 font-bold">{blacklisted.length}</span></p>
              <p className="text-slate-400">Confirmed: <span className="text-emerald-400 font-bold">{bookings.filter(b=>b.Booking_Status==='CONFIRMED').length}</span></p>
              <p className="text-slate-400">Pending: <span className="text-yellow-400 font-bold">{bookings.filter(b=>b.Booking_Status==='PENDING').length}</span></p>
              <p className="text-slate-400">Commission: <span className="text-yellow-400 font-bold">₹{events.reduce((s,e)=>(s + (e.Total_Seats-e.Available_Seats) * (e.Commission_Rate||50)),0)}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ===== EVENTS ===== */}
      {page === 'events' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🎪 Event Management ({events.length})</h3>
          {events.map(ev => (
            <div key={ev.Event_Id} className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="text-lg font-bold">{ev.Event_Name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${ev.Approval_Status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ev.Approval_Status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                      {ev.Approval_Status}
                    </span>
                    <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs">{ev.Event_Type}</span>
                    {ev.KYC_Required ? <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-xs">🪪 KYC</span> : null}
                    {ev.Allow_Overbooking ? <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs">📈 Overbook</span> : null}
                    {new Date(ev.Booking_Deadline) < new Date() && <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">EXPIRED</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>📅 {new Date(ev.Event_Date).toLocaleDateString('en-IN')}</span>
                    <span>💺 {ev.Available_Seats}/{ev.Total_Seats}</span>
                    <span className="text-yellow-400 font-bold">💰 ₹{ev.Commission_Rate||50}/ticket</span>
                  </div>
                </div>
                <div className="flex gap-2 self-start flex-wrap">
                  <button onClick={() => toggleKYC(ev.Event_Id, !ev.KYC_Required)} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-xs font-bold">{ev.KYC_Required ? '🪪 KYC On' : 'KYC Off'}</button>
                  <button onClick={() => toggleOverbooking(ev.Event_Id, !ev.Allow_Overbooking)} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold">{ev.Allow_Overbooking ? '📈 OB On' : 'OB Off'}</button>
                  <button onClick={() => { setEditingEvent(editingEvent === ev.Event_Id ? null : ev.Event_Id); setEditSeats(ev.Total_Seats); setEditCommission(ev.Commission_Rate||50); }}
                    className="bg-slate-700/50 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs font-bold transition">⚙️ Settings</button>
                  {ev.Approval_Status === 'PENDING' && (
                    <>
                      <button onClick={() => approveEvent(ev.Event_Id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded text-xs font-bold transition">✅ Approve</button>
                      <button onClick={() => rejectEvent(ev.Event_Id)} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-1 rounded text-xs font-bold hover:bg-orange-500 hover:text-white transition">Reject ❌</button>
                    </>
                  )}
                  <button onClick={() => removeEvent(ev.Event_Id)}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 hover:text-white transition">Delete 🗑️</button>
                </div>
              </div>
              {editingEvent === ev.Event_Id && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Extend Deadline</label>
                    <div className="flex gap-2"><input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                    <button onClick={() => extendDeadline(ev.Event_Id)} className="bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-lg text-sm font-bold">Save</button></div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Total Seats</label>
                    <div className="flex gap-2"><input type="number" min="1" value={editSeats} onChange={e => setEditSeats(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                    <button onClick={() => updateSeats(ev.Event_Id)} className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-sm font-bold">Save</button></div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Commission ₹/ticket</label>
                    <div className="flex gap-2"><input type="number" min="0" value={editCommission} onChange={e => setEditCommission(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                    <button onClick={() => updateCommission(ev.Event_Id)} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-sm font-bold">Save</button></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== MEMBERS ===== */}
      {page === 'members' && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">👥 Member Management ({users.length})</h3>
          {users.map(u => (
            <div key={u.UserId} className={`bg-slate-800/60 border rounded-xl overflow-hidden ${isBlacklisted(u.UserId) ? 'border-red-500/50' : 'border-slate-700'}`}>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition" onClick={() => viewUserActivity(u.UserId)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">{u.Name.charAt(0).toUpperCase()}</div>
                  <div><p className="font-bold">{u.Name} {isBlacklisted(u.UserId) && <span className="text-red-400 text-xs">🚫 BLOCKED</span>}</p><p className="text-xs text-slate-500">{u.Email} • 📞 {u.Phone_Number}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">🎟️ {u.TotalTickets || 0} Seats</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.Role==='ADMIN'?'bg-red-500/10 text-red-400':u.Role==='OWNER'?'bg-purple-500/10 text-purple-400':'bg-indigo-500/10 text-indigo-400'}`}>{u.Role}</span>
                  {u.Role !== 'ADMIN' && !isBlacklisted(u.UserId) && (
                    <button onClick={(e) => { e.stopPropagation(); blacklistUser(u.UserId); }} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold hover:bg-red-500 hover:text-white transition">🚫 Block</button>
                  )}
                  {isBlacklisted(u.UserId) && (
                    <button onClick={(e) => { e.stopPropagation(); unblacklistUser(u.UserId); }} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold">✅ Unblock</button>
                  )}
                  <span className="text-slate-400">{expandedUser === u.UserId ? '🔼' : '🔽'}</span>
                </div>
              </div>
              {expandedUser === u.UserId && (
                <div className="border-t border-slate-700 p-4 bg-slate-900/50 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">📋 Bookings ({userActivity.bookings.length})</h4>
                    {userActivity.bookings.length === 0 ? <p className="text-slate-500 text-xs">None</p> : (
                      <div className="space-y-2">{userActivity.bookings.map(b => (
                        <div key={b.Booking_Id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${statusBadge(b.Booking_Status)}`}>{b.Booking_Status}</span>
                            <span className="text-sm">{b.Event_Name}</span><span className="text-xs text-slate-500">{b.Quantity} tickets</span>
                          </div>
                          {b.Booking_Status !== 'CANCELLED' && <button onClick={(e)=>{e.stopPropagation();cancelBooking(b.Booking_Id)}} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 hover:text-white transition">Cancel</button>}
                        </div>
                      ))}</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 mb-2">💳 Payments ({userActivity.payments.length})</h4>
                    {userActivity.payments.length === 0 ? <p className="text-slate-500 text-xs">None</p> : (
                      <div className="space-y-2">{userActivity.payments.map(p => (
                        <div key={p.Payment_Id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/50 text-sm">
                          <span className="font-mono text-xs text-slate-500">{p.Transaction_Id} — {p.Event_Name}</span>
                          <div className="flex items-center gap-3"><span className="font-bold text-emerald-400">₹{p.Amount}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.Payment_Status==='SUCCESS'?'bg-emerald-500/10 text-emerald-400':'bg-yellow-500/10 text-yellow-400'}`}>{p.Payment_Status}</span>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== BOOKINGS ===== */}
      {page === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h3 className="text-2xl font-bold">🎫 Booking Management ({bookings.length})</h3>
            <button onClick={async () => { try { await api.post('/admin/repair-seats'); notify('Seat counts repaired!', 'success'); fetchAll(); } catch(e) { notify('Failed', 'error'); } }}
              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-white transition">🔧 Repair Seats</button>
          </div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl text-center">
              <p className="text-2xl font-black text-emerald-400">{bookings.filter(b=>b.Booking_Status==='CONFIRMED').length}</p>
              <p className="text-xs text-slate-400">Confirmed</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl text-center">
              <p className="text-2xl font-black text-amber-400">{bookings.filter(b=>b.Booking_Status==='PENDING').length}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl text-center">
              <p className="text-2xl font-black text-red-400">{bookings.filter(b=>b.Booking_Status==='CANCELLED').length}</p>
              <p className="text-xs text-slate-400">Cancelled</p>
            </div>
          </div>
          {/* Booking Cards */}
          {bookings.map(b => (
            <div key={b.Booking_Id} className={`bg-slate-800/60 border rounded-xl p-5 ${b.Booking_Status==='CANCELLED' ? 'border-red-500/20 opacity-70' : 'border-slate-700'}`}>
              <div className="flex flex-col md:flex-row justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-lg">👤</span>
                    <span className="font-bold text-white text-lg">{b.UserName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge(b.Booking_Status)}`}>{b.Booking_Status}</span>
                    <span className="bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">#{b.Booking_Id}</span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>📧 {b.UserEmail} &nbsp;•&nbsp; 📱 {b.Phone_Number}</p>
                    <p>🎪 <span className="text-indigo-400 font-semibold">{b.Event_Name}</span> <span className="text-slate-500">({b.Event_Type})</span> &nbsp;•&nbsp; 📅 {new Date(b.Event_Date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</p>
                    <p>📆 Booked on: {new Date(b.Booking_Date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-2xl font-black text-indigo-400">{b.Quantity}</p>
                    <p className="text-[10px] text-slate-500">Tickets</p>
                  </div>
                  {b.Booking_Status !== 'CANCELLED' && (
                    <button onClick={() => cancelBooking(b.Booking_Id)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition text-sm font-bold">Cancel All</button>
                  )}
                </div>
              </div>
              {b.tickets && b.tickets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1.5">🎫 Seats ({b.tickets.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.tickets.map(t => (
                      <span key={t.Ticket_Id} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-mono inline-flex items-center gap-1 group">
                        {t.Seat_Number}
                        <button onClick={() => cancelTicket(t.Ticket_Id, b.Booking_Id)} className="text-red-400 font-bold opacity-40 group-hover:opacity-100 transition ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== TRANSFERS LOG ===== */}
      {page === 'transfers' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-3">🔄 Global Transfer Registry <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs">{adminTransfers.length}</span></h3>
          <div className="grid gap-3">
            {adminTransfers.map(tr => (
              <div key={tr.Transfer_Id} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center group">
                <div>
                  <p className="font-bold text-slate-200">{tr.Event_Name} — Ticket #{tr.Ticket_Id} (Seat {tr.Seat_Number})</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="text-indigo-400 font-bold">{tr.FromName}</span> ({tr.FromEmail}) 
                    <span className="mx-2">→</span> 
                    <span className="text-purple-400 font-bold">{tr.ToName}</span> ({tr.ToEmail})
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${tr.Status==='COMPLETED'?'text-emerald-400 bg-emerald-500/10':'text-amber-400 bg-amber-500/10'}`}>{tr.Status}</span>
                  <p className="text-[10px] text-slate-600 mt-2">{new Date(tr.Transfer_Date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== WAITLIST REGISTRY ===== */}
      {page === 'waitlist' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-3">⏳ Platform Waitlists <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs">{adminWaitlist.length}</span></h3>
          <div className="overflow-x-auto bg-slate-800/60 border border-slate-700/50 rounded-2xl">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-500 border-b border-slate-700/50"><th className="text-left p-4">User</th><th className="text-left p-4">Event</th><th className="text-left p-4">Qty</th><th className="text-left p-4">Status</th><th className="text-left p-4">Date</th></tr></thead>
              <tbody>{adminWaitlist.map(w => (
                <tr key={w.Waitlist_Id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition">
                  <td className="p-4"><div><p className="font-bold">{w.Name}</p><p className="text-xs text-slate-500">{w.Email}</p></div></td>
                  <td className="p-4"><div><p className="font-bold">{w.Event_Name}</p><p className="text-xs text-slate-500">{new Date(w.Event_Date).toLocaleDateString()}</p></div></td>
                  <td className="p-4 font-mono font-bold text-indigo-400">{w.Quantity}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${w.Status==='WAITING'?'text-amber-400':'text-emerald-400'}`}>{w.Status}</span></td>
                  <td className="p-4 text-xs text-slate-500">{new Date(w.Created_At).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PAYMENTS ===== */}
      {page === 'payments' && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">💳 Payment Management ({payments.length})</h3>
          <p className="text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">⚠️ Payments arrive PENDING. Click ✅ Approve to confirm booking & generate tickets.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left py-3 px-3">TXN ID</th><th className="text-left py-3 px-3">User</th><th className="text-left py-3 px-3">Event</th><th className="text-left py-3 px-3">Amount</th><th className="text-left py-3 px-3">Status</th><th className="text-left py-3 px-3">Booking</th><th className="text-left py-3 px-3">Action</th>
              </tr></thead>
              <tbody>{payments.map(p => (
                <tr key={p.Payment_Id} className="border-b border-slate-700/50 hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono text-xs text-slate-400">{p.Transaction_Id}</td>
                  <td className="py-3 px-3">{p.UserName}<br/><span className="text-xs text-slate-500">{p.UserEmail}</span></td>
                  <td className="py-3 px-3">{p.Event_Name}</td>
                  <td className="py-3 px-3 font-bold text-emerald-400">₹{p.Amount}</td>
                  <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs font-bold ${p.Payment_Status==='SUCCESS'?'bg-emerald-500/10 text-emerald-400':'bg-yellow-500/10 text-yellow-400'}`}>{p.Payment_Status}</span></td>
                  <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs font-bold border ${statusBadge(p.Booking_Status)}`}>{p.Booking_Status}</span></td>
                  <td className="py-3 px-3">
                    {p.Payment_Status === 'PENDING' && <button onClick={() => approvePayment(p.Payment_Id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition">✅ Approve</button>}
                    {p.Payment_Status === 'SUCCESS' && <span className="text-emerald-400 text-xs">✓ Done</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== BUSINESS ===== */}
      {page === 'business' && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🏢 Business Accounts ({businesses.length})</h3>
          {businesses.map(b => (
            <div key={b.Business_Id} className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl flex justify-between items-center">
              <div>
                <h4 className="font-bold">Business #{b.Business_Id}</h4>
                <p className="text-sm text-slate-400">👤 {b.OwnerName} ({b.OwnerEmail}) • Fee: ₹{b.Registration_Fee}</p>
                <span className={`px-2 py-1 rounded text-xs font-bold mt-1 inline-block ${b.Approval_Status==='APPROVED'?'bg-emerald-500/10 text-emerald-400':'bg-yellow-500/10 text-yellow-400'}`}>{b.Approval_Status}</span>
              </div>
              {b.Approval_Status === 'PENDING' && <button onClick={() => approveBusiness(b.Business_Id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-lg transition">✅ Approve</button>}
            </div>
          ))}
        </div>
      )}

      {/* ===== ANALYTICS (Feature 7) ===== */}
      {page === 'analytics' && analytics && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">📈 Demand Analytics & Heatmap</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sell Speed */}
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
              <h4 className="font-bold text-indigo-400 mb-3">🔥 Event Sell Speed</h4>
              {analytics.sellSpeed.map((e,i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{e.Event_Name}</span><span className="text-emerald-400 font-bold">{e.SellPct}%</span></div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div className={`h-3 rounded-full ${e.SellPct > 75 ? 'bg-red-500' : e.SellPct > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${e.SellPct}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
            {/* Revenue by Type */}
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
              <h4 className="font-bold text-emerald-400 mb-3">💰 Revenue by Event Type</h4>
              {analytics.revenueByType.map((r,i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                  <span className="text-sm">{r.Event_Type}</span>
                  <div className="text-right"><span className="text-emerald-400 font-bold">₹{r.Revenue}</span><span className="text-slate-500 text-xs ml-2">{r.Bookings} bookings</span></div>
                </div>
              ))}
            </div>
            {/* Cancellation Rate */}
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl text-center">
              <h4 className="font-bold text-amber-400 mb-3">📉 Cancellation Rate</h4>
              <p className="text-5xl font-black text-amber-400">{analytics.cancellationRate}%</p>
              <p className="text-slate-500 text-sm mt-2">of all bookings were cancelled</p>
            </div>
            {/* Peak Hours */}
            <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-xl">
              <h4 className="font-bold text-purple-400 mb-3">⏰ Peak Booking Hours</h4>
              {analytics.hourly.length === 0 ? <p className="text-slate-500 text-sm">No data yet</p> : (
                <div className="flex items-end gap-1 h-32">
                  {analytics.hourly.map((h,i) => {
                    const max = Math.max(...analytics.hourly.map(x => x.Count));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-slate-400">{h.Count}</span>
                        <div className="w-full bg-purple-500 rounded-t" style={{height: `${(h.Count/max)*100}%`}}></div>
                        <span className="text-xs text-slate-500">{h.BookingHour}h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== PREDICTIONS (Feature 9) ===== */}
      {page === 'predictions' && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🧠 Cancellation Predictions (AI-lite)</h3>
          <p className="text-slate-500 text-sm">Risk calculated from user's cancellation history and booking patterns.</p>
          {predictions.length === 0 ? <p className="text-slate-500 text-center py-10">No active bookings to analyze.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left py-3 px-3">Booking</th><th className="text-left py-3 px-3">User</th><th className="text-left py-3 px-3">Event</th><th className="text-left py-3 px-3">Qty</th><th className="text-left py-3 px-3">Cancel History</th><th className="text-left py-3 px-3">Risk</th>
                </tr></thead>
                <tbody>{predictions.map(p => (
                  <tr key={p.Booking_Id} className="border-b border-slate-700/50">
                    <td className="py-3 px-3">#{p.Booking_Id}</td>
                    <td className="py-3 px-3">{p.UserName}</td>
                    <td className="py-3 px-3">{p.Event_Name}</td>
                    <td className="py-3 px-3">{p.Quantity}</td>
                    <td className="py-3 px-3">{p.UserCancellations}/{p.UserTotalBookings} ({p.cancelRate}%)</td>
                    <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs font-bold border ${riskColor(p.risk)}`}>{p.risk}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== BLACKLIST (Feature 5) ===== */}
      {page === 'blacklist' && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold border-b border-slate-700 pb-2">🚫 Blacklisted Users ({blacklisted.length})</h3>
          {blacklisted.length === 0 ? <p className="text-slate-500 text-center py-10">No blocked users.</p> : (
            blacklisted.map(b => (
              <div key={b.Blacklist_Id} className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold">{b.Name} <span className="text-slate-500 text-xs">({b.Email})</span></p>
                  <p className="text-red-400 text-sm">Reason: {b.Reason}</p>
                  <p className="text-slate-500 text-xs">Blocked: {new Date(b.Blacklisted_At).toLocaleString('en-IN')}</p>
                </div>
                <button onClick={() => unblacklistUser(b.UserId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition">✅ Unblock</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
