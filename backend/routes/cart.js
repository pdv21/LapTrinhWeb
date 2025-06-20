const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { poolPromise, mssql } = require('../db');
const router = express.Router();

// CART: Add item
router.post(
    '/add',
    asyncHandler(async(req, res) => {
        const { userId, gameId } = req.body;
        const pool = await poolPromise;

        // 1) Đảm bảo customer tồn tại
        const cust = await pool.request()
            .input('userId', mssql.Int, userId)
            .query('SELECT id FROM Customer WHERE id = @userId');
        if (!cust.recordset.length) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // 2) **MỚI**: kiểm tra xem user đã có game này trong thư viện chưa
        const owned = await pool.request()
            .input('userId', mssql.Int, userId)
            .input('gameId', mssql.Int, gameId)
            .query(`
        SELECT 1 
        FROM Library 
        WHERE user_id = @userId 
          AND gameId  = @gameId
      `);
        if (owned.recordset.length) {
            return res.status(400).json({ message: 'Game đã có trong thư viện, không thể thêm vào giỏ hàng' });
        }

        // 3) Lấy hoặc tạo Cart
        let cartRes = await pool.request()
            .input('userId', mssql.Int, userId)
            .query('SELECT id FROM Cart WHERE user_id = @userId');
        let cartId = cartRes.recordset.length ? cartRes.recordset[0].id : null;
        if (!cartId) {
            const newCart = await pool.request()
                .input('userId', mssql.Int, userId)
                .query('INSERT INTO Cart(user_id) VALUES(@userId); SELECT SCOPE_IDENTITY() AS id;');
            cartId = newCart.recordset[0].id;
        }

        // 4) Ngăn duplicate trong giỏ
        const dup = await pool.request()
            .input('cartId', mssql.Int, cartId)
            .input('gameId', mssql.Int, gameId)
            .query('SELECT id FROM CartItem WHERE cart_id = @cartId AND game_id = @gameId');
        if (dup.recordset.length) {
            return res.status(200).json({ message: 'Đã có trong giỏ hàng' });
        }

        // 5) Thêm vào giỏ
        const ins = await pool.request()
            .input('cartId', mssql.Int, cartId)
            .input('gameId', mssql.Int, gameId)
            .query('INSERT INTO CartItem(cart_id, game_id) VALUES(@cartId, @gameId); SELECT SCOPE_IDENTITY() AS id;');
        res.status(201).json({ cartItemId: ins.recordset[0].id });
    })
);

// CART: List items by user
router.get(
    '/:userId',
    asyncHandler(async(req, res) => {
        const userId = parseInt(req.params.userId, 10);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 10, 100);
        const offset = (page - 1) * pageSize;
        const pool = await poolPromise;

        // 1) Đếm tổng số item trong giỏ
        const countRes = await pool.request()
            .input('userId', mssql.Int, userId)
            .query(`
        SELECT COUNT(*) AS total
        FROM CartItem ci
        JOIN Cart c   ON ci.cart_id = c.id
        WHERE c.user_id = @userId;
      `);
        const total = countRes.recordset[0].total;

        // 2) Lấy item trang hiện tại
        const itemsRes = await pool.request()
            .input('userId', mssql.Int, userId)
            .input('offset', mssql.Int, offset)
            .input('size', mssql.Int, pageSize)
            .query(`
        SELECT ci.id AS cartItemId,
               g.id  AS gameId,
               g.Name, g.Price, g.Discount
        FROM CartItem ci
        JOIN Cart c   ON ci.cart_id = c.id
        JOIN Games g  ON ci.game_id = g.id
        WHERE c.user_id = @userId
        ORDER BY ci.id
        OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;
      `);

        res.json({
            items: itemsRes.recordset,
            total,
            page,
            pageSize
        });
    })
);
// === CART: Remove item ======================================================
router.delete(
  '/:cartItemId',
  asyncHandler(async (req, res) => {
    const cartItemId = parseInt(req.params.cartItemId, 10);
    if (isNaN(cartItemId)) {
      return res.status(400).json({ message: 'Invalid cartItemId' });
    }

    const pool = await poolPromise;

    /* 1) Lấy thông tin cart item + chủ sở hữu ------------------------------ */
    const itemRes = await pool.request()
      .input('id', mssql.Int, cartItemId)
      .query(`
        SELECT ci.id, c.user_id
        FROM CartItem ci
        JOIN Cart c ON ci.cart_id = c.id
        WHERE ci.id = @id
      `);
    if (!itemRes.recordset.length) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    const ownerId = itemRes.recordset[0].user_id;

    /* 2) (Tuỳ chọn) – nếu phía client truyền userId để bảo vệ thêm ---------- */
    if (req.body.userId && +req.body.userId !== ownerId) {
      return res.status(403).json({ message: 'Bạn không sở hữu cart item này' });
    }

    /* 3) Xoá cart item ------------------------------------------------------ */
    await pool.request()
      .input('id', mssql.Int, cartItemId)
      .query('DELETE FROM CartItem WHERE id = @id');

    /* 4) Nếu cart trống thì xoá cart --------------------------------------- */
    await pool.request()
      .input('userId', mssql.Int, ownerId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM CartItem ci
          JOIN Cart c ON ci.cart_id = c.id
          WHERE c.user_id = @userId
        )
        DELETE FROM Cart WHERE user_id = @userId;
      `);

    res.json({ message: 'Đã xoá khỏi giỏ hàng' });
  })
);

module.exports = router;
