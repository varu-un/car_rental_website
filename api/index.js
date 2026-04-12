const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Serve static files from Client folder
app.use(express.static(path.join(__dirname, "../Client")));

// 🔥 MongoDB - Connection
let mongooseConnection = null;

async function connectDB() {
  if (mongooseConnection) {
    return mongooseConnection;
  }

  try {
    mongooseConnection = await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://username:password@cluster.mongodb.net/carRental?retryWrites=true&w=majority",
    );
    console.log("✅ MongoDB Connected");
    return mongooseConnection;
  } catch (err) {
    console.log("❌ DB Error:", err);
    throw err;
  }
}

// Import Booking model
let Booking = null;

async function getBookingModel() {
  await connectDB();
  if (!Booking) {
    const bookingSchema = new mongoose.Schema({
      name: String,
      email: String,
      phone: String,
      location: String,
      amount: Number,
      paymentId: String,
      orderId: String,
      date: { type: Date, default: Date.now },
    });
    Booking = mongoose.model("Booking", bookingSchema);
  }
  return Booking;
}

// 🔥 Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "YOUR_KEY_ID",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_KEY_SECRET",
});

// ✅ Serve index.html for root and unmatched routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/index.html"));
});

// ✅ Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ✅ CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
    });

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ VERIFY + SAVE BOOKING
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userData,
    } = req.body;

    // 🔥 CREATE SIGNATURE
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "YOUR_KEY_SECRET",
      )
      .update(body)
      .digest("hex");

    // 🔥 VERIFY SIGNATURE
    if (expectedSignature === razorpay_signature) {
      // ✅ SAVE BOOKING TO MONGODB
      const BookingModel = await getBookingModel();
      await Booking.create({
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

      res.json({ status: "success" });
    } else {
      res.status(400).json({ status: "failure" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ✅ ADMIN: GET BOOKINGS
app.get("/bookings", async (req, res) => {
  try {
    const BookingModel = await getBookingModel();
    const data = await BookingModel.find().sort({ date: -1 });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Export for Vercel
module.exports = app;
