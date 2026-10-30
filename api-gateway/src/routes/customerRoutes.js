const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const router = express.Router();

router.use(
    createProxyMiddleware({
        target: process.env.CUSTOMER_SERVICE_URL,
        changeOrigin: true,

        // Giữ nguyên đường dẫn gốc:
        // /customers/me -> http://127.0.0.1:3102/customers/me
        pathRewrite: (path, req) => req.originalUrl,

        on: {
            error: (err, req, res) => {
                console.error("Customer proxy error:", err.message);

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(JSON.stringify({
                    success: false,
                    message: "Customer Service unavailable"
                }));
            }
        }
    })
);

module.exports = router;