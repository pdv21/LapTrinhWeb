const express = require('express');
const { authenticate } = require('../auth');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');
const bcrypt = require('bcrypt');

const router = express.Router();

// GET user profile (protected)
router.get('/:userId', authenticate, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId, 10);
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', mssql.Int, id)
    .query(
      'SELECT id,Name AS username,Email AS email,AccountNumberBank AS bankAccountNumber,role FROM Customer WHERE id=@userId'
    );
  if (!result.recordset.length) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(result.recordset[0]);
}));
// PUT /api/users/:userId — cập nhật profile & password (protected)
router.put(
  '/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const {
      username,
      email,
      bankAccountNumber,
      password,               // ← nhận thêm trường password
    } = req.body;

    // Nếu không có gì để cập nhật
    if (
      username == null &&
      email == null &&
      bankAccountNumber == null &&
      password == null
    ) {
      return res
        .status(400)
        .json({ message: 'Vui lòng gửi ít nhất một trường để cập nhật.' });
    }

    const pool = await poolPromise;
    let hashed;
    if (password) {
      // hash mật khẩu mới
      hashed = await bcrypt.hash(password, 10);
    }

    // Thực thi UPDATE, giữ nguyên giá trị cũ nếu param null
    const setClauses = [
      'Name               = ISNULL(@username, Name)',
      'Email              = ISNULL(@email, Email)',
      'AccountNumberBank  = ISNULL(@bankAccountNumber, AccountNumberBank)',
      ...(password ? ['Password = @password'] : []),
    ].join(',\n       ');
  
    await pool.request()
      .input('userId',             mssql.Int,       userId)
      .input('username',           mssql.NVarChar,  username ?? null)
      .input('email',              mssql.NVarChar,  email    ?? null)
      .input('bankAccountNumber',  mssql.NVarChar,  bankAccountNumber ?? null)
      .input('password',           mssql.NVarChar,  hashed   ?? null)
      .query(`
        UPDATE Customer
        SET
          ${setClauses}
        WHERE id = @userId;
      `);

    // Lấy lại profile sau khi cập nhật
    const result = await pool
      .request()
      .input('userId', mssql.Int, userId)
      .query(`
        SELECT
          id,
          Name              AS username,
          Email             AS email,
          AccountNumberBank AS bankAccountNumber,
          role
        FROM Customer
        WHERE id = @userId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'User không tồn tại.' });
    }

    res.json(result.recordset[0]);
  })
);

// GET /api/users/:userId/reviews
router.get('/:userId/reviews', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  const offset = (page - 1) * limit;

  try {
    const pool = await poolPromise;

    const countResult = await pool.request()
      .input('userId', mssql.Int, userId)
      .query(`SELECT COUNT(*) AS total FROM dbo.Review WHERE user_id = @userId`);

    const dataResult = await pool.request()
      .input('userId', mssql.Int, userId)
      .input('offset',  mssql.Int, offset)
      .input('limit',   mssql.Int, limit)
      .query(`
        SELECT
          id,
          game_id,
          comment,
          star
        FROM dbo.Review
        WHERE user_id = @userId
        ORDER BY id
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
      `);

    return res.json({
      page,
      limit,
      total: countResult.recordset[0].total,
      totalPages: Math.ceil(countResult.recordset[0].total / limit),
      reviews: dataResult.recordset
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;