import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Style/Cart.css';  // Updated to correct CSS file

// Base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Cart({ user, cartItems, setCartItems }) {
  const navigate = useNavigate();
// Đầu file Cart.js, bên cạnh các import
const stored = JSON.parse(localStorage.getItem("user"));
const userId = stored?.id;   // dùng optional chaining để tránh null

  // Fetch cart items
  const fetchCartItems = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`/api/cart/${user.id}`);
      setCartItems(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // không khai báo callback useEffect là async
    const load = async () => {
      try {
        await fetchCartItems();
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user]);
  

  const handleRemove = async (cartItemId) => {
    try {
      console.log('>>> Removing cartItemId =', cartItemId);
      // Gọi API xóa
      await axios.delete(`/api/cart/${cartItemId}`, {
        data: { userId }
      });
      
      // Sau khi xóa xong, tải lại giỏ hàng
      fetchCartItems();
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };
  

  // Total
  const total = cartItems.reduce((sum, itm) => {
    const price = Number(itm.Price) || 0;
    const discount = Number(itm.Discount) || 0;
    return sum + price * (1 - discount / 100);
  }, 0);

  return (
    <div className="cart-page">
      <header className="store-header">
        <div className="nav">
          <span className="steam-logo" onClick={() => navigate('/store')}>
            <img src="/logo.png" alt="Steam Logo" />
          </span>
          <div className="user-actions">
            <button className="btn-flat" onClick={() => navigate('/library')}>Library</button>
            <button className="btn-flat" onClick={() => navigate('/cart')}>Cart ({cartItems.length})</button>
            <button className="btn-flat" onClick={() => navigate('/profile')}>Profile</button>
          </div>
        </div>
      </header>

      <div className="main-container">
        <div className="cart-container">
          {!cartItems.length ? (
            <div className="cart-empty">Your cart is empty</div>
          ) : (
            <>  
            <div className="cart-header-row">
              <span className="cart-header-name">Name</span>
              <span className="cart-header-price">Price</span>
              <span className="cart-header-action">Remove</span> 
            </div>
              <ul className="cart-list">
                {cartItems.map(itm => {
                  const price = Number(itm.Price) || 0;
                  const disc = Number(itm.Discount) || 0;
                  const finalPrice = (price * (1 - disc / 100)).toFixed(2);
                  return (
                    <li key={itm.cartItemId} className="cart-item">
                      <span className="cart-item-name">{itm.Name}</span>
                      <span className="cart-item-price">${finalPrice}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemove(itm.cartItemId)}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="cart-total-row">
                <span className="cart-total-label">Total:</span>
                <span className="cart-total-price">${total.toFixed(2)}</span>
                <span className="cart-total-action"> </span>
              </div>

              <div className="cart-actions">
                <button type="button" className="btn-back" onClick={() => navigate('/store')}>Continue Shopping</button>
                <button type="button" className="btn-checkout" onClick={() => navigate('/checkout')}>Checkout</button>
              </div>
            </>
          )}
        </div>
      </div>

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
