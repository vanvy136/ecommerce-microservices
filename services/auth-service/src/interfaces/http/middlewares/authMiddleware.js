const JwtService = require("../../../infrastructure/security/JwtService");

const jwtService = new JwtService();

function authMiddleware(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            success: false,
            message: "Access token is required"
        });
    }

    const parts = authorization.trim().split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid authorization format"
        });
    }

    try {
        const payload = jwtService.verifyAccessToken(parts[1]);

        if (
            !payload.sub ||
            !["customer", "admin"].includes(payload.role)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }

        req.user = {
            id: payload.sub,
            role: payload.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }
}

module.exports = authMiddleware;
