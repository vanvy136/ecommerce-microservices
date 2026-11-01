
const mongoose = require("mongoose");

const stockReservationSchema = new mongoose.Schema(
    {
        reservationId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            immutable: true
        },

        orderId: {
            type: String,
            default: null
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            immutable: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
            immutable: true,
            validate: {
                validator: Number.isSafeInteger,
                message: "Quantity must be an integer"
            }
        },

        status: {
            type: String,
            enum: [
                "pending",
                "reserved",
                "released",
                "committed"
            ],
            default: "pending"
        },

        reservedAt: {
            type: Date,
            default: null
        },

        releasedAt: {
            type: Date,
            default: null
        },

        committedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

stockReservationSchema.index({
    productId: 1,
    status: 1
});

module.exports = mongoose.model(
    "StockReservation",
    stockReservationSchema
);
