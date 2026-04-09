import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { NotificationProvider } from './components/Notifications';
import MessagePanel from './components/MessagePanel';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import Tickets from './pages/Tickets';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import CustomerDashboard from './pages/CustomerDashboard';

// Clear any stale auth on a fresh app visit (new tab / browser reopen)
if (!sessionStorage.getItem('sessionActive')) {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  sessionStorage.setItem('sessionActive', 'true');
}

function App() {
  const [role, setRole] = useState(localStorage.getItem('userRole'));
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [showSplash, setShowSplash] = useState(!sessionStorage.getItem('splashShown'));

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem('splashShown', 'true');
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
    {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
    <NotificationProvider>
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
        <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-700 p-4 sticky top-0 z-50">
          <div className="container mx-auto flex flex-wrap justify-between items-center gap-3">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition">
              EventTix Enterprise
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/" className="text-slate-300 hover:text-white transition text-sm">Events Market</Link>
              
              {isLoggedIn && (role === 'CUSTOMER' || role === 'OWNER') && (
                <Link to="/my-account" className="text-indigo-400 font-bold border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 rounded hover:bg-indigo-500/20 transition text-sm">
                  My Account
                </Link>
              )}
              {isLoggedIn && role === 'ADMIN' && (
                <Link to="/admin" className="text-emerald-400 font-bold border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded hover:bg-emerald-500/20 transition text-sm">
                  Admin Panel
                </Link>
              )}
              {isLoggedIn && role === 'OWNER' && (
                <Link to="/owner" className="text-purple-400 font-bold border border-purple-500/30 bg-purple-500/10 px-3 py-1 rounded hover:bg-purple-500/20 transition text-sm">
                  Owner Dashboard
                </Link>
              )}

              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="text-slate-300 hover:text-white transition text-sm">Login</Link>
                  <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition text-sm font-bold">Register</Link>
                </>
              ) : (
                <button onClick={handleLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-1.5 rounded-lg transition text-sm font-bold">
                  🚪 Logout
                </button>
              )}
            </div>
          </div>
        </nav>
        
        <main className="container mx-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Events />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/my-account" element={<CustomerDashboard />} />
            <Route path="/book/:eventId" element={<Booking />} />
            <Route path="/payment/:bookingId" element={<Payment />} />
            <Route path="/tickets/:bookingId" element={<Tickets />} />
          </Routes>
        </main>
        {isLoggedIn && <MessagePanel />}
      </div>
    </Router>
    </NotificationProvider>
    </>
  );
}

export default App;
