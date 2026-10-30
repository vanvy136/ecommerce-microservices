const RegisterUser = require("../../../application/use-cases/RegisterUser");
const PostgresUserRepository = require("../../../infrastructure/repositories/PostgresUserRepository");

const repository = new PostgresUserRepository();
const registerUser = new RegisterUser(repository);

async function register(req, res) {
    try {
        const { email, password } = req.body || {};

        const user = await registerUser.execute({
            email,
            password
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: user
        });
    } catch (error) {
        const validationMessages = [
            "Email is required",
            "Invalid email format",
            "Password must have at least 8 characters",
            "Password must not exceed 72 bytes"
        ];

        if (validationMessages.includes(error.message)) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message === "Email already registered" ||
            error.code === "23505"
        ) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { register };
