const express = require('express');
const { authenticate } = require('../auth');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');


const router = express.Router();
router.use(authenticate);

// GET /api/purchases/history
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const customerId = req.user.id;  // do middleware authenticate gán

    const pool = await poolPromise;
    // trong purchaseRouter.get('/history')
const result = await pool.request()
.input('customerId', mssql.Int, customerId)
.query(`
  SELECT
    p.id             AS purchase_id,
    p.purchase_date,
    p.total_amount,
    pd.gameId        AS game_id,
    g.Name           AS game_title,
    g.Price          AS unit_price
  FROM Purchase p
  INNER JOIN PurchaseDetail pd
    ON pd.purchase_id = p.id
  -- loại bỏ CartItem
  INNER JOIN Games g
    ON g.id = pd.gameId
  WHERE p.customer_id = @customerId
  ORDER BY p.purchase_date DESC;
`);


    // Gom nhóm items theo từng đơn
    const map = {};
    result.recordset.forEach(r => {
      if (!map[r.purchase_id]) {
        map[r.purchase_id] = {
          id:            r.purchase_id,
          purchase_date: r.purchase_date,
          total_amount:  r.total_amount,
          items:         []
        };
      }
      map[r.purchase_id].items.push({
        game_id:    r.game_id,
        game_name: r.game_title,
        unit_price: r.unit_price
      });
    });

    res.json({ purchases: Object.values(map) });
  })
);

module.exports = router;