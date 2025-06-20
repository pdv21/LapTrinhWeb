const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');


const router = express.Router();

// CHECKOUT: process purchase
router.post(
  '/',
  asyncHandler(async(req, res) => {
      const { userId, cartItemIds } = req.body;
      const pool = await poolPromise;
      const ids = Array.isArray(cartItemIds) ? cartItemIds : [];
      if (!ids.length) {
          return res.status(400).json({ message: 'cartItemIds missing' });
      }

      // 1) Fetch cart items and calculate total
      const items = [];
      for (const id of ids) {
          const ciRes = await pool.request()
              .input('userId', mssql.Int, userId)
              .input('id', mssql.Int, id)
              .query(
                  `SELECT ci.id AS cartItemId, ci.game_id AS gameId, g.Price, g.Discount
         FROM CartItem ci
         JOIN Cart c ON ci.cart_id = c.id AND c.user_id = @userId
         JOIN Games g ON ci.game_id = g.id
         WHERE ci.id = @id;`
              );
          if (!ciRes.recordset.length) {
              return res.status(400).json({ message: `Invalid CartItem ${id}` });
          }
          items.push(ciRes.recordset[0]);
      }

      const total = items.reduce(
          (sum, it) => sum + Number(it.Price) * (1 - (it.Discount || 0) / 100),
          0
      );

      // 2) Create purchase record
      const purRes = await pool.request()
          .input('date', mssql.DateTime, new Date())
          .input('total', mssql.Decimal(18, 2), total)
          .input('user', mssql.Int, userId)
          .query(
              `INSERT INTO Purchase (purchase_date, total_amount, customer_id)
       VALUES (@date, @total, @user);
       SELECT SCOPE_IDENTITY() AS id;`
          );
      const purchaseId = purRes.recordset[0].id;

      // 3) Create PurchaseDetail and Library entries
      for (const it of items) {
          const pdRes = await pool.request()
              .input('purchase', mssql.Int, purchaseId)
              .input('ci', mssql.Int, it.cartItemId)
              .input('game', mssql.Int, it.gameId)
              .query(
                  `INSERT INTO PurchaseDetail (purchase_id, cart_item_id, gameId)
         VALUES (@purchase, @ci, @game);
         SELECT SCOPE_IDENTITY() AS id;`
              );
          const pdId = pdRes.recordset[0].id;

          await pool.request()
              .input('pd', mssql.Int, pdId)
              .input('user', mssql.Int, userId)
              .input('game', mssql.Int, it.gameId)
              .query(
                  `INSERT INTO Library (purchaseDetailID, user_id, gameId)
                    SELECT @pd, @user, @game
                    WHERE NOT EXISTS (
                    SELECT 1 FROM Library WHERE user_id = @user AND gameId = @game
              );`);
          await pool.request()
              .input('gameId', mssql.Int, it.gameId)
              .query(`
                    UPDATE Games
                    SET SalesCount = ISNULL(SalesCount, 0) + 1
                    WHERE id = @gameId;
              `);

      }

      // 4) Delete purchased cart items in bulk
      const deleteReq = pool.request().input('userId', mssql.Int, userId);
      ids.forEach((_, idx) => deleteReq.input(`id${idx}`, mssql.Int, ids[idx]));
      const params = ids.map((_, idx) => `@id${idx}`).join(', ');
      await deleteReq.query(
          `DELETE ci FROM CartItem ci
     JOIN Cart c ON ci.cart_id = c.id
     WHERE c.user_id = @userId AND ci.id IN (${params});`
      );

      // 5) Remove cart if empty
      const countRes = await pool.request()
          .input('userId', mssql.Int, userId)
          .query(
              `SELECT COUNT(*) AS cnt FROM CartItem ci
       JOIN Cart c ON ci.cart_id = c.id
       WHERE c.user_id = @userId;`
          );
      if (countRes.recordset[0].cnt === 0) {
          await pool.request()
              .input('userId', mssql.Int, userId)
              .query('DELETE FROM Cart WHERE user_id = @userId;');
      }

      res.status(201).json({ purchaseId });
  })
);

module.exports = router;