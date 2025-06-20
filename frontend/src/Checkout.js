import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Style/Checkout.css';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Checkout({ user }) {
  const navigate = useNavigate();
  const userId = user?.id;

  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!userId) {
      alert('Please log in to proceed to checkout.');
      navigate('/login');
    }
  }, [userId, navigate]);

  // Fetch cart from API
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await axios.get(`/api/cart/${userId}`);
        setCartItems(res.data.items || []);
      } catch (err) {
        console.error('Error fetching cart:', err);
        alert('Could not load cart. Please try again later.');
      } finally {
        setLoadingCart(false);
      }
    })();
  }, [userId]);

  // Calculate total
  const totalPrice = cartItems.reduce((sum, item) => {
    const raw = typeof item.Price === 'number'
      ? item.Price
      : parseFloat(item.Price) || 0;
    const final = item.Discount > 0
      ? raw * (1 - item.Discount / 100)
      : raw;
    return sum + final;
  }, 0);

  // Handle checkout
  const handleCheckout = async () => {
    if (!cartItems.length) {
      alert('Your cart is empty.');
      return;
    }
    setCheckoutLoading(true);

    const cartItemIds = cartItems.map(item => item.cartItemId);

    // 1) Perform checkout
    let checkoutSuccess = false;
    try {
      const res = await axios.post('/api/checkout', { userId, cartItemIds });
      if (res.status >= 200 && res.status < 300 && res.data.purchaseId) {
        checkoutSuccess = true;
      } else {
        throw new Error(res.data.message || 'Checkout error');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.response?.data.message || 'Checkout failed.');
      setCheckoutLoading(false);
      return;
    }

    // 2) Add games to library if checkout succeeded
    try {
      await axios.post(`/api/users/${userId}/library`, { gameIds: cartItemIds });
    } catch (batchErr) {
      console.warn('Batch add to library failed, fallback to individual adds:', batchErr);
      for (const id of cartItemIds) {
        try {
          await axios.post(`/api/users/${userId}/library`, { gameId: id });
        } catch (singleErr) {
          console.error(`Add game ${id} to library failed:`, singleErr);
        }
      }
    }

    alert('Checkout successful!');
    setCheckoutLoading(false);
    navigate('/library');
  };

  if (loadingCart) {
    return (
      <div className="checkout-page">
        <div className="checkout-loading">Loading your cart...</div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Header */}
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

      {/* Main */}
      <main className="checkout-main">
        <div className="checkout-container">
          <h2 className="checkout-title">🛒 Checkout</h2>
          {cartItems.length === 0 ? (
            <p style={{ color: "#c8d6e5", textAlign: "center" }}>Your cart is empty.</p>
          ) : (
            <>
              <div className="order-summary">
                <h3>Order Summary</h3>
                <ul className="checkout-cart-list">
                  {cartItems.map(item => {
                    const raw = typeof item.Price === 'number'
                      ? item.Price
                      : parseFloat(item.Price) || 0;
                    const final = item.Discount > 0
                      ? raw * (1 - item.Discount / 100)
                      : raw;
                    return (
                      <li className="checkout-cart-item" key={item.cartItemId}>
                        <span className="checkout-cart-item-name">{item.Name}</span>
                        {item.Discount > 0 ? (
                          <span className="checkout-cart-item-price">
                            <span style={{ textDecoration: "line-through", color: "#f55", marginRight: 7, fontSize: 15 }}>
                              {raw.toFixed(2)}
                            </span>
                            <span>
                              {final.toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="checkout-cart-item-price">
                            ${final.toFixed(2)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="checkout-footer">
                <div className="checkout-cart-total">
                  Total: <span>${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
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
