const Customer = require("../../domain/entities/Customer");

class CreateCustomer {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }

    async execute({ authUserId, fullName, phone }) {
        const existing = await this.customerRepository.findByAuthUserId(authUserId);

        if (existing) {
            throw new Error("Customer already exists");
        }

        const customer = new Customer({
            authUserId,
            fullName,
            phone
        });

        return await this.customerRepository.create(customer);
    }
}

module.exports = CreateCustomer;