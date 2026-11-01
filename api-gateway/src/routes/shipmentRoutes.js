
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

const router = express.Router();

const target = process.env.SHIPMENT_SERVICE_URL;

if (!target) {
  throw new Error("SHIPMENT_SERVICE_URL is not configured");
}

// Bat buoc co JWT hop le.
router.use(authenticate);

// Phan quyen theo endpoint va HTTP method.
router.use((req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Customer va Admin duoc xem theo Shipment ID.
  // Shipment Service se kiem tra quyen so huu.
  if (
    method === "GET" &&
    /^\/[0-9a-f-]{36}$/i.test(path)
  ) {
    return authorize("customer", "admin")(req, res, next);
  }

  // Cac endpoint con lai chi danh cho Admin.
  return authorize("admin")(req, res, next);
});

// Xoa header danh tinh do client tu gui.
router.use((req, res, next) => {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];
  next();
});

router.use(
  createProxyMiddleware({
    target,
    changeOrigin: true,

    pathRewrite: (path) => {
      return path.startsWith("/shipments")
        ? path
        : `/shipments${path}`;
    },

    on: {
      error: (error, req, res) => {
        console.error("Shipment proxy error:", error.message);

        if (!res.headersSent) {
          res.writeHead(502, {
            "Content-Type": "application/json"
          });
        }

        res.end(
          JSON.stringify({
            success: false,
            message: "Shipment Service unavailable"
          })
        );
      }
    }
  })
);

module.exports = router;
