import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Style/Profile.css";

// set base URL for all requests
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Profile({ user, onLogout, setUser }) {
  const navigate = useNavigate();

  // purchase history + reviews
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // pagination state
  const [historyPage, setHistoryPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const itemsPerPage = 5; // số mục hiển thị mỗi trang

  // edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [formValues, setFormValues] = useState({
    username: user?.name || user?.username || "",
    email: user?.email || "",
    bankAccountNumber: user?.bankAccountNumber || "",
    currentPassword: "",
    newPassword: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // set token header
    const token = sessionStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    // fetch purchase history
    axios
      .get("/api/purchases/history")
      .then((res) => setPurchaseHistory(res.data.purchases || []))
      .catch((err) => console.error("Error fetching purchase history:", err))
      .finally(() => setLoadingHistory(false));

    // fetch user reviews and enrich with game names
    axios
      .get(`/api/users/${user.id}/reviews`)
      .then(async (res) => {
        const data = Array.isArray(res.data.reviews)
          ? res.data.reviews
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];
        // enrich each review with game name
        const enriched = await Promise.all(
          data.map(async (review) => {
            const gameId = review.gameId || review.game_id;
            try {
              const gameRes = await axios.get(`/api/games/${gameId}`);
              return { ...review, gameName: gameRes.data.name || gameRes.data.title };
            } catch (err) {
              console.error(`Error fetching game ${gameId}:`, err);
              return { ...review, gameName: 'Unknown Game' };
            }
          })
        );
        setReviews(enriched);
      })
      .catch((err) => console.error("Error fetching user reviews:", err))
      .finally(() => setLoadingReviews(false));
  }, [user, navigate]);

  if (!user) {
    return <div className="loading">Loading profile…</div>;
  }

  // pagination calculations
  const totalHistoryPages = Math.max(1, Math.ceil(purchaseHistory.length / itemsPerPage));
  const totalReviewsPages = Math.max(1, Math.ceil(reviews.length / itemsPerPage));

  const currentHistory = purchaseHistory.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );
  const currentReviews = reviews.slice(
    (reviewsPage - 1) * itemsPerPage,
    reviewsPage * itemsPerPage
  );

  const goHistoryPage = (page) => {
    if (page >= 1 && page <= totalHistoryPages) setHistoryPage(page);
  };
  const goReviewsPage = (page) => {
    if (page >= 1 && page <= totalReviewsPages) setReviewsPage(page);
  };

  const openEdit = () => setShowEdit(true);
  const closeEdit = () => {
    setShowEdit(false);
    setFormValues((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formValues.currentPassword) {
      alert("Vui lòng nhập mật khẩu hiện tại để xác nhận.");
      return;
    }
    setSaving(true);
    try {
      const token = sessionStorage.getItem("token");
      const payload = {
        username: formValues.username,
        email: formValues.email,
        bankAccountNumber: formValues.bankAccountNumber,
        currentPassword: formValues.currentPassword
      };
      if (formValues.newPassword) payload.password = formValues.newPassword;

      const response = await axios.put(
        `/api/users/${user.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser((prev) => ({ ...prev, ...response.data }));
      closeEdit();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi cập nhật thông tin hoặc mật khẩu không chính xác.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      {/* HEADER */}
      <header className="store-header">
        <div className="nav">
          <span className="steam-logo" onClick={() => navigate("/store")}>            
            <img src="/logo.png" alt="Steam Logo" />
          </span>
          <div className="user-actions">
            <button className="btn-flat" onClick={() => navigate("/library")}>Library</button>
            <button className="btn-flat" onClick={() => navigate("/cart")}>Cart</button>
            <button className="btn-flat" onClick={() => navigate("/profile")}>Profile</button>
          </div>
        </div>
      </header>

      {/* USER INFO */}
      <section className="user-info">
        <h3>User Information</h3>
        <p><strong>Name:</strong> {user.name || user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        {user.createdAt && <p><strong>Created At:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>}
        <div className="user-info__actions">
          <button className="btn-flat btn-edit-info" onClick={openEdit}>Edit Info</button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="profile-container">
        {/* PURCHASE HISTORY */}
        <section className="purchase-history">
          <h3>Purchase History</h3>
          {loadingHistory ? (
            <p>Loading purchase history...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="placeholder-text">You have no orders.</p>
          ) : (
            <>
              <ul className="orders-list">
                {currentHistory.map((order) => (
                  <li key={order.id} className="order-item">
                    <div className="order-meta">
                      <span className="order-id">Order #{order.id}</span>
                      <span className="order-date">{new Date(order.purchase_date).toLocaleString()}</span>
                      <span className="order-total">Total: ${order.total_amount?.toFixed(2)}</span>
                      <button
                        className="btn-flat btn-sm"
                        onClick={() =>
                        setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                        }
                      >
                      {expandedOrderId === order.id ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                    {/* Hiện chi tiết chỉ khi đúng order đang được mở */}
                    {expandedOrderId === order.id && (
                      <ul className="order-items">
                      {order.items.map((item) => (
                        <li key={item.game_id}>
                        {item.game_name} — ${item.unit_price?.toFixed(2)}
                        </li>
                    ))}
              </ul>
            )}
          </li>
  ))}
  </ul>

              <div className="pagination">
                <button onClick={() => goHistoryPage(historyPage - 1)} disabled={historyPage === 1}>« Prev</button>
                <span>Page {historyPage} of {totalHistoryPages}</span>
                <button onClick={() => goHistoryPage(historyPage + 1)} disabled={historyPage === totalHistoryPages}>Next »</button>
              </div>
            </>
          )}
        </section>

        {/* YOUR REVIEWS */}
        <section className="user-reviews">
          <h3>Your Reviews</h3>
          {loadingReviews ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="placeholder-text">You haven’t written any reviews yet.</p>
          ) : (
            <>
              <ul className="reviews-list">
                {currentReviews.map((r) => (
                  <li key={r.reviewId || r.id} className="review-item">
                    <strong>{r.gameName}</strong>
                    <p>Star: {r.star} ★</p>
                    <p>Comment: {r.comment || r.content}</p>
                  </li>
                ))}
              </ul>
              <div className="pagination">
                <button onClick={() => goReviewsPage(reviewsPage - 1)} disabled={reviewsPage === 1}>« Prev</button>
                <span>Page {reviewsPage} of {totalReviewsPages}</span>
                <button onClick={() => goReviewsPage(reviewsPage + 1)} disabled={reviewsPage === totalReviewsPages}>Next »</button>
              </div>
            </>
          )}
        </section>

        <button className="logout-btn" onClick={onLogout}>Log Out</button>
      </main>

      {/* EDIT INFO MODAL */}
      {showEdit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Edit Your Information</h4>
            <label>
              Name
              <input name="username" value={formValues.username} onChange={handleChange} placeholder="Enter your name" />
            </label>
            <label>
              Email
              <input name="email" type="email" value={formValues.email} onChange={handleChange} placeholder="Enter your email" />
            </label>
            <label>
              Bank Account Number
              <input name="bankAccountNumber" value={formValues.bankAccountNumber} onChange={handleChange} placeholder="Enter bank account number" />
            </label>
            <label>
              Current Password
              <input name="currentPassword" type="password" value={formValues.currentPassword} onChange={handleChange} placeholder="Enter current password" />
            </label>
            <label>
              New Password
              <input name="newPassword" type="password" value={formValues.newPassword} onChange={handleChange} placeholder="Enter new password" />
            </label>
            <div className="modal-actions">
              <button className="btn-flat" onClick={closeEdit} disabled={saving}>Cancel</button>
              <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img src="/logo.png" alt="Valve Steam Logo" className="footer-logo" />
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
