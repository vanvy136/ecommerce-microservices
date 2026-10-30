const jwt = require("jsonwebtoken");

class JwtService {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.expiresIn = process.env.JWT_EXPIRES_IN || "1h";
        this.issuer = process.env.JWT_ISSUER;
        this.audience = process.env.JWT_AUDIENCE;

        if (!this.secret || Buffer.byteLength(this.secret, "utf8") < 32) {
            throw new Error("JWT_SECRET must contain at least 32 bytes");
        }

        if (!this.issuer || !this.audience) {
            throw new Error("JWT issuer and audience are required");
        }
    }

    generateAccessToken(user) {
        if (
            !user ||
            !user.id ||
            !["customer", "admin"].includes(user.role)
        ) {
            throw new Error("Invalid user data for token");
        }

        return jwt.sign(
            {
                role: user.role
            },
            this.secret,
            {
                algorithm: "HS256",
                subject: String(user.id),
                expiresIn: this.expiresIn,
                issuer: this.issuer,
                audience: this.audience
            }
        );
    }

    verifyAccessToken(token) {
        if (typeof token !== "string" || !token.trim()) {
            throw new Error("Access token is required");
        }

        return jwt.verify(token, this.secret, {
            algorithms: ["HS256"],
            issuer: this.issuer,
            audience: this.audience
        });
    }
}

module.exports = JwtService;
