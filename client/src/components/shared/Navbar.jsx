import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) fetchNotifications();
    const interval = setInterval(() => { if (user) fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getAll();
      setNotifs(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const dashPath = user?.role === 'supplier' ? '/dashboard/supplier'
    : user?.role === 'admin' ? '/admin' : '/dashboard/buyer';

  return (
    <nav className="bg-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <span className="text-white text-xl font-bold">BioBids</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/listings" className="text-primary-100 hover:text-white text-sm font-medium">Browse</Link>

            {user ? (
              <>
                <Link to={dashPath} className="text-primary-100 hover:text-white text-sm font-medium">Dashboard</Link>

                {/* Notification Bell */}
                <div className="relative">
                  <button onClick={() => setShowNotifs(!showNotifs)} className="relative text-white p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-100">
                      <div className="flex justify-between items-center px-4 py-3 border-b">
                        <span className="font-semibold text-gray-800">Notifications</span>
                        <button onClick={async () => { await notificationsAPI.markAllRead(); setUnread(0); fetchNotifications(); }} className="text-xs text-primary hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifs.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                        ) : notifs.slice(0, 10).map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 ${!n.is_read ? 'bg-green-50' : ''}`}>
                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-primary-100 text-sm">{user.name}</span>
                <button onClick={handleLogout} className="text-sm border border-primary-light text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-primary-100 hover:text-white text-sm font-medium">Login</Link>
                <Link to="/register" className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
