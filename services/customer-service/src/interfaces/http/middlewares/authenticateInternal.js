
function authenticateInternal(req, res, next) {
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;
    const providedKey = req.headers["x-internal-service-key"];

    if (!expectedKey) {
        console.error("INTERNAL_SERVICE_KEY is not configured");

        return res.status(500).json({
            success: false,
            message: "Internal authentication is not configured"
        });
    }

    if (
        typeof providedKey !== "string" ||
        providedKey.length !== expectedKey.length ||
        !require("node:crypto").timingSafeEqual(
            Buffer.from(providedKey),
            Buffer.from(expectedKey)
        )
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid internal service credentials"
        });
    }

    next();
}

module.exports = authenticateInternal;
