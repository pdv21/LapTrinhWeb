const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');


const router = express.Router();

// POST /api/register
router.post('/register', asyncHandler(async (req, res) => {
  // trùng với JSON bạn gửi: “bankAccountNumber”
  const { name, email, password, bankAccountNumber } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const pool = await poolPromise;
  const hashed = await bcrypt.hash(password, 10);

  await pool.request()
    .input('name',               mssql.NVarChar, name)
    .input('email',              mssql.NVarChar, email)
    // dùng đúng tên param “bankAccountNumber” để sau này update cũng dùng y hệt
    .input('bankAccountNumber',  mssql.NVarChar, bankAccountNumber  || '')
    .input('password',           mssql.NVarChar, hashed)
    .query(`
      INSERT INTO Customer
        (Name, Email, Password, AccountNumberBank)
      VALUES
        (@name, @email, @password, @bankAccountNumber);
      SELECT SCOPE_IDENTITY() AS id;
    `);
  const id = result.recordset[0].id;
  res.status(201).json({ user: { id, name, email } });
}));

// POST /api/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const pool = await poolPromise;
  const userRes = await pool.request()
    .input('email', mssql.NVarChar, email)
    .query('SELECT id,Name,Email,Password,role,AccountNumberBank FROM Customer WHERE Email=@email');
  if (!userRes.recordset.length) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const user = userRes.recordset[0];
  const valid = await bcrypt.compare(password, user.Password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const libRes = await pool.request()
    .input('userId', mssql.Int, user.id)
    .query('SELECT COUNT(DISTINCT gameId) AS count FROM Library WHERE user_id=@userId');
  const libraryCount = libRes.recordset[0].count || 0;
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '4h' });
  res.json({
    user: {
      id: user.id,
      name: user.Name,
      email: user.Email,
      role: user.role,
      accountNumberBank: user.AccountNumberBank,
      libraryCount
    },
    token
  });
}));

module.exports = router;
