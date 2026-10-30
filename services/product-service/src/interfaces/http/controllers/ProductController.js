
const mongoose = require("mongoose");
const Product = require("../../../infrastructure/database/models/ProductModel");

function validId(id) {
    return mongoose.isValidObjectId(id);
}

function validateProduct(body, partial = false) {
    const allowed = [
        "name", "description", "price",
        "stock", "category", "imageUrl", "isActive"
    ];

    const data = {};

    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            data[key] = body[key];
        }
    }

    if (!partial || "name" in data) {
        if (typeof data.name !== "string" || !data.name.trim()) {
            throw new Error("Valid name is required");
        }
    }

    if (!partial || "category" in data) {
        if (typeof data.category !== "string" || !data.category.trim()) {
            throw new Error("Valid category is required");
        }
    }

    if (!partial || "price" in data) {
        if (typeof data.price !== "number" ||
            !Number.isFinite(data.price) || data.price < 0) {
            throw new Error("Price must be a non-negative number");
        }
    }

    if (!partial || "stock" in data) {
        if (!Number.isInteger(data.stock) || data.stock < 0) {
            throw new Error("Stock must be a non-negative integer");
        }
    }

    if ("isActive" in data && typeof data.isActive !== "boolean") {
        throw new Error("isActive must be boolean");
    }

    for (const key of ["description", "imageUrl"]) {
        if (key in data && typeof data[key] !== "string") {
            throw new Error(`${key} must be a string`);
        }
    }

    return data;
}

// CREATE
exports.createProduct = async (req, res) => {
    try {
        const data = validateProduct(req.body);
        const product = await Product.create(data);

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// READ ALL + SEARCH + FILTER + PAGINATION
exports.getProducts = async (req, res) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        if (!Number.isSafeInteger(page) || page < 1 ||
            !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters"
            });
        }

        const filter = {};

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }

        if (req.query.isActive !== undefined) {
            if (!["true", "false"].includes(req.query.isActive)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid isActive value"
                });
            }
            filter.isActive = req.query.isActive === "true";
        }

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Product.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// READ BY ID
exports.getProductById = async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({ success: true, data: product });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// UPDATE
exports.updateProduct = async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    try {
        const data = validateProduct(req.body, true);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            message: "Product updated successfully",
            data: product
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// SOFT DELETE
exports.deleteProduct = async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            message: "Product deactivated successfully",
            data: product
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// CHECK STOCK
exports.checkStock = async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    const quantity = Number(req.query.quantity);

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive integer"
        });
    }

    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.json({
            success: true,
            data: {
                productId: product.id,
                stock: product.stock,
                requestedQuantity: quantity,
                available: product.isActive &&
                    product.stock >= quantity
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
