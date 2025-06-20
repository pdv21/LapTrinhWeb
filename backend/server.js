const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Route modules
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const gameRoutes         = require('./routes/games');
const genreRoutes        = require('./routes/genres');
const cartRoutes         = require('./routes/cart');
const checkoutRoutes     = require('./routes/checkout');
const purchaseRoutes     = require('./routes/purchases');
const adminUserRoutes    = require('./routes/admin/users');
const adminOrderRoutes   = require('./routes/admin/orders');
const libraryRoutes      = require('./routes/library');
const adminGameRoutes    = require('./routes/admin/games');
const app = express();
const port = process.env.PORT || 5000;

// Global middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Mount routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/games', adminGameRoutes);
app.use('/api/library', libraryRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

app.listen(port, () => console.log(`Server listening on port ${port}`));