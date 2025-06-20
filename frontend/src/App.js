import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

import Login from "./Login";
import StorePage from "./StorePage";
import GameDetail from "./GameDetail";
import Cart from "./Cart";
import Library from "./Library";
import Profile from "./Profile";
import AddGame from "./AddGame";
import Checkout from "./Checkout";
import AdminPanel from './AdminPanel';

// Thiết lập URL backend chung
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Hàm đăng nhập: nếu chỉ nhận token, sẽ fetch profile đầy đủ
  const handleLogin = async (userData, token) => {
    sessionStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Trường hợp userData là object user đầy đủ
    if (userData && userData.username) {
      sessionStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } else {
      // Nếu userData chỉ là id hoặc thiếu field, fetch profile
      let userId = userData?.id || userData?.userId || userData?._id;
      try {
        let res;
        if (userId) {
          res = await axios.get(`/api/users/${userId}`);
        } else {
          res = await axios.get(`/api/users/me`);
        }
        const profile = res.data;
        sessionStorage.setItem("user", JSON.stringify(profile));
        setUser(profile);
      } catch (err) {
        setUser(null);
        sessionStorage.removeItem("user");
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setCartItems([]);
    navigate("/login", { replace: true });
  };

  // Load lại thông tin đăng nhập khi F5
  useEffect(() => {
    const savedToken = sessionStorage.getItem("token");
    const savedUser = sessionStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
          setUser(JSON.parse(savedUser));
        } else {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        }
      } catch {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      }
    }
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return <div>Đang khởi tạo, vui lòng chờ…</div>;
  }

  // Phân quyền hiển thị theo role
  if (user && user.role === "admin") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPanel user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route
          path="/admin/games"   
            element={
              user?.role === "admin"
       ? <AdminPanel user={user} onLogout={handleLogout} />
       : <Navigate to="/login" replace />
   }
 />
      </Routes>
    );
  }

  // Giao diện cho user thường (không phải admin)
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/store" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/"
        element={
          user ? (
            <StorePage
              cartItems={cartItems}
              setCartItems={setCartItems}
              user={user}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/store"
        element={
          user ? (
            <StorePage
              cartItems={cartItems}
              setCartItems={setCartItems}
              user={user}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/game/:gameId"
        element={
          user ? (
            <GameDetail
              user={user}
              cartItems={cartItems}
              setCartItems={setCartItems}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/cart"
        element={
          user ? (
            <Cart
              cartItems={cartItems}
              setCartItems={setCartItems}
              user={user}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/library"
        element={
          user ? <Library user={user} /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/profile"
        element={
          user ? <Profile user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/addgame"
        element={
          user ? <AddGame user={user} /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/checkout"
        element={
          user ? (
            <Checkout setCartItems={setCartItems} user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/admin" element={<Navigate to="/login" replace />} />
      <Route path="/admin" element={<AdminPanel user={user} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
