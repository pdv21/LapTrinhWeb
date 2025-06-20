// middleware/asyncHandler.js
// Wrap async route-handlers để catch lỗi và forward vào error-handler
function asyncHandler(fn) {
    return function (req, res, next) {
      Promise
        .resolve(fn(req, res, next))
        .catch(next);
    };
  }
  
  module.exports = asyncHandler;
  