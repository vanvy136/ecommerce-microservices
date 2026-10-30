const express = require("express");

const controller = require("../controllers/CustomerController");
const authenticate = require("../middlewares/authenticate");
const { adminOnly } = require("../middlewares/authorizeCustomer");

const PostgresCustomerRepository = require(
    "../../../infrastructure/repositories/PostgresCustomerRepository"
);

const router = express.Router();
const repository = new PostgresCustomerRepository();

router.use(authenticate);

// Xem hồ sơ của chính mình
router.get("/me", (req, res) => {
    req.params.authUserId = req.user.id;
    return controller.getByAuthUserId(req, res);
});

// Cập nhật hồ sơ của chính mình
router.patch("/me", async (req, res) => {
    try {
        const customer = await repository.findByAuthUserId(req.user.id);

        if (!customer) {
            return res.status(404).json({
                error: "Customer not found"
            });
        }

        req.params.id = customer.id;
        return controller.update(req, res);
    } catch (error) {
        console.error("Customer lookup error:", error.message);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

// Các chức năng dành cho Admin
router.post("/", adminOnly, (req, res) => controller.create(req, res));

router.get("/:id", adminOnly, (req, res) =>
    controller.getById(req, res)
);

router.patch("/:id", adminOnly, (req, res) =>
    controller.update(req, res)
);

router.post("/:id/loyalty", adminOnly, (req, res) =>
    controller.managePoints(req, res)
);

module.exports = router;