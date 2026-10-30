class ManageLoyaltyPoints {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }

    async execute({ customerId, action, points }) {
        if (!customerId) {
            throw new Error("Customer ID is required");
        }

        if (!["ADD", "REDEEM"].includes(action)) {
            throw new Error("Invalid loyalty action");
        }

        if (!Number.isInteger(points) || points <= 0) {
            throw new Error("Points must be a positive integer");
        }

        const customer = await this.customerRepository.findById(customerId);

        if (!customer) {
            throw new Error("Customer not found");
        }

        if (action === "ADD") {
            customer.addPoints(points);
        } else {
            customer.redeemPoints(points);
        }

        return await this.customerRepository.update(customer);
    }
}

module.exports = ManageLoyaltyPoints;