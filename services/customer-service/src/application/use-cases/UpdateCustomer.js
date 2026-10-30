class UpdateCustomer {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }

    async execute({ id, fullName, phone }) {
        if (!id) {
            throw new Error("Customer ID is required");
        }

        const customer = await this.customerRepository.findById(id);

        if (!customer) {
            throw new Error("Customer not found");
        }

        customer.updateProfile({
            fullName,
            phone
        });

        return await this.customerRepository.update(customer);
    }
}

module.exports = UpdateCustomer;