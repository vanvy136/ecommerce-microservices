const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: "Stock must be an integer"
            }
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        imageUrl: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

productSchema.index({
    name: "text",
    description: "text"
});

productSchema.index({
    category: 1
});

module.exports = mongoose.model("Product", productSchema);