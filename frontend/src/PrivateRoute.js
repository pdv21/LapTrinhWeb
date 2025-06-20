// src/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    // chưa có token → ép về login
    return <Navigate to="/login" replace />;
  }
  // có token → cho render các route con
  return <Outlet />;
};

export default PrivateRoute;
