
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Bearer token required"
    });
  }

  try {
    const payload = jwt.verify(
      match[1],
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      }
    );

    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      !["customer", "admin"].includes(payload.role)
    ) {
      throw new Error("Invalid token payload");
    }

    req.user = {
      id: payload.sub,
      role: payload.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

module.exports = authenticate;
