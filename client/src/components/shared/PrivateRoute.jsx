import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    const dash = user.role === 'supplier' ? '/dashboard/supplier' : user.role === 'admin' ? '/admin' : '/dashboard/buyer';
    return <Navigate to={dash} replace />;
  }

  return children;
}
