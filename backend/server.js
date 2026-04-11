const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("./models/booking");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 MongoDB
mongoose
  .connect(
    "mongodb+srv://pratyushtripathy001:Pratyush%402003@cluster0.zc3cfzy.mongodb.net/carRental?retryWrites=true&w=majority",
  )
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

// 🔥 Razorpay
const razorpay = new Razorpay({
  key_id: "YOUR_KEY_ID",
  key_secret: "YOUR_KEY_SECRET",
});

// ✅ CREATE ORDER
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
  });

  res.json(order);
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
      .createHmac("sha256", "YOUR_KEY_SECRET")
      .update(body)
      .digest("hex");

    // 🔥 VERIFY SIGNATURE
    if (expectedSignature === razorpay_signature) {
      // ✅ SAVE BOOKING TO MONGODB
      await Booking.create({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        amount: userData.amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });

      res.json({ status: "success" });
    } else {
      res.status(400).json({ status: "failure" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error" });
  }
});

// ✅ ADMIN: GET BOOKINGS
app.get("/bookings", async (req, res) => {
  const data = await Booking.find().sort({ date: -1 });
  res.json(data);
});

// 🚀 START
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
