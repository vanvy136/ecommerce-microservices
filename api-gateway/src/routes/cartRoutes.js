const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

const router = express.Router();

const target = process.env.CART_SERVICE_URL;

if (!target) {
  throw new Error("CART_SERVICE_URL is not configured");
}

// Tất cả API giỏ hàng chỉ dành cho Customer.
router.use(authenticate);
router.use(authorize("customer"));

// Không tin header danh tính do client tự gửi.
router.use((req, res, next) => {
  delete req.headers["x-user-id"];
  next();
});

router.use(
  createProxyMiddleware({
    target,
    changeOrigin: true,

    pathRewrite: (path, req) => {
  const rewrittenPath = path.startsWith("/cart")
    ? path
    : `/cart${path}`;

  console.log("[CART PROXY] Original:", path);
  console.log("[CART PROXY] Forward:", rewrittenPath);

  return rewrittenPath;
},

    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-user-id", req.user.id);
      },

      error: (error, req, res) => {
        console.error("Cart proxy error:", error.message);

        if (!res.headersSent) {
          res.writeHead(502, {
            "Content-Type": "application/json"
          });
        }

        res.end(
          JSON.stringify({
            success: false,
            message: "Cart Service unavailable"
          })
        );
      }
    }
  })
);

module.exports = router;