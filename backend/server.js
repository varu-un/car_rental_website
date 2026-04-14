const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const Booking = require("./models/booking");
const User = require("./models/user");
const Newsletter = require("./models/Newsletter");
const { authRequired, authAdmin } = require("./middleware/auth");

const app = express();

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5500",
  "https://car-rental-website-ten-gamma.vercel.app",
  "https://car-rental-website-9tcu.vercel.app",
];

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1 with any port in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      // Allow specific production origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../Client")));

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

function signToken(user, roleOverride) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: roleOverride || user.role || "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function parseAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/* -------------------- HEALTH / DEBUG -------------------- */

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    time: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/debug/cookies", (req, res) => {
  res.json({
    allCookies: Object.keys(req.cookies || {}),
    hasToken: !!req.cookies?.token,
    hasAdminToken: !!req.cookies?.adminToken,
    tokenLength: req.cookies?.token?.length || 0,
    adminTokenLength: req.cookies?.adminToken?.length || 0,
  });
});

app.get("/debug/auth", (req, res) => {
  res.json({
    hasTokenCookie: !!req.cookies?.token,
    hasAdminTokenCookie: !!req.cookies?.adminToken,
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- AUTH -------------------- */

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    const token = signToken(user);

    res.cookie("token", token, cookieOptions);

    return res.json({
      success: true,
      message: "Signup successful",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[/auth/signup] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[/auth/login] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("token", clearCookieOptions);
  res.clearCookie("adminToken", clearCookieOptions);

  return res.json({
    success: true,
    message: "Logout successful",
  });
});

app.get("/auth/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("[/auth/me] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

/* -------------------- ADMIN AUTH -------------------- */

app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    let admin = await User.findOne({ email: "admin@carental.com" });

    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: "admin@carental.com",
        password: await bcrypt.hash(password, 10),
        role: "admin",
      });
    }

    const adminToken = signToken(admin, "admin");
    res.cookie("adminToken", adminToken, cookieOptions);

    return res.json({
      success: true,
      message: "Admin login successful",
      user: {
        id: admin._id,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("[/admin-login] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
});

app.post("/admin-logout", (req, res) => {
  res.clearCookie("adminToken", clearCookieOptions);

  return res.json({
    success: true,
    message: "Admin logout successful",
  });
});

app.get("/admin/check-auth", authAdmin, (req, res) => {
  return res.json({
    success: true,
    authenticated: true,
    user: req.user?.email || null,
  });
});

/* -------------------- USER DATA -------------------- */

app.get("/user/addresses", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("addresses");
    return res.json({
      success: true,
      addresses: user?.addresses || [],
    });
  } catch (error) {
    console.error("[/user/addresses GET] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
});

app.post("/user/addresses", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.addresses.push({
      label: req.body.label || "Home",
      fullName: req.body.fullName || "",
      phone: req.body.phone || "",
      line1: req.body.line1 || "",
      line2: req.body.line2 || "",
      city: req.body.city || "",
      state: req.body.state || "",
      postalCode: req.body.postalCode || "",
      country: req.body.country || "India",
      isDefault: !!req.body.isDefault,
    });

    await user.save();

    return res.json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("[/user/addresses POST] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save address",
    });
  }
});

app.get("/user/payment-options", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("savedPayments");
    return res.json({
      success: true,
      savedPayments: user?.savedPayments || [],
    });
  } catch (error) {
    console.error("[/user/payment-options GET] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment options",
    });
  }
});

app.post("/user/payment-options", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.savedPayments.push({
      type: req.body.type || "",
      brand: req.body.brand || "",
      last4: req.body.last4 || "",
      upiIdMasked: req.body.upiIdMasked || "",
      gatewayCustomerId: req.body.gatewayCustomerId || "",
      gatewayTokenId: req.body.gatewayTokenId || "",
      isDefault: !!req.body.isDefault,
    });

    await user.save();

    return res.json({
      success: true,
      savedPayments: user.savedPayments,
    });
  } catch (error) {
    console.error("[/user/payment-options POST] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save payment option",
    });
  }
});

app.get("/user/bookings", authRequired, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("[/user/bookings] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

/* -------------------- DEBUG BOOKINGS -------------------- */

app.get("/debug/all-bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().lean();
    const users = await User.find().select("_id email name role").lean();

    return res.json({
      success: true,
      totalBookings: bookings.length,
      bookings,
      users,
    });
  } catch (error) {
    console.error("[/debug/all-bookings] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching debug info",
    });
  }
});

app.post("/debug/test-booking", authRequired, async (req, res) => {
  try {
    const booking = await Booking.create({
      userId: req.user.userId,
      name: "Test User",
      email: req.user.email,
      phone: "9999999999",
      location: "Test City",
      pickupDate: "2026-04-20",
      returnDate: "2026-04-25",
      days: 5,
      cars: [
        {
          id: "1",
          name: "Test Car",
          price: 1000,
          quantity: 1,
          image: "test.jpg",
        },
      ],
      totalCars: 1,
      amount: 5000,
      bookingStatus: "confirmed",
      paymentId: "test_pay_12345",
      orderId: "test_ord_12345",
      bookingDate: new Date(),
    });

    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("[/debug/test-booking] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating test booking",
    });
  }
});

/* -------------------- NEWSLETTER -------------------- */

app.post("/newsletter/subscribe", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const existing = await Newsletter.findOne({ email: normalizedEmail });
    if (existing) {
      return res.json({
        success: true,
        message: "You are already subscribed",
      });
    }

    await Newsletter.create({
      email: normalizedEmail,
      subscribedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Subscribed successfully",
    });
  } catch (error) {
    console.error("[/newsletter/subscribe] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to subscribe",
    });
  }
});

app.get("/admin/newsletters", authAdmin, async (req, res) => {
  try {
    const newsletters = await Newsletter.find().sort({ subscribedAt: -1 });

    return res.json({
      success: true,
      count: newsletters.length,
      newsletters,
    });
  } catch (error) {
    console.error("[/admin/newsletters] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch newsletters",
    });
  }
});

/* -------------------- PAYMENTS -------------------- */

app.post("/create-order", async (req, res) => {
  try {
    const amount = parseAmount(req.body?.amount);

    console.log(
      "[/create-order] Received amount:",
      req.body?.amount,
      "Parsed:",
      amount,
    );

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid amount: ${amount}`,
      });
    }

    console.log(
      "[/create-order] Creating Razorpay order with amount (paise):",
      Math.round(amount * 100),
    );

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    console.log("[/create-order] Order created:", order.id);

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      order,
    });
  } catch (error) {
    console.error("[/create-order] Error details:", {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      response: error.response?.data || error.response,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create order",
      error: error.code || error.message,
    });
  }
});

app.post("/verify-payment", authRequired, async (req, res) => {
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
        message: "Missing payment data",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const booking = await Booking.create({
      userId: req.user.userId,
      name: userData.name || "",
      email: userData.email || req.user.email || "",
      phone: userData.phone || "",
      location: userData.location || "",
      pickupDate: userData.pickupDate || "",
      returnDate: userData.returnDate || "",
      days: Number(userData.days || 0),
      cars: Array.isArray(userData.cars) ? userData.cars : [],
      totalCars: Number(userData.totalCars || 0),
      amount: parseAmount(userData.amount),
      bookingStatus: "confirmed",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingDate: new Date(),
    });

    return res.json({
      success: true,
      status: "success",
      message: "Payment verified and booking saved",
      booking,
    });
  } catch (error) {
    console.error("[/verify-payment] Error:", error);
    return res.status(500).json({
      success: false,
      status: "error",
      message: "Payment verification failed",
    });
  }
});

/* -------------------- ADMIN BOOKINGS & ANALYTICS -------------------- */

app.get("/admin/bookings", authAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("[/admin/bookings] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

app.get("/analytics/summary", authAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().lean();

    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + Number(booking.amount || 0),
      0,
    );

    const totalBookings = bookings.length;

    const totalCarsRented = bookings.reduce(
      (sum, booking) => sum + Number(booking.totalCars || 0),
      0,
    );

    const avgBookingValue = totalBookings ? totalRevenue / totalBookings : 0;

    return res.json({
      success: true,
      totalRevenue: Math.round(totalRevenue),
      totalBookings,
      totalCarsRented,
      avgBookingValue: Math.round(avgBookingValue),
    });
  } catch (error) {
    console.error("[/analytics/summary] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load summary analytics",
    });
  }
});

app.get("/analytics/monthly-revenue", authAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().lean();
    const monthlyMap = {};

    for (const booking of bookings) {
      const date = new Date(
        booking.bookingDate || booking.createdAt || Date.now(),
      );
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthlyMap[key] = (monthlyMap[key] || 0) + Number(booking.amount || 0);
    }

    const labels = Object.keys(monthlyMap).sort();
    const values = labels.map((label) => Math.round(monthlyMap[label]));

    return res.json({
      success: true,
      labels,
      values,
    });
  } catch (error) {
    console.error("[/analytics/monthly-revenue] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load monthly revenue",
    });
  }
});

app.get("/analytics/top-cars", authAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().lean();
    const carMap = {};

    for (const booking of bookings) {
      for (const car of booking.cars || []) {
        const name = car.name || "Unknown Car";
        const quantity = Number(car.quantity || 1);
        carMap[name] = (carMap[name] || 0) + quantity;
      }
    }

    const sortedCars = Object.entries(carMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return res.json({
      success: true,
      labels: sortedCars.map(([name]) => name),
      values: sortedCars.map(([, count]) => count),
    });
  } catch (error) {
    console.error("[/analytics/top-cars] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load top cars analytics",
    });
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

app.get("/my-bookings.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/my-bookings.html"));
});

app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/admin-login.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Client/admin.html"));
});

/* -------------------- 404 / ERROR -------------------- */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
