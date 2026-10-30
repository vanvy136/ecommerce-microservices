const PostgresCustomerRepository = require(
    "../../../infrastructure/repositories/PostgresCustomerRepository"
);

const CreateCustomer = require(
    "../../../application/use-cases/CreateCustomer"
);

const GetCustomer = require(
    "../../../application/use-cases/GetCustomer"
);

const UpdateCustomer = require(
    "../../../application/use-cases/UpdateCustomer"
);

const ManageLoyaltyPoints = require(
    "../../../application/use-cases/ManageLoyaltyPoints"
);

const repository = new PostgresCustomerRepository();

const createCustomer = new CreateCustomer(repository);
const getCustomer = new GetCustomer(repository);
const updateCustomer = new UpdateCustomer(repository);
const manageLoyaltyPoints = new ManageLoyaltyPoints(repository);

function handleError(res, error) {
    const message = error.message;

    if (message === "Customer not found") {
        return res.status(404).json({ error: message });
    }

    if (message === "Customer already exists") {
        return res.status(409).json({ error: message });
    }

    const validationErrors = [
        "Customer ID is required",
        "Customer ID or Auth User ID is required",
        "authUserId is required",
        "fullName is required",
        "Invalid fullName",
        "Invalid loyalty action",
        "Points must be a positive integer",
        "Insufficient loyalty points"
    ];

    if (validationErrors.includes(message)) {
        return res.status(400).json({ error: message });
    }

    console.error("Customer Controller Error:", message);

    return res.status(500).json({
        error: "Internal server error"
    });
}

class CustomerController {
    async create(req, res) {
        try {
            const customer = await createCustomer.execute(req.body);

            return res.status(201).json({
                message: "Customer created successfully",
                data: customer
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async getById(req, res) {
        try {
            const customer = await getCustomer.execute({
                id: req.params.id
            });

            return res.status(200).json({
                data: customer
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async getByAuthUserId(req, res) {
        try {
            const customer = await getCustomer.execute({
                authUserId: req.params.authUserId
            });

            return res.status(200).json({
                data: customer
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async update(req, res) {
        try {
            const customer = await updateCustomer.execute({
                id: req.params.id,
                fullName: req.body.fullName,
                phone: req.body.phone
            });

            return res.status(200).json({
                message: "Customer updated successfully",
                data: customer
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    async managePoints(req, res) {
        try {
            const customer = await manageLoyaltyPoints.execute({
                customerId: req.params.id,
                action: req.body.action,
                points: req.body.points
            });

            return res.status(200).json({
                message: "Loyalty points updated successfully",
                data: customer
            });
        } catch (error) {
            return handleError(res, error);
        }
    }
}

module.exports = new CustomerController();