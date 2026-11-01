
const express = require("express");
const crypto = require("node:crypto");

const controller = require(
    "../controllers/StockReservationController"
);

const router = express.Router();

router.use((req, res, next) => {
    const expected = process.env.INTERNAL_SERVICE_KEY;
    const provided = req.get("x-internal-service-key");

    if (!expected || !provided) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized internal request"
        });
    }

    const a = Buffer.from(expected);
    const b = Buffer.from(provided);

    if (
        a.length !== b.length ||
        !crypto.timingSafeEqual(a, b)
    ) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized internal request"
        });
    }

    next();
});

router.post("/reserve", controller.reserve);
router.post("/commit", controller.commit);
router.post("/release", controller.release);
router.get("/reservations/:id", controller.getById);

module.exports = router;
