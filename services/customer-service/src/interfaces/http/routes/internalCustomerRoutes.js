
const express = require("express");

const authenticateInternal = require(
    "../middlewares/authenticateInternal"
);

const {
    getLoyalty
} = require("../controllers/InternalCustomerController");

const router = express.Router();

router.get(
    "/:authUserId/loyalty",
    authenticateInternal,
    getLoyalty
);

module.exports = router;
