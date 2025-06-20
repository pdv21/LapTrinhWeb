const express = require('express');
const { authenticate, authorizeAdmin } = require('../../auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { poolPromise, mssql } = require('../../db');


const router = express.Router();
router.use(authenticate, authorizeAdmin);

// GET /api/admin/users
router.get('/', asyncHandler(async (req, res) => {
  const { search = '', page = 1, pageSize = 10 } = req.query;
  const p = Math.max(parseInt(page, 10), 1);
  const size = Math.min(parseInt(pageSize, 10), 100);
  const offset = (p - 1) * size;
  const pool = await poolPromise;
  const totalRes = await pool.request()
    .input('search', mssql.NVarChar, `%${search}%`)
    .query(
      `SELECT COUNT(*) AS total
       FROM Customer
       WHERE Name LIKE @search OR Email LIKE @search;`
    );
  const usersRes = await pool.request()
    .input('search', mssql.NVarChar, `%${search}%`)
    .input('offset', mssql.Int, offset)
    .input('size', mssql.Int, size)
    .query(
      `SELECT id, Name AS name, Email AS email, role, AccountNumberBank AS accountNumberBank
       FROM Customer
       WHERE Name LIKE @search OR Email LIKE @search
       ORDER BY id
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`
    );
  res.json({ users: usersRes.recordset, total: totalRes.recordset[0].total, page: p, pageSize: size });
}));

// PUT /api/admin/users/:userId
router.put('/:userId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId, 10);
  const { name, role, accountNumberBank } = req.body;
  const pool = await poolPromise;
  await pool.request()
    .input('id', mssql.Int, id)
    .input('name', mssql.NVarChar, name)
    .input('role', mssql.NVarChar, role)
    .input('accountNumberBank', mssql.NVarChar, accountNumberBank)
    .query(
      `UPDATE Customer
       SET Name=@name, role=@role, AccountNumberBank=@accountNumberBank
       WHERE id=@id;`
    );
  res.json({ message: 'User updated' });
}));

// DELETE /api/admin/users/:userId
router.delete('/:userId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId, 10);
  const pool = await poolPromise;
  await pool.request()
    .input('id', mssql.Int, id)
    .query('DELETE FROM Customer WHERE id=@id;');
  res.json({ message: 'User deleted' });
}));

module.exports = router;