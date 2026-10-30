
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");

const router = express.Router();

const target = process.env.PRODUCT_SERVICE_URL;

if (!target) {
    throw new Error("PRODUCT_SERVICE_URL is not configured");
}

// Only admin can create, update or delete products.
router.use((req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
        return authenticate(req, res, () => {
            authorize("admin")(req, res, next);
        });
    }

    next();
});

// Forward all /products requests to Product Service.
router.use(
    createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => `/products${path}`,
        on: {
            error: (err, req, res) => {
                console.error("Product proxy error:", err.message);

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(JSON.stringify({
                    success: false,
                    message: "Product Service unavailable"
                }));
            }
        }
    })
);

module.exports = router;
