import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { useNotification } from '../components/Notifications';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [payingTransferId, setPayingTransferId] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [refundInfo, setRefundInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferTicketId, setTransferTicketId] = useState(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' });

  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const notify = useNotification();

  const getPage = () => window.location.hash.replace('#','') || 'bookings';
  const [page, setPage] = useState(getPage());
  useEffect(() => {
    const h = () => setPage(getPage());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [bRes, pRes] = await Promise.all([api.get(`/bookings/user/${userId}`), api.get(`/payments/user/${userId}`)]);
      setBookings(bRes.data.bookings || []); setPayments(pRes.data.payments || []);
      try { const wRes = await api.get(`/waitlist/user/${userId}`); setWaitlist(wRes.data.waitlist || []); } catch(e){}
      try { const tRes = await api.get(`/tickets/transfers/${userId}`); setTransfers(tRes.data.transfers || []); } catch(e){}
      try { const gRes = await api.get(`/group-members/${userId}`); setGroupMembers(gRes.data.members || []); } catch(e){}
      try { const rRes = await api.get(`/rewards/${userId}`); setRewards(rRes.data.rewards); } catch(e){}
      try { const nRes = await api.get(`/notifications/${userId}`); setNotifications(nRes.data.notifications || []); } catch(e){}
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const refund = await api.get(`/refund/calculate/${bookingId}`);
      const r = refund.data;
      if (!window.confirm(`Refund: ₹${r.refundAmount} (${r.refundPct}%) — ${r.hoursLeft}h before event. Cancel?`)) return;
      await api.post('/refund', { bookingId }); notify(`Booking cancelled. Refund: ₹${r.refundAmount} (${r.refundPct}%)`, 'info'); fetchAll();
    } catch(err) { await api.post('/refund', { bookingId }); notify('Cancelled', 'info'); fetchAll(); }
  };

  const cancelSingleTicket = async (ticketId, bookingId) => {
    if (!window.confirm("Cancel this ticket?")) return;
    try { await api.post('/tickets/cancel', { ticketId, bookingId }); notify('Ticket cancelled.', 'info'); fetchAll(); }
    catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const transferTicket = async () => {
    if (!transferEmail) return notify('Enter recipient email', 'warning');
    try {
      await api.post('/tickets/transfer', { ticketId: transferTicketId, fromUserId: userId, toEmail: transferEmail });
      notify(`Ticket transferred to ${transferEmail}!`, 'success'); setTransferTicketId(null); setTransferEmail(''); fetchAll();
    } catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const addGroupMember = async (e) => {
    e.preventDefault();
    try {
      await api.post('/group-members', { userId, ...newMember });
      notify('Member saved!', 'success'); setNewMember({ name: '', email: '', phone: '' }); fetchAll();
    } catch(err) { notify('Failed', 'error'); }
  };

  const deleteGroupMember = async (memberId) => {
    try { await api.delete(`/group-members/${memberId}`); notify('Member removed', 'info'); fetchAll(); }
    catch(err) { notify('Failed', 'error'); }
  };

  const markRead = async (id) => {
    await api.post('/notifications/read', { reminderId: id }); fetchAll();
  };
  
  const submitTransferPayment = async (transferId) => {
    try {
      await api.post('/tickets/pay-transfer', { transferId, userId });
      notify('Payment submitted! Awaiting Admin approval.', 'success');
      setPayingTransferId(null);
      fetchAll();
    } catch(err) { notify(err.response?.data?.error || 'Failed', 'error'); }
  };

  const acceptTransfer = async (transferId) => {
    // This is now replaced by the inline payment UI
  };

  const rejectTransfer = async (transferId) => {
    try {
      await api.post('/tickets/reject-transfer', { transferId, userId });
      notify('Transfer rejected.', 'info'); fetchAll();
    } catch(err) { notify('Failed', 'error'); }
  };

  const statusColor = (s) => s === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : s === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30';
  const badgeEmoji = { NONE: '⚪', EARLY_BIRD: '🐣', FREQUENT_BOOKER: '⭐', VIP: '💎', SUPER_FAN: '🏆' };

  if (loading) return <div className="text-center p-10 text-slate-400">Loading...</div>;

  const navItems = [
    { id: 'bookings', label: '🎫 Bookings' }, { id: 'payments', label: '💳 Payments' },
    { id: 'waitlist', label: '⏳ Waitlist' }, { id: 'transfers', label: '🔄 Transfers' },
    { id: 'group', label: '👥 Group' }, { id: 'rewards', label: '🎮 Rewards' },
    { id: 'alerts', label: `🔔 Alerts ${notifications.filter(n=>!n.Is_Read).length > 0 ? `(${notifications.filter(n=>!n.Is_Read).length})` : ''}` },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👤</span>
          <div>
            <h2 className="text-3xl font-bold">My Account</h2>
            <p className="text-slate-400 text-sm">Bookings, tickets, rewards & more</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rewards && <span className="text-lg">{badgeEmoji[rewards.Badge]} <span className="text-xs text-yellow-400 font-bold">{rewards.Points} pts</span></span>}
          <button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold transition text-sm">Browse Events</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-bold text-indigo-400">{bookings.length}</p><p className="text-slate-400 text-xs">Bookings</p></div>
        <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-bold text-emerald-400">{bookings.filter(b=>b.Booking_Status==='CONFIRMED').length}</p><p className="text-slate-400 text-xs">Confirmed</p></div>
        <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-bold text-yellow-400">{waitlist.length}</p><p className="text-slate-400 text-xs">On Waitlist</p></div>
        <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl text-center"><p className="text-2xl font-bold text-purple-400">{transfers.length}</p><p className="text-slate-400 text-xs">Transfers</p></div>
      </div>

      {/* Nav */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {navItems.map(n => (
          <a key={n.id} href={`#${n.id}`}
            className={`p-2 rounded-xl text-center text-xs font-bold transition border ${page === n.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'}`}>
            {n.label}
          </a>
        ))}
      </div>

      {/* ===== BOOKINGS ===== */}
      {page === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700 p-10 rounded-2xl text-center">
              <span className="text-5xl block mb-3">🎫</span><h3 className="text-xl font-bold mb-2">No Bookings Yet</h3>
              <button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-bold transition mt-3">Explore Events</button>
            </div>
          ) : (
            bookings.map(b => (
              <div key={b.Booking_Id} className="bg-slate-800/60 border border-slate-700/50 p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{b.Event_Name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${statusColor(b.Booking_Status)}`}>{b.Booking_Status}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>📅 {new Date(b.Event_Date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      <span>🎟️ {b.Quantity} tickets</span><span className="text-slate-500">Ref: #{b.Booking_Id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.Booking_Status === 'PENDING' && (
                      <>
                        <button onClick={() => navigate(`/payment/${b.Booking_Id}`)} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold transition text-sm">💳 Pay</button>
                        <button onClick={() => cancelBooking(b.Booking_Id)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-sm font-bold">Cancel</button>
                      </>
                    )}
                    {b.Booking_Status === 'CONFIRMED' && (
                      <>
                        <button onClick={() => setExpandedTicket(expandedTicket === b.Booking_Id ? null : b.Booking_Id)}
                          className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold">
                          {expandedTicket === b.Booking_Id ? '🔼 Hide' : '🎫 Tickets'}
                        </button>
                        <button onClick={() => cancelBooking(b.Booking_Id)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-sm font-bold">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
                {b.Booking_Status === 'CONFIRMED' && expandedTicket === b.Booking_Id && b.tickets && b.tickets.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-700/50">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {b.tickets.map(t => (
                        <div key={t.Ticket_Id} className="bg-gradient-to-br from-slate-900 to-slate-800 border border-indigo-500/20 rounded-2xl overflow-hidden relative group">
                          <button onClick={() => cancelSingleTicket(t.Ticket_Id, b.Booking_Id)} title="Cancel Ticket"
                            className="absolute top-3 right-3 bg-red-500/20 text-red-400 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-red-500 hover:text-white text-xs font-bold z-10">✕</button>
                          <button onClick={() => { setTransferTicketId(t.Ticket_Id); setTransferEmail(''); }} title="Transfer Ticket"
                            className="absolute top-3 right-12 bg-indigo-500/20 text-indigo-400 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-indigo-500 hover:text-white text-xs font-bold z-10">↗</button>
                          <div className="p-5 border-b border-dashed border-slate-600">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">EventTix Enterprise</p>
                                <h4 className="text-lg font-bold mt-1">{b.Event_Name}</h4>
                                <p className="text-sm text-slate-400 mt-1">{b.Event_Type} • {new Date(b.Event_Date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                              </div>
                              <div className="bg-white p-2 rounded-lg shadow-lg">
                                <QRCodeSVG value={`EVENTTIX|TID:${t.Ticket_Id}|SEAT:${t.Seat_Number}|BID:${b.Booking_Id}|EVENT:${b.Event_Name}`} size={80} level="H" fgColor="#1e1b4b" />
                              </div>
                            </div>
                          </div>
                          <div className="p-4 flex justify-between items-center">
                            <div><p className="text-xs text-slate-500">SEAT</p><p className="text-xl font-black text-indigo-400">{t.Seat_Number}</p></div>
                            <div className="text-right"><p className="text-xs text-slate-500">TICKET</p><p className="text-sm font-mono text-slate-300">#{t.Ticket_Id}</p></div>
                          </div>
                          {transferTicketId === t.Ticket_Id && (
                            <div className="p-3 border-t border-slate-700 bg-slate-900/80 flex gap-2">
                              <input type="email" placeholder="Recipient email" value={transferEmail} onChange={e=>setTransferEmail(e.target.value)}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm" />
                              <button onClick={transferTicket} className="bg-indigo-600 px-3 py-2 rounded-lg text-xs font-bold">Send</button>
                              <button onClick={()=>setTransferTicketId(null)} className="text-slate-400 text-sm">✕</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== PAYMENTS ===== */}
      {page === 'payments' && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-indigo-400">Payment History ({payments.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left py-3 px-4">TXN ID</th><th className="text-left py-3 px-4">Event</th><th className="text-left py-3 px-4">Amount</th><th className="text-left py-3 px-4">Payment</th><th className="text-left py-3 px-4">Booking</th>
              </tr></thead>
              <tbody>{payments.map(p => (
                <tr key={p.Payment_Id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">{p.Transaction_Id}</td>
                  <td className="py-3 px-4">{p.Event_Name}</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">₹{p.Amount}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.Payment_Status==='SUCCESS'?'text-emerald-400':'text-yellow-400'}`}>{p.Payment_Status}</span></td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${statusColor(p.Booking_Status)}`}>{p.Booking_Status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== WAITLIST (Feature 1) ===== */}
      {page === 'waitlist' && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-indigo-400">⏳ My Waitlist ({waitlist.length})</h3>
          {waitlist.length === 0 ? <p className="text-slate-500 text-center py-10">Not on any waitlists.</p> : (
            waitlist.map(w => (
              <div key={w.Waitlist_Id} className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold">{w.Event_Name}</p>
                  <p className="text-sm text-slate-400">📅 {new Date(w.Event_Date).toLocaleDateString('en-IN')} • Qty: {w.Quantity}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${w.Status==='WAITING'?'bg-amber-500/10 text-amber-400':'bg-emerald-500/10 text-emerald-400'}`}>
                  {w.Status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== TRANSFERS (Feature 4) ===== */}
      {page === 'transfers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h3 className="text-xl font-bold text-indigo-400">🔄 Ticket Transfers ({transfers.length})</h3>
            <p className="text-xs text-slate-500">Tickets only move after one person accepts them.</p>
          </div>
          {transfers.length === 0 ? <p className="text-slate-500 text-center py-10">No transfers yet. Hover a ticket & click ↗ to transfer.</p> : (
            transfers.map(t => {
              const IsIncoming = t.To_UserId == userId;
              return (
                <div key={t.Transfer_Id} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <span className={`text-xl ${IsIncoming ? 'text-indigo-400' : 'text-purple-400'}`}>{IsIncoming ? '➕' : '➖'}</span>
                      <div>
                        <p className="font-bold text-sm">Ticket #{t.Ticket_Id} — Seat {t.Seat_Number}</p>
                        <p className="text-xs text-slate-400">
                          {IsIncoming ? `From: ${t.FromName}` : `To: ${t.ToName}`} • <span className="uppercase text-[10px] font-black tracking-widest">{IsIncoming ? 'Received' : 'Sent'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {IsIncoming && t.Status === 'PENDING' ? (
                        payingTransferId === t.Transfer_Id ? (
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">Fee: ₹500</span>
                             <button onClick={() => submitTransferPayment(t.Transfer_Id)} className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition shadow-lg shadow-emerald-500/20">💳 Pay</button>
                             <button onClick={() => setPayingTransferId(null)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
                           </div>
                        ) : (
                          <>
                            <button onClick={() => setPayingTransferId(t.Transfer_Id)} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition">✅ Accept</button>
                            <button onClick={() => rejectTransfer(t.Transfer_Id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition">❌ Reject</button>
                          </>
                        )
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${t.Status==='COMPLETED'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':t.Status==='PENDING'?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {t.Status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {t.Status === 'COMPLETED' && IsIncoming && t.Event_Name && (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-t border-slate-700/50 p-5 group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">✓ Transferred Ticket</p>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">EventTix Enterprise</p>
                          <h4 className="text-lg font-bold mt-1">{t.Event_Name}</h4>
                          <p className="text-sm text-slate-400 mt-1">Ticket ID: #{t.Ticket_Id} | Seat: <span className="text-indigo-400 font-black">{t.Seat_Number}</span></p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-lg">
                          <QRCodeSVG value={`EVENTTIX|TID:${t.Ticket_Id}|SEAT:${t.Seat_Number}|BID:${t.Booking_Id}|EVENT:${t.Event_Name}`} size={80} level="H" fgColor="#1e1b4b" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== GROUP MEMBERS (Feature 13) ===== */}
      {page === 'group' && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-indigo-400">👥 Saved Group Members ({groupMembers.length})</h3>
          <form onSubmit={addGroupMember} className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl grid md:grid-cols-4 gap-3">
            <input type="text" required placeholder="Name" value={newMember.name} onChange={e=>setNewMember({...newMember,name:e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
            <input type="email" placeholder="Email" value={newMember.email} onChange={e=>setNewMember({...newMember,email:e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
            <input type="tel" placeholder="Phone" value={newMember.phone} onChange={e=>setNewMember({...newMember,phone:e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold">+ Add</button>
          </form>
          {groupMembers.map(m => (
            <div key={m.Member_Id} className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
              <div><p className="font-bold">{m.Member_Name}</p><p className="text-xs text-slate-400">{m.Member_Email} • {m.Member_Phone}</p></div>
              <button onClick={()=>deleteGroupMember(m.Member_Id)} className="text-red-400 hover:text-red-300 text-sm font-bold">🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* ===== REWARDS (Feature 14) ===== */}
      {page === 'rewards' && rewards && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-indigo-400">🎮 Rewards & Gamification</h3>
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-8 rounded-2xl text-center">
            <span className="text-6xl block mb-4">{badgeEmoji[rewards.Badge]}</span>
            <h4 className="text-2xl font-black text-white mb-1">{rewards.Badge.replace('_',' ')}</h4>
            <p className="text-4xl font-black text-yellow-400 my-3">{rewards.Points} Points</p>
            <p className="text-slate-400">{rewards.Total_Bookings} confirmed bookings</p>
            <div className="mt-6 grid grid-cols-4 gap-3 text-center">
              {[{b:'EARLY_BIRD',p:10,e:'🐣'},{b:'FREQUENT_BOOKER',p:30,e:'⭐'},{b:'VIP',p:50,e:'💎'},{b:'SUPER_FAN',p:100,e:'🏆'}].map(tier => (
                <div key={tier.b} className={`p-3 rounded-xl border ${rewards.Points >= tier.p ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-700 bg-slate-800/60 opacity-50'}`}>
                  <span className="text-2xl block">{tier.e}</span>
                  <p className="text-xs font-bold mt-1">{tier.b.replace('_',' ')}</p>
                  <p className="text-xs text-slate-500">{tier.p} pts</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ALERTS / REMINDERS (Feature 16) ===== */}
      {page === 'alerts' && (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-indigo-400">🔔 Notifications & Reminders</h3>
          {notifications.length === 0 ? <p className="text-slate-500 text-center py-10">No notifications.</p> : (
            notifications.map(n => (
              <div key={n.Reminder_Id} className={`border p-4 rounded-xl flex justify-between items-center ${n.Is_Read ? 'bg-slate-800/30 border-slate-700/50' : 'bg-indigo-500/5 border-indigo-500/30'}`}>
                <div>
                  <p className="font-bold text-sm">{n.Message || `Reminder for ${n.Event_Name}`}</p>
                  <p className="text-xs text-slate-400">📅 {new Date(n.Event_Date).toLocaleDateString('en-IN')} • {n.Remind_Type}</p>
                </div>
                {!n.Is_Read && <button onClick={() => markRead(n.Reminder_Id)} className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg text-xs font-bold">Mark Read</button>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
