const express = require("express");

const { register } = require("../controllers/RegisterController");
const { login } = require("../controllers/LoginController");
const { me } = require("../controllers/MeController");
const authMiddleware = require("../middlewares/authMiddleware");

const requireRole = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, me);

router.get("/customer-only",
    authMiddleware,
    requireRole("customer"),
    (req, res) => res.json({
        success: true,
        message: "Customer access granted"
    })
);

router.get("/admin-only",
    authMiddleware,
    requireRole("admin"),
    (req, res) => res.json({
        success: true,
        message: "Admin access granted"
    })
);

module.exports = router;

