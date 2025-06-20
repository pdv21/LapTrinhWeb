import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Style/GameDetail.css';

export default function GameDetail({ user, cartItems, setCartItems }) {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggestedGames, setSuggestedGames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [inCart, setInCart] = useState(false);

  const baseURL = axios.defaults.baseURL;
  const buildImageUrl = path => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // Fetch game details
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await axios.get(`/api/games/${gameId}`);
        setGame(res.data);
        setInCart(cartItems.some(item => +item.gameId === +gameId));
      } catch (err) {
        console.error('Error fetching game details:', err);
      }
    }
    fetchGame();
  }, [gameId, cartItems]);

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await axios.get(`/api/games/${gameId}/reviews`);
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    }
    fetchReviews();
  }, [gameId]);

  // Fetch suggested games by genre
  useEffect(() => {
    const genreId = game?.genreId ?? game?.GenreID;
    if (!genreId) return;
    async function fetchSuggestions() {
      try {
        const res = await axios.get('/api/games?page=1&pageSize=100');
        const all = Array.isArray(res.data) ? res.data : res.data.items || [];
        const filtered = all
          .filter(g => +g.genreId === +genreId && +g.id !== +game.id)
          .slice(0, 5);
        setSuggestedGames(filtered);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }
    fetchSuggestions();
  }, [game]);

  // Scroll to top on reviews page change or game change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, gameId]);

  // Add to cart
  const handleAddToCart = async () => {
    if (!user?.id) return alert('Bạn cần đăng nhập để thêm vào giỏ hàng');
    if (inCart) return alert('Đã có trong giỏ hàng');
    try {
      const res = await axios.post('/api/cart/add', { userId: user.id, gameId: +gameId });
      if (res.status === 201) {
        setInCart(true);
        setCartItems(prev => [...prev, { gameId: +gameId }]);
        navigate('/cart');
      }
    } catch (err) {
      console.error('Add to cart error:', err);
      alert(err.response?.data.message || 'Lỗi thêm vào giỏ hàng');
    }
  };

  // Submit review
  const handleReviewSubmit = async () => {
    if (!newRating || !newComment.trim()) return;
    try {
      await axios.post(`/api/games/${gameId}/reviews`, {
        user_id: user.id,
        star: newRating,
        comment: newComment.trim(),
      });
      const res = await axios.get(`/api/games/${gameId}/reviews`);
      setReviews(res.data.reviews || []);
      setNewRating(0);
      setNewComment('');
      setCurrentPage(1);
    } catch (err) {
      console.error('Submit review error:', err);
      alert(err.response?.data.error || 'Lỗi gửi đánh giá');
    }
  };

  // Pagination logic
  const indexOfLast = currentPage * reviewsPerPage;
  const indexOfFirst = indexOfLast - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const handlePageChange = page => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (!game) return <div className="game-detail"><p>Loading game details...</p></div>;

  return (
    <><header className="store-header">
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
    <div className="game-detail">
      {/* Header */}
      

      {/* Banner */}
      <section className="detail-banner">
        <img src={buildImageUrl(game.imageUrl)} alt={game.title} />
      </section>

      {/* Main content */}
      <div className="detail-main">
        <div className="detail-left">
          <h2>{game.title}</h2>
          <p className="description">{game.description}</p>
          <div className="detail-buy">
            <div className="price">${game.price}</div>
            <button className={`buy-button ${inCart ? 'in-cart' : ''}`} onClick={handleAddToCart}>
              {inCart ? 'In Cart' : 'Add to Cart'}
            </button>
          </div>
          <hr />
          <section className="submit-review">
            <h4>Write a Review</h4>
            <div className="form-group">
              <label htmlFor="rating">Rating:</label>
              <select id="rating" value={newRating} onChange={e => setNewRating(+e.target.value)}>
                <option value={0}>Select</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="comment">Comment:</label>
              <textarea id="comment" placeholder="Write your review..." value={newComment} onChange={e => setNewComment(e.target.value)} />
            </div>
            <button onClick={handleReviewSubmit} className="submit-btn">Submit Review</button>
          </section>
        </div>
        <div className="detail-right">
          <img className="detail-screenshot" src={buildImageUrl(game.screenshotUrl)} alt={`${game.title} screenshot`} />
          <div className="reviews-list">
            {currentReviews.length ? (
              currentReviews.map(r => (
                <div key={r.id} className="review-item">
                  <strong>User: {r.user_id}</strong>
                  <span className="review-stars">{r.star} ★</span>
                  <p>{r.comment}</p>
                </div>
              ))
            ) : <p>No reviews yet.</p>}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => handlePageChange(currentPage-1)} disabled={currentPage===1}>Prev</button>
              {[...Array(totalPages)].map((_,i) => (
                <button key={i+1} onClick={() => handlePageChange(i+1)} className={currentPage===i+1?'active':''}>{i+1}</button>
              ))}
              <button onClick={() => handlePageChange(currentPage+1)} disabled={currentPage===totalPages}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* Suggested games section */}
      <section className="detail-extras">
        <h3>Các game cùng thể loại</h3>
        <hr />
        <div className="suggestion-section">
          {suggestedGames.length ? (
            suggestedGames.map(g => (
              <div key={g.id} className="suggestion-card">
                <Link to={`/game/${g.id}`}>
                  <div className="suggestion-image">
                    <img src={buildImageUrl(g.imageUrl)} alt={g.title} />
                  </div>
                  <div className="suggestion-info">
                    <h5>{g.title}</h5>
                    <p className="suggestion-price">${g.price}</p>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <p>Không có game gợi ý.</p>
          )}
        </div>
      </section>

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
    </>
  );
}
