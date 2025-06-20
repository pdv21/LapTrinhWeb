const express = require('express');
const { authenticate } = require('../auth');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');
const router = express.Router();
router.use(authenticate);

// LIBRARY: List owned games with pagination 
router.get(
    '/:userId',
    asyncHandler(async(req, res) => {
        const userId = parseInt(req.params.userId, 10);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 10, 100);
        const offset = (page - 1) * pageSize;
        const pool = await poolPromise;

        // Tổng distinct game
        const totalRes = await pool.request()
            .input('userId', mssql.Int, userId)
            .query(`
        SELECT COUNT(DISTINCT gameId) AS total
        FROM Library
        WHERE user_id = @userId;
      `);
        const total = totalRes.recordset[0].total;

        // Danh sách trang hiện tại
        const dataRes = await pool.request()
  .input('userId', mssql.Int, userId)
  .input('offset', mssql.Int, offset)
  .input('size',   mssql.Int, pageSize)
  .query(`
    SELECT DISTINCT
      g.id,
      g.Name        AS title,
      g.Description AS description,
      g.Developer,
      g.Publisher,
      gen.Name      AS genre,          -- lấy tên thể loại từ bảng Genres
      g.Price,
      g.Discount,
      g.imageUrl,
      g.screenshotUrl,
      p.purchase_date AS purchaseDate
    FROM Library l
    JOIN Games g           ON l.gameId = g.id
    JOIN Genres gen        ON g.GenreID = gen.GenreID
    JOIN PurchaseDetail pd ON l.purchaseDetailID = pd.id
    JOIN Purchase p        ON pd.purchase_id = p.id
    WHERE l.user_id = @userId
    ORDER BY p.purchase_date DESC, g.id
    OFFSET @offset ROWS
    FETCH NEXT @size ROWS ONLY;
  `);


        res.json({
            items: dataRes.recordset,
            total,
            page,
            pageSize
        });
    })
);


module.exports = router;