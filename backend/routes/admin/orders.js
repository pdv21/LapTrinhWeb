const express = require('express');
const { authenticate, authorizeAdmin } = require('../../auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { poolPromise, mssql } = require('../../db');


const router = express.Router();
router.use(authenticate, authorizeAdmin);

// GET: Danh sách đơn hàng
router.get('/', authenticate, authorizeAdmin, asyncHandler(async(req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const p = Math.max(+page, 1),
      size = Math.min(+pageSize, 100),
      offset = (p - 1) * size;
  const pool = await poolPromise;

  const count = await pool.request().query(`SELECT COUNT(*) AS total FROM Purchase`);
  const total = count.recordset[0].total;

  const orders = await pool.request()
      .input('offset', mssql.Int, offset)
      .input('size', mssql.Int, size)
      .query(`
        SELECT p.id, p.purchase_date, p.total_amount, c.Name AS customerName, c.Email
        FROM Purchase p
        JOIN Customer c ON p.customer_id = c.id
        ORDER BY p.purchase_date DESC
        OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
    `);

  res.json({ orders: orders.recordset, total, page: p, pageSize: size });
}));

// GET: Chi tiết đơn hàng
router.get('/:orderId', authenticate, authorizeAdmin, asyncHandler(async(req, res) => {
  const id = parseInt(req.params.orderId, 10);
  const pool = await poolPromise;

  const detail = await pool.request()
      .input('id', mssql.Int, id)
      .query(`
        SELECT p.id, p.purchase_date, p.total_amount,
               c.Name AS customerName, c.Email,
               g.Name AS gameName, g.Price, g.Discount
        FROM Purchase p
        JOIN PurchaseDetail pd ON p.id = pd.purchase_id
        JOIN Games g ON pd.gameId = g.id
        JOIN Customer c ON p.customer_id = c.id
        WHERE p.id = @id;
    `);

  if (!detail.recordset.length) {
      return res.status(404).json({ message: 'Order not found' });
  }

  res.json({ orderDetails: detail.recordset });
}));

module.exports = router;
