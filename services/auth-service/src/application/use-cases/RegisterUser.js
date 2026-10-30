
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const User = require("../../domain/entities/User");

class RegisterUser {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ email, password }) {
        if (!email || !password) {
            throw new Error("Email and password are required");
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await this.userRepository.findByEmail(
            normalizedEmail
        );

        if (existingUser) {
            throw new Error("Email already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = new User({
            id: randomUUID(),
            email: normalizedEmail,
            passwordHash,
            role: "customer"
        });

        const savedUser = await this.userRepository.saveWithOutbox(user);

        console.log("User and Outbox event saved:", {
            userId: savedUser.id
        });

        return savedUser.toPublicJSON();
    }
}

module.exports = RegisterUser;
