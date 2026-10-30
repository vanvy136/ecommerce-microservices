class Customer {
    constructor({
        id = null,
        authUserId,
        fullName,
        phone = null,
        loyaltyPoints = 0,
        membershipTier = "BRONZE",
        createdAt = null,
        updatedAt = null
    }) {
        if (!authUserId) {
            throw new Error("authUserId is required");
        }

        if (!fullName || !fullName.trim()) {
            throw new Error("fullName is required");
        }

        if (!Number.isInteger(loyaltyPoints) || loyaltyPoints < 0) {
            throw new Error("loyaltyPoints must be a non-negative integer");
        }

        const validTiers = [
            "BRONZE",
            "SILVER",
            "GOLD",
            "PLATINUM"
        ];

        if (!validTiers.includes(membershipTier)) {
            throw new Error("Invalid membership tier");
        }

        this.id = id;
        this.authUserId = authUserId;
        this.fullName = fullName.trim();
        this.phone = phone;
        this.loyaltyPoints = loyaltyPoints;
        this.membershipTier = membershipTier;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    addPoints(points) {
        if (!Number.isInteger(points) || points <= 0) {
            throw new Error("Points must be a positive integer");
        }

        this.loyaltyPoints += points;
    }

    redeemPoints(points) {
        if (!Number.isInteger(points) || points <= 0) {
            throw new Error("Points must be a positive integer");
        }

        if (points > this.loyaltyPoints) {
            throw new Error("Insufficient loyalty points");
        }

        this.loyaltyPoints -= points;
    }

    updateProfile({ fullName, phone }) {
        if (fullName !== undefined) {
            if (typeof fullName !== "string" || !fullName.trim()) {
                throw new Error("Invalid fullName");
            }

            this.fullName = fullName.trim();
        }

        if (phone !== undefined) {
            this.phone = phone;
        }
    }
}

module.exports = Customer;