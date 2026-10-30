class User {
    constructor({
        id,
        email,
        passwordHash,
        role = "customer",
        createdAt = null,
        updatedAt = null
    }) {
        if (!id) {
            throw new Error("User ID is required");
        }

        if (!email || typeof email !== "string") {
            throw new Error("Email is required");
        }

        if (!passwordHash) {
            throw new Error("Password hash is required");
        }

        if (!["customer", "admin"].includes(role)) {
            throw new Error("Invalid user role");
        }

        this.id = id;
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toPublicJSON() {
        return {
            id: this.id,
            email: this.email,
            role: this.role,
            createdAt: this.createdAt
        };
    }
}

module.exports = User;
