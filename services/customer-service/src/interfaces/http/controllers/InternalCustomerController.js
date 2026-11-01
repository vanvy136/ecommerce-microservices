
const PostgresCustomerRepository = require(
    "../../../infrastructure/repositories/PostgresCustomerRepository"
);

const repository = new PostgresCustomerRepository();

async function getLoyalty(req, res) {
    try {
        const { authUserId } = req.params;

        const customer = await repository.findByAuthUserId(authUserId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                authUserId: customer.authUserId,
                loyaltyPoints: customer.loyaltyPoints,
                membershipTier: customer.membershipTier
            }
        });
    } catch (error) {
        console.error("Internal loyalty lookup failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { getLoyalty };
