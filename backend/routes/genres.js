const express = require('express');
const { authenticate, authorizeAdmin } = require('../auth');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');


const router = express.Router();

// --- GET: Genres (with dynamic sort + gameCount) ---
router.get('/', asyncHandler(async (req, res) => {
  const page       = parseInt(req.query.page,     10) || 1;
  const pageSize   = parseInt(req.query.pageSize, 10) || 10;
  const offset     = (page - 1) * pageSize;
  const { sortField = 'Name', sortOrder = 'ASC' } = req.query;

  // whitelist tránh SQL injection
  const allowed = ['GenreID','Name','gameCount'];
  const field = allowed.includes(sortField) ? sortField : 'Name';
  const dir   = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const pool = await poolPromise;

  // tổng số
  const totalRes = await pool.request()
    .query('SELECT COUNT(*) AS total FROM Genres');
  const total = totalRes.recordset[0].total;

  // truy vấn kèm đếm gameCount
  const dataRes = await pool.request()
    .input('offset',   mssql.Int, offset)
    .input('pageSize', mssql.Int, pageSize)
    .query(`
      SELECT
        g.GenreID,
        g.Name,
        COUNT(gs.id) AS gameCount
      FROM Genres g
      LEFT JOIN Games gs ON gs.GenreID = g.GenreID
      GROUP BY g.GenreID, g.Name
      ORDER BY ${field} ${dir}
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;
    `);

  res.json({
    data:       dataRes.recordset,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  });
}));

// GET genre by ID
router.get('/:genreId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.genreId, 10);
  const pool = await poolPromise;
  const data = await pool.request().input('id', mssql.Int, id)
    .query('SELECT GenreID AS id, Name FROM Genres WHERE GenreID=@id');
  if (!data.recordset.length) {
    return res.status(404).json({ message: 'Genre not found' });
  }
  res.json(data.recordset[0]);
}));

// POST /api/genres  – Tạo thể loại mới
router.post(
  '/genres',
  authenticate,
  authorizeAdmin,
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Thiếu tên thể loại' });
    }

    const pool = await poolPromise;

    // kiểm tra trùng tên (không phân biệt hoa thường)
    const dup = await pool.request()
      .input('name', mssql.NVarChar, name)
      .query('SELECT 1 FROM Genres WHERE LOWER(Name) = LOWER(@name)');
    if (dup.recordset.length) {
      return res.status(409).json({ message: 'Thể loại đã tồn tại' });
    }

    const ins = await pool.request()
      .input('name', mssql.NVarChar, name)
      .query(`
        INSERT INTO Genres (Name) VALUES (@name);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    res.status(201).json({ genreId: ins.recordset[0].id, name });
  })
);

// PUT /api/genres/:genreId – Cập nhật tên thể loại
router.put(
  '/:genreId',
  authenticate,
  authorizeAdmin,
  asyncHandler(async (req, res) => {
    const id   = parseInt(req.params.genreId, 10);
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Thiếu tên thể loại' });

    const pool = await poolPromise;

    // kiểm tra tồn tại
    const exist = await pool.request()
      .input('id', mssql.Int, id)
      .query('SELECT 1 FROM Genres WHERE GenreID = @id');
    if (!exist.recordset.length) return res.status(404).json({ message: 'Genre not found' });

    // kiểm tra trùng tên với genre khác
    const dup = await pool.request()
      .input('id',   mssql.Int, id)
      .input('name', mssql.NVarChar, name)
      .query(`
        SELECT 1 FROM Genres
        WHERE LOWER(Name) = LOWER(@name) AND GenreID <> @id
      `);
    if (dup.recordset.length) {
      return res.status(409).json({ message: 'Tên thể loại đã được dùng' });
    }

    await pool.request()
      .input('id',   mssql.Int, id)
      .input('name', mssql.NVarChar, name)
      .query('UPDATE Genres SET Name = @name WHERE GenreID = @id');

    res.json({ message: 'Genre updated' });
  })
);

// DELETE /api/genres/:genreId – Xoá thể loại
router.delete(
  '/:genreId',
  authenticate,
  authorizeAdmin,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.genreId, 10);
    const pool = await poolPromise;

    // kiểm tra genre có tồn tại
    const exist = await pool.request()
      .input('id', mssql.Int, id)
      .query('SELECT 1 FROM Genres WHERE GenreID = @id');
    if (!exist.recordset.length) return res.status(404).json({ message: 'Genre not found' });

    // có thể thêm kiểm tra ràng buộc khoá ngoại ở Games tại đây (nếu muốn chặn xoá khi đang được dùng)

    await pool.request()
      .input('id', mssql.Int, id)
      .query('DELETE FROM Genres WHERE GenreID = @id');

    res.json({ message: 'Genre deleted' });
  })
);

module.exports = router;