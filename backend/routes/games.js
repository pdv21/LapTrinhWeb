const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');


const router = express.Router();

// GET all games
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 10, 100);
  const offset = (page - 1) * pageSize;
  const pool = await poolPromise;
  const totalRes = await pool.request().query('SELECT COUNT(*) AS total FROM Games');
  const total = totalRes.recordset[0].total;
  const data = await pool.request()
  .input('offset', mssql.Int, offset)
  .input('size',   mssql.Int, pageSize)
  .query(
    `SELECT 
       id,
       Name        AS title,
       Price       AS price,
       Discount    AS discount,
       imageUrl    AS imageUrl,
       SalesCount  AS salesCount,
       Description AS description,
       GenreID     AS genreId
     FROM Games
     ORDER BY id
     OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;`
  );
res.json({ items: data.recordset, total, page, pageSize });

}));

// Search games by name
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const pool = await poolPromise;
  const data = await pool.request()
    .input('q', mssql.NVarChar, `%${q}%`)
    .query(
      `SELECT id,Name,Price,Discount,imageUrl
       FROM Games
       WHERE Name LIKE @q
       ORDER BY Name;`
    );
  res.json(data.recordset);
}));

// GET game detail
router.get('/:gameId', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.gameId, 10);
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', mssql.Int, id)
    .query(
      `SELECT g.id, g.Name AS title, g.Description AS description, g.Developer,
              g.Publisher, g.Price AS price, g.Discount, g.imageUrl, g.screenshotUrl,
              g.SalesCount AS salesCount, g.GenreID, gr.Name AS genreName
       FROM Games g
       LEFT JOIN Genres gr ON g.GenreID = gr.GenreID
       WHERE g.id = @id;`
    );
  if (!result.recordset.length) {
    return res.status(404).json({ message: 'Game not found' });
  }
  res.json(result.recordset[0]);
}));

// GET /api/games/:gameId/reviews
router.get('/:gameId/reviews', async (req, res) => {
  const gameId = parseInt(req.params.gameId, 10);
  if (isNaN(gameId)) return res.status(400).json({ error: 'Invalid game ID' });

  const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  const offset = (page - 1) * limit;

  try {
    const pool = await poolPromise;

    // Đếm tổng
    const countResult = await pool.request()
      .input('gameId', mssql.Int, gameId)
      .query(`
        SELECT COUNT(*) AS total
        FROM dbo.Review
        WHERE game_id = @gameId
      `);

    // Lấy dữ liệu page, bây giờ gồm thêm star
    const dataResult = await pool.request()
      .input('gameId', mssql.Int, gameId)
      .input('offset',  mssql.Int, offset)
      .input('limit',   mssql.Int, limit)
      .query(`
        SELECT
          id,
          user_id,
          game_id,
          comment,
          star
        FROM dbo.Review
        WHERE game_id = @gameId
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

// POST /api/games/:gameId/reviews
router.post('/:gameId/reviews', async (req, res) => {
  const gameId = parseInt(req.params.gameId, 10);
  const userId = parseInt(req.body.user_id, 10);
  const comment = (req.body.comment || '').trim();
  const star    = parseInt(req.body.star, 10);  // hoặc req.body.rating

  if (
    isNaN(gameId) ||
    isNaN(userId) ||
    !comment ||
    isNaN(star) || star < 1 || star > 5
  ) {
    return res.status(400).json({
      error: 'gameId, user_id phải là số; comment không rỗng; star là số từ 1 đến 5'
    });
  }

  try {
    const pool = await poolPromise;
    const insertResult = await pool.request()
      .input('gameId',  mssql.Int,       gameId)
      .input('userId',  mssql.Int,       userId)
      .input('comment', mssql.NVarChar(1000), comment)
      .input('star',    mssql.TinyInt,   star)
      .query(`
        INSERT INTO dbo.Review (game_id, user_id, comment, star)
        VALUES (@gameId, @userId, @comment, @star);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const newReview = {
      id:       insertResult.recordset[0].id,
      game_id:  gameId,
      user_id:  userId,
      comment,
      star
    };
    return res.status(201).json(newReview);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;