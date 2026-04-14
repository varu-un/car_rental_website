const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://car-rental-website-9tcu.vercel.app",
      "https://car-rental-website-ten-gamma.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../Client")));

let mongooseConnection = null;

async function connectDB() {
  if (mongooseConnection) return mongooseConnection;

  try {
    mongooseConnection = await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
    return mongooseConnection;
  } catch (err) {
    console.log("❌ DB Error:", err);
    throw err;
  }
}

let Booking = null;

async function getBookingModel() {
  await connectDB();

  if (!Booking) {
    const bookingSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        location: { type: String, required: true },
        pickupDate: { type: String },
        returnDate: { type: String },
        days: { type: Number, default: 0 },
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
        paymentId: { type: String, required: true },
        orderId: { type: String, required: true },
        bookingDate: { type: Date, default: Date.now },
      },
      { timestamps: true },
    );

    Booking =
      mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
  }

  return Booking;
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/index.html"));
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.post("/create-order", async (req, res) => {
  try {
    const amount = Number(req.body?.amount || 0);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[/create-order] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create payment order.",
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userData,
    } = req.body || {};

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userData
    ) {
      return res.status(400).json({
        success: false,
        status: "failure",
        message: "Missing payment data",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        status: "failure",
        message: "Invalid payment signature",
      });
    }

    const BookingModel = await getBookingModel();

    const booking = await BookingModel.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      location: userData.location,
      pickupDate: userData.pickupDate,
      returnDate: userData.returnDate,
      days: userData.days,
      cars: userData.cars,
      totalCars: userData.totalCars,
      amount: userData.amount,
      bookingStatus: "confirmed",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingDate: new Date(),
    });

    return res.json({
      success: true,
      status: "success",
      booking,
    });
  } catch (err) {
    console.error("[/verify-payment] Error:", err);
    return res.status(500).json({
      success: false,
      status: "error",
      message: err.message,
    });
  }
});

app.get("/admin/bookings", async (req, res) => {
  try {
    const BookingModel = await getBookingModel();
    const data = await BookingModel.find().sort({ bookingDate: -1 });
    res.json({
      success: true,
      bookings: data,
    });
  } catch (error) {
    console.error("[/admin/bookings] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
