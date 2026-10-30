const PostgresUserRepository = require("../../../infrastructure/repositories/PostgresUserRepository");

const repository = new PostgresUserRepository();

async function me(req, res) {
    try {
        const user = await repository.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Authenticated user",
            data: user.toPublicJSON()
        });
    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { me };
