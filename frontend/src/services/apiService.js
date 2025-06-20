import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Lấy games với filter, pagination
 * params: { type, page, pageSize, search }
 */
export function getStoreGames(params = {}) {
  return API.get('/api/games', { params }).then(res => res.data);
}

export function loginUser(credentials) {
  return API.post('/api/auth/login', credentials).then(res => res.data);
}

export function registerUser(data) {
  return API.post('/api/auth/register', data).then(res => res.data);
}

export function getGameReviews({ gameId }) {
  return API.get('/api/reviews', { params: { gameId } }).then(res => res.data);
}

export function addToCart({ userId, gameId }) {
  return API.post('/api/cart', { userId, gameId }).then(res => res.data);
}

export function getCart(userId) {
  return API.get('/api/cart', { params: { userId } }).then(res => res.data);
}
