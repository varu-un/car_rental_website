const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    pickupDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    days: { type: Number, required: true },
    cars: [
      {
        id: String,
        name: String,
        image: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalCars: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    bookingStatus: {
      type: String,
      enum: ["confirmed", "completed", "cancelled"],
      default: "confirmed",
    },
    paymentSummary: {
      methodType: String,
      brand: String,
      last4: String,
      gatewayPaymentId: String,
    },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true },
    bookingDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
