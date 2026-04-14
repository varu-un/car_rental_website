const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true, // 🔥 faster queries for user bookings
    },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },

    location: { type: String, required: true, trim: true },

    pickupDate: { type: String, required: true },
    returnDate: { type: String, required: true },

    days: { type: Number, required: true, min: 1 },

    cars: [
      {
        id: String,
        name: String,
        image: String,
        price: Number,
        quantity: { type: Number, default: 1 },
      },
    ],

    totalCars: { type: Number, default: 1 },

    amount: { type: Number, required: true, min: 0 },

    bookingStatus: {
      type: String,
      enum: ["confirmed", "completed", "cancelled"],
      default: "confirmed",
    },

    paymentSummary: {
      methodType: String, // card / upi / netbanking
      brand: String, // visa / mastercard
      last4: String, // last 4 digits
      upiIdMasked: String,
      gatewayPaymentId: String,
    },

    paymentId: {
      type: String,
      required: true,
      index: true, // 🔥 important for debugging payments
    },

    orderId: {
      type: String,
      required: true,
      index: true,
    },

    bookingDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Booking", bookingSchema);
