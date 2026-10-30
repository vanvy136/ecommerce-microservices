const bcrypt = require("bcryptjs");

class LoginUser {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ email, password }) {
        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            throw new Error("Email and password are required");
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await this.userRepository.findByEmail(
            normalizedEmail
        );

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            throw new Error("Invalid email or password");
        }

        return user.toPublicJSON();
    }
}

module.exports = LoginUser;
