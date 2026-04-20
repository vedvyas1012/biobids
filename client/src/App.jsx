import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/shared/PrivateRoute';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';

// Supplier pages
import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierListings from './pages/supplier/MyListings';
import NewListing from './pages/supplier/NewListing';
import SupplierOrders from './pages/supplier/Orders';
import SupplierOrderDetail from './pages/supplier/OrderDetail';
import SupplierEarnings from './pages/supplier/Earnings';

// Buyer pages
import BuyerDashboard from './pages/buyer/Dashboard';
import BuyerBrowse from './pages/buyer/Browse';
import BuyerBids from './pages/buyer/MyBids';
import BuyerOrders from './pages/buyer/Orders';
import BuyerOrderDetail from './pages/buyer/OrderDetail';
import BuyerPayments from './pages/buyer/Payments';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminOrders from './pages/admin/Orders';
import AdminDisputes from './pages/admin/Disputes';
import AdminTransactions from './pages/admin/Transactions';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          {/* Supplier */}
          <Route path="/dashboard/supplier" element={<PrivateRoute role="supplier"><SupplierDashboard /></PrivateRoute>} />
          <Route path="/dashboard/supplier/listings" element={<PrivateRoute role="supplier"><SupplierListings /></PrivateRoute>} />
          <Route path="/dashboard/supplier/listings/new" element={<PrivateRoute role="supplier"><NewListing /></PrivateRoute>} />
          <Route path="/dashboard/supplier/orders" element={<PrivateRoute role="supplier"><SupplierOrders /></PrivateRoute>} />
          <Route path="/dashboard/supplier/orders/:id" element={<PrivateRoute role="supplier"><SupplierOrderDetail /></PrivateRoute>} />
          <Route path="/dashboard/supplier/earnings" element={<PrivateRoute role="supplier"><SupplierEarnings /></PrivateRoute>} />

          {/* Buyer */}
          <Route path="/dashboard/buyer" element={<PrivateRoute role="buyer"><BuyerDashboard /></PrivateRoute>} />
          <Route path="/dashboard/buyer/browse" element={<PrivateRoute role="buyer"><BuyerBrowse /></PrivateRoute>} />
          <Route path="/dashboard/buyer/bids" element={<PrivateRoute role="buyer"><BuyerBids /></PrivateRoute>} />
          <Route path="/dashboard/buyer/orders" element={<PrivateRoute role="buyer"><BuyerOrders /></PrivateRoute>} />
          <Route path="/dashboard/buyer/orders/:id" element={<PrivateRoute role="buyer"><BuyerOrderDetail /></PrivateRoute>} />
          <Route path="/dashboard/buyer/payments" element={<PrivateRoute role="buyer"><BuyerPayments /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/orders" element={<PrivateRoute role="admin"><AdminOrders /></PrivateRoute>} />
          <Route path="/admin/disputes" element={<PrivateRoute role="admin"><AdminDisputes /></PrivateRoute>} />
          <Route path="/admin/transactions" element={<PrivateRoute role="admin"><AdminTransactions /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
