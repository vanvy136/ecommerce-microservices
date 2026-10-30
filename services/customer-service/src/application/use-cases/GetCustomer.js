class GetCustomer {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }

    async execute({ id, authUserId }) {
        if (!id && !authUserId) {
            throw new Error("Customer ID or Auth User ID is required");
        }

        let customer;

        if (id) {
            customer = await this.customerRepository.findById(id);
        } else {
            customer = await this.customerRepository.findByAuthUserId(authUserId);
        }

        if (!customer) {
            throw new Error("Customer not found");
        }

        return customer;
    }
}

module.exports = GetCustomer;