const LoginUser = require("../../../application/use-cases/LoginUser");
const PostgresUserRepository = require("../../../infrastructure/repositories/PostgresUserRepository");
const JwtService = require("../../../infrastructure/security/JwtService");

const repository = new PostgresUserRepository();
const loginUser = new LoginUser(repository);
const jwtService = new JwtService();

async function login(req, res) {
    try {
        const { email, password } = req.body || {};

        const user = await loginUser.execute({
            email,
            password
        });

        const accessToken = jwtService.generateAccessToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user,
                accessToken,
                tokenType: "Bearer",
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        });
    } catch (error) {
        if (error.message === "Email and password are required") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === "Invalid email or password") {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { login };
