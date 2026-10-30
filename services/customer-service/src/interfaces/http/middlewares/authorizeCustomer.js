function authorizeCustomer(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (req.user.role === "admin") {
        return next();
    }

    // Khách hàng chỉ được thao tác trên hồ sơ của mình.
    // Không sử dụng customerId do client tự cung cấp
    // làm bằng chứng xác thực.
    if (req.user.role === "customer") {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Forbidden"
    });
}

function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Forbidden"
        });
    }

    next();
}

module.exports = { authorizeCustomer, adminOnly };