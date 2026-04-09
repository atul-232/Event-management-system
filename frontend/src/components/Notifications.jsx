import React, { useState, useCallback, createContext, useContext } from 'react';

const NotifContext = createContext();

export function useNotification() {
  return useContext(NotifContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const colors = {
    success: 'bg-emerald-600 border-emerald-400',
    error: 'bg-red-600 border-red-400',
    info: 'bg-indigo-600 border-indigo-400',
    warning: 'bg-amber-600 border-amber-400',
  };

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <NotifContext.Provider value={notify}>
      {children}
      {/* Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
        {notifications.map(n => (
          <div key={n.id}
            className={`${colors[n.type]} border text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}
            style={{ animation: 'slideIn 0.3s ease-out' }}>
            <span className="text-lg">{icons[n.type]}</span>
            <span className="text-sm font-medium flex-1">{n.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} className="text-white/60 hover:text-white text-lg">✕</button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotifContext.Provider>
  );
}
