import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const MSG_TYPE_COLORS = {
  GENERAL: { bg: 'bg-slate-700/60', border: 'border-slate-600', icon: '💬', label: 'General' },
  WARNING: { bg: 'bg-red-900/30', border: 'border-red-500/40', icon: '⚠️', label: 'Warning' },
  HELP: { bg: 'bg-blue-900/30', border: 'border-blue-500/40', icon: '🆘', label: 'Help Request' },
  UPDATE: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', icon: '📢', label: 'Update' },
};

const ROLE_BADGES = {
  ADMIN: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: '🛡️ Admin' },
  OWNER: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: '🏢 Owner' },
  CUSTOMER: { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', label: '👤 Customer' },
};

export default function MessagePanel() {
  const userId = localStorage.getItem('userId');
  const userRole = localStorage.getItem('userRole');
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('inbox'); // inbox | chat | new
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('GENERAL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  // Poll for unread count
  useEffect(() => {
    if (!userId) return;
    const fetchUnread = () => {
      api.get(`/messages/unread/${userId}`).then(res => {
        setUnreadCount(res.data.unreadCount);
      }).catch(() => {});
    };
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 5000);
    return () => clearInterval(pollRef.current);
  }, [userId]);

  // Load inbox
  const loadInbox = () => {
    api.get(`/messages/inbox/${userId}`).then(res => {
      setConversations(res.data.conversations);
    }).catch(console.error);
  };

  // Load contacts
  const loadContacts = () => {
    api.get(`/messages/contacts/${userId}`).then(res => {
      setContacts(res.data.contacts);
    }).catch(console.error);
  };

  // Load chat with a specific user
  const openChat = (user) => {
    setSelectedUser(user);
    setView('chat');
    api.get(`/messages/conversation/${userId}/${user.userId || user.UserId}`).then(res => {
      setMessages(res.data.messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(console.error);
  };

  // Auto-refresh chat every 3 seconds
  useEffect(() => {
    if (view !== 'chat' || !selectedUser) return;
    const interval = setInterval(() => {
      const tId = selectedUser.userId || selectedUser.UserId;
      api.get(`/messages/conversation/${userId}/${tId}`).then(res => {
        setMessages(res.data.messages);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [view, selectedUser, userId]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const toId = selectedUser.userId || selectedUser.UserId;
    try {
      await api.post('/messages/send', {
        fromUserId: userId,
        toUserId: toId,
        message: newMessage.trim(),
        messageType: messageType
      });
      setNewMessage('');
      // Reload chat
      const res = await api.get(`/messages/conversation/${userId}/${toId}`);
      setMessages(res.data.messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadInbox();
      setView('inbox');
    }
  };

  const startNewChat = () => {
    loadContacts();
    setView('new');
    setSearchQuery('');
  };

  const filteredContacts = contacts.filter(c =>
    c.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.Role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110"
        style={{ animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none' }}
      >
        {isOpen ? '✕' : '💬'}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
             style={{ animation: 'slideUp 0.3s ease-out' }}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-slate-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {view !== 'inbox' && (
                <button onClick={() => { setView('inbox'); loadInbox(); }} className="text-slate-400 hover:text-white transition mr-1">
                  ←
                </button>
              )}
              <h3 className="font-bold text-white">
                {view === 'inbox' && '💬 Messages'}
                {view === 'chat' && (selectedUser?.name || selectedUser?.Name)}
                {view === 'new' && '📝 New Message'}
              </h3>
              {view === 'chat' && selectedUser && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_BADGES[selectedUser.role || selectedUser.Role]?.color}`}>
                  {selectedUser.role || selectedUser.Role}
                </span>
              )}
            </div>
            {view === 'inbox' && (
              <button onClick={startNewChat} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition font-bold">
                + New
              </button>
            )}
          </div>

          {/* INBOX VIEW */}
          {view === 'inbox' && (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                  <span className="text-4xl mb-3">📭</span>
                  <p className="font-bold">No messages yet</p>
                  <p className="text-sm text-center mt-1">Start a conversation with Admin, Owners, or Customers</p>
                  <button onClick={startNewChat} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg font-bold transition">
                    Start a Conversation
                  </button>
                </div>
              ) : (
                conversations.map(convo => (
                  <button
                    key={convo.userId}
                    onClick={() => openChat(convo)}
                    className="w-full p-4 border-b border-slate-800 hover:bg-slate-800/60 transition text-left flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {convo.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm truncate">{convo.name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{formatTime(convo.lastTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${ROLE_BADGES[convo.role]?.color}`}>
                          {convo.role}
                        </span>
                        {convo.lastMessageType !== 'GENERAL' && (
                          <span className="text-xs">{MSG_TYPE_COLORS[convo.lastMessageType]?.icon}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{convo.lastMessage}</p>
                    </div>
                    {convo.unreadCount > 0 && (
                      <span className="bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {convo.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* NEW MESSAGE VIEW */}
          {view === 'new' && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 transition text-white placeholder-slate-500"
                />
              </div>
              {filteredContacts.map(contact => (
                <button
                  key={contact.UserId}
                  onClick={() => openChat({ userId: contact.UserId, name: contact.Name, role: contact.Role })}
                  className="w-full p-3 px-4 border-b border-slate-800 hover:bg-slate-800/60 transition text-left flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {contact.Name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{contact.Name}</p>
                    <p className="text-xs text-slate-500 truncate">{contact.Email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_BADGES[contact.Role]?.color}`}>
                    {ROLE_BADGES[contact.Role]?.label}
                  </span>
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <p className="text-center text-slate-500 text-sm p-6">No contacts found</p>
              )}
            </div>
          )}

          {/* CHAT VIEW */}
          {view === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm mt-8">
                    <span className="text-3xl block mb-2">👋</span>
                    Start the conversation!
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = String(msg.From_UserId) === String(userId);
                  const typeStyle = MSG_TYPE_COLORS[msg.Message_Type] || MSG_TYPE_COLORS.GENERAL;
                  return (
                    <div key={msg.Message_Id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        isMine
                          ? 'bg-indigo-600/80 rounded-br-sm'
                          : `${typeStyle.bg} border ${typeStyle.border} rounded-bl-sm`
                      }`}>
                        {!isMine && msg.Message_Type !== 'GENERAL' && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{typeStyle.icon}</span>
                            <span className="text-xs font-bold opacity-80">{typeStyle.label}</span>
                          </div>
                        )}
                        {isMine && msg.Message_Type !== 'GENERAL' && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{typeStyle.icon}</span>
                            <span className="text-xs font-bold text-indigo-200">{typeStyle.label}</span>
                          </div>
                        )}
                        <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.Message}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-300' : 'text-slate-500'}`}>
                          {formatTime(msg.Created_At)}
                          {isMine && <span className="ml-1">{msg.Is_Read ? '✓✓' : '✓'}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Type Selector + Input */}
              <div className="border-t border-slate-700 p-3 bg-slate-900/80">
                {/* Type selector - show for admin always, others only for HELP */}
                <div className="flex gap-1 mb-2">
                  {['GENERAL', 'WARNING', 'HELP', 'UPDATE'].map(type => {
                    const style = MSG_TYPE_COLORS[type];
                    const showType = userRole === 'ADMIN' || type === 'GENERAL' || type === 'HELP';
                    if (!showType) return null;
                    return (
                      <button
                        key={type}
                        onClick={() => setMessageType(type)}
                        className={`text-xs px-2 py-1 rounded-lg border transition ${
                          messageType === type
                            ? `${style.bg} ${style.border} text-white font-bold`
                            : 'border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {style.icon} {style.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    rows="1"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 transition resize-none text-white placeholder-slate-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
        }
      `}</style>
    </>
  );
}
