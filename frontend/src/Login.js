import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Style/Login.css';

// Thiết lập URL backend chung
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountNumberBank: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Đăng nhập
  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/login', {
        email: form.email,
        password: form.password
      });

      const { token, user } = res.data;

            // Lưu token & user vào localStorage
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));

       // Truyền user & token cho App
       onLogin(user, token);

      // Điều hướng theo role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/store');
      }

    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError(err.response.data.message);
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  };

  // Đăng ký
  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const res = await axios.post('/api/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        accountNumberBank: form.accountNumberBank
      });

      if (res.status === 201) {
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        setIsRegister(false);
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          accountNumberBank: ''
        });
      }
    } catch (err) {
      console.error('Register error:', err);
      if (err.response?.status === 409) {
        setError(err.response.data.message);
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="login-page">
      <header className="header">
        <div className="header-content">
          <img src="/logo.png" alt="Steam Logo" className="header-logo" />
        </div>
      </header>
      <main className="main-content">
      <div className="login-container">
        <h2>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</h2>

        <form onSubmit={isRegister ? submitRegister : submitLogin}>
          {isRegister && (
            <input
              type="text"
              name="name"
              placeholder="Họ và tên"
              value={form.name}
              onChange={handleChange}
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            required
          />

          {isRegister && (
            <>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Xác nhận mật khẩu"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="accountNumberBank"
                placeholder="Số tài khoản ngân hàng"
                value={form.accountNumberBank}
                onChange={handleChange}
              />
            </>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button type="submit">{isRegister ? 'Đăng ký' : 'Đăng nhập'}</button>
        </form>

        <p className="toggle-auth">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{" "}
          <span onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Đăng nhập' : 'Đăng ký'}
          </span>
        </p>
      </div>
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img src="/logo.png" alt="Valve Steam Logo" className="footer-logo"/>
            <p>© 2023 Valve Corporation. All rights reserved.</p>
            <p>All trademarks are property of their respective owners.</p>
            <p>VAT included in all prices where applicable.</p>
          </div>
          <div className="footer-links">
            <ul><li>About Valve</li><li>Jobs</li><li>Steamworks</li><li>Distribution</li><li>Support</li></ul>
            <ul><li>Privacy Policy</li><li>Legal</li><li>Subscriber Agreement</li><li>Refunds</li><li>Cookies</li></ul>
          </div>
        </div>
      </footer>
    </div>
    
  );
}