const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");

const Booking = require("./models/booking");
const User = require("./models/user");
const { authRequired } = require("./middleware/auth");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../Client")));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

/* -------------------- AUTH -------------------- */

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = signToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/auth/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/* -------------------- USER DATA -------------------- */

app.get("/user/addresses", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("addresses");
    res.json(user?.addresses || []);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

app.post("/user/addresses", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    user.addresses.push({
      label: req.body.label || "Home",
      fullName: req.body.fullName,
      phone: req.body.phone,
      line1: req.body.line1,
      line2: req.body.line2,
      city: req.body.city,
      state: req.body.state,
      postalCode: req.body.postalCode,
      country: req.body.country || "India",
      isDefault: !!req.body.isDefault,
    });

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error("Save address error:", error);
    res.status(500).json({ message: "Failed to save address" });
  }
});

app.get("/user/payment-options", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("savedPayments");
    res.json(user?.savedPayments || []);
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ message: "Failed to fetch payment options" });
  }
});

app.post("/user/payment-options", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    user.savedPayments.push({
      type: req.body.type,
      brand: req.body.brand || "",
      last4: req.body.last4 || "",
      upiIdMasked: req.body.upiIdMasked || "",
      gatewayCustomerId: req.body.gatewayCustomerId || "",
      gatewayTokenId: req.body.gatewayTokenId || "",
      isDefault: !!req.body.isDefault,
    });

    await user.save();

    res.json({
      success: true,
      savedPayments: user.savedPayments,
    });
  } catch (error) {
    console.error("Save payment option error:", error);
    res.status(500).json({ message: "Failed to save payment option" });
  }
});

app.get("/user/bookings", authRequired, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (error) {
    console.error("Fetch user bookings error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

/* -------------------- PAYMENTS -------------------- */

app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
    });

    res.json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Unable to create order" });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userData,
      userId,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ status: "failure" });
    }

    await Booking.create({
      userId: userId || null,
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
      paymentSummary: {
        methodType: userData.paymentMethodType || "",
        brand: userData.paymentBrand || "",
        last4: userData.paymentLast4 || "",
        gatewayPaymentId: razorpay_payment_id,
      },
    });

    res.json({ status: "success" });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ status: "error" });
  }
});

/* -------------------- BOOKINGS + ADMIN -------------------- */

app.get("/bookings", async (req, res) => {
  try {
    const data = await Booking.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});

app.get("/analytics/summary", async (req, res) => {
  try {
    const bookings = await Booking.find();

    const totalRevenue = bookings.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    const totalBookings = bookings.length;

    const totalCarsRented = bookings.reduce(
      (sum, item) => sum + (item.totalCars || 0),
      0,
    );

    const avgBookingValue = totalBookings ? totalRevenue / totalBookings : 0;

    res.json({
      totalRevenue,
      totalBookings,
      totalCarsRented,
      avgBookingValue,
    });
  } catch (error) {
    console.error("Summary analytics error:", error);
    res.status(500).json({ message: "Failed to load summary analytics" });
  }
});

app.get("/analytics/monthly-revenue", async (req, res) => {
  try {
    const bookings = await Booking.find();

    const monthlyMap = {};

    bookings.forEach((booking) => {
      const date = new Date(
        booking.bookingDate || booking.createdAt || Date.now(),
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = 0;
      }

      monthlyMap[key] += booking.amount || 0;
    });

    const labels = Object.keys(monthlyMap).sort();
    const values = labels.map((label) => monthlyMap[label]);

    res.json({ labels, values });
  } catch (error) {
    console.error("Monthly revenue error:", error);
    res.status(500).json({ message: "Failed to load monthly revenue" });
  }
});

app.get("/analytics/top-cars", async (req, res) => {
  try {
    const bookings = await Booking.find();

    const carMap = {};

    bookings.forEach((booking) => {
      (booking.cars || []).forEach((car) => {
        const name = car.name || "Unknown Car";
        const quantity = car.quantity || 1;

        if (!carMap[name]) {
          carMap[name] = 0;
        }

        carMap[name] += quantity;
      });
    });

    const sortedCars = Object.entries(carMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    res.json({
      labels: sortedCars.map(([name]) => name),
      values: sortedCars.map(([, count]) => count),
    });
  } catch (error) {
    console.error("Top cars error:", error);
    res.status(500).json({ message: "Failed to load top cars analytics" });
  }
});

/* -------------------- STATIC PAGES -------------------- */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/index.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/login.html"));
});

app.get("/signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/signup.html"));
});

app.get("/account.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/account.html"));
});

app.get("/mybookings.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/mybookings.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/admin-login.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/admin.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
