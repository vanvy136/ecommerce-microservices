
const crypto = require("crypto");

function authenticateInternal(req, res, next) {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  const providedToken = req.headers["x-internal-service-token"];

  if (!expectedToken || expectedToken.length < 32) {
    console.error("INTERNAL_SERVICE_TOKEN is not configured");

    return res.status(503).json({
      success: false,
      message: "Internal authentication unavailable"
    });
  }

  if (typeof providedToken !== "string") {
    return res.status(401).json({
      success: false,
      message: "Internal authentication required"
    });
  }

  const expected = Buffer.from(expectedToken, "utf8");
  const provided = Buffer.from(providedToken, "utf8");

  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid internal authentication"
    });
  }

  next();
}

module.exports = authenticateInternal;

