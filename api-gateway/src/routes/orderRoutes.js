
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

const router = express.Router();

const target = process.env.ORDER_SERVICE_URL;

if (!target) {
  throw new Error("ORDER_SERVICE_URL is not configured");
}

// Tat ca Order API hien tai chi danh cho Customer.
router.use(authenticate);
router.use(authorize("customer"));

// Loai bo header danh tinh do client tu gui.
router.use((req, res, next) => {
  delete req.headers["x-user-id"];
  next();
});

router.use(
  createProxyMiddleware({
    target,
    changeOrigin: true,

    pathRewrite: (path) => {
      return path.startsWith("/orders")
        ? path
        : `/orders${path}`;
    },

    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-user-id", req.user.id);
      },

      error: (error, req, res) => {
        console.error("Order proxy error:", error.message);

        if (!res.headersSent) {
          res.writeHead(502, {
            "Content-Type": "application/json"
          });
        }

        res.end(
          JSON.stringify({
            success: false,
            message: "Order Service unavailable"
          })
        );
      }
    }
  })
);

module.exports = router;

