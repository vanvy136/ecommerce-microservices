
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const router = express.Router();

router.use(
    createProxyMiddleware({
        target: process.env.AUTH_SERVICE_URL,
        changeOrigin: true,

        // Giữ nguyên đường dẫn gốc:
        // /auth/me -> http://127.0.0.1:3101/auth/me
        pathRewrite: (path, req) => req.originalUrl,

        on: {
            error: (err, req, res) => {
                console.error("Auth proxy error:", err.message);

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(JSON.stringify({
                    success: false,
                    message: "Auth Service unavailable"
                }));
            }
        }
    })
);

module.exports = router;
