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
const Newsletter = require("./models/Newsletter");
const { authRequired, authAdmin } = require("./middleware/auth");

require("dotenv").config();

const app = express();

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    time: new Date().toISOString(),
    hasDb: mongoose.connection.readyState === 1,
  });
});
// Admin auth check endpoint
app.get("/admin/check-auth", authAdmin, (req, res) => {
  console.log("[/admin/check-auth] ✅ Admin authenticated:", req.user?.email);
  res.json({ success: true, authenticated: true, user: req.user?.email });
});

// Debug endpoint to check cookies and auth without requiring auth
app.get("/debug/cookies", (req, res) => {
  console.log("[/debug/cookies] All cookies:", req.cookies);
  console.log("[/debug/cookies] Has adminToken:", !!req.cookies.adminToken);
  console.log("[/debug/cookies] Has token:", !!req.cookies.token);

  res.json({
    allCookies: Object.keys(req.cookies),
    hasAdminToken: !!req.cookies.adminToken,
    hasToken: !!req.cookies.token,
    adminTokenLength: req.cookies.adminToken
      ? req.cookies.adminToken.length
      : 0,
  });
});

// Debug endpoint to check cookies and auth
app.get("/debug/auth", (req, res) => {
  res.json({
    hasTokenCookie: !!req.cookies.token,
    hasAdminTokenCookie: !!req.cookies.adminToken,
    allCookies: req.cookies,
    timestamp: new Date().toISOString(),
  });
});
app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "https://car-rental-website-ten-gamma.vercel.app",
      "https://car-rental-website-9tcu.vercel.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
    ],
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

function signToken(user, isAdmin = false) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: isAdmin ? "admin" : user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}
// Cookie options - secure only in production
const cookieOptions = {
  httpOnly: true,
  secure: false, // Never use secure on localhost
  sameSite: "strict", // strict is better for same-site cookies
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};
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

    res.cookie("token", token, cookieOptions);

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
    console.log("[/auth/login] Login attempt for email:", email);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log("[/auth/login] User not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[/auth/login] Password mismatch for user:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    console.log(
      "[/auth/login] Login successful, setting token for user:",
      user.email,
    );

    res.cookie("token", token, cookieOptions);

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
    console.error("[/auth/login] Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.post("/auth/logout", (req, res) => {
  console.log("[/auth/logout] Logging out user");
  res.clearCookie("token", { path: "/" });
  res.clearCookie("adminToken", { path: "/" });
  res.json({ success: true, message: "Logout successful" });
});

app.get("/auth/me", authRequired, async (req, res) => {
  try {
    console.log("[/auth/me] User ID from token:", req.user.userId);
    const user = await User.findById(req.user.userId).select("-password");
    console.log("[/auth/me] User found:", user?.email);
    res.json(user);
  } catch (error) {
    console.error("[/auth/me] Fetch user error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/* -------------------- ADMIN AUTH -------------------- */

app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("[/admin-login] Admin login attempt for username:", username);

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      console.log("[/admin-login] Admin credentials valid");
      let admin = await User.findOne({ email: "admin@carental.com" });
      if (!admin) {
        console.log("[/admin-login] Creating new admin user");
        admin = await User.create({
          name: "Admin",
          email: "admin@carental.com",
          password: await bcrypt.hash(password, 10),
          role: "admin",
        });
      }

      const token = jwt.sign(
        {
          userId: admin._id,
          email: admin.email,
          role: "admin",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      console.log("[/admin-login] Setting adminToken for user:", admin.email);
      res.cookie("adminToken", token, cookieOptions);

      console.log("[/admin-login] ✅ Cookie set successfully");
      console.log("[/admin-login] Returning success response");

      return res.json({
        success: true,
        message: "Admin login successful",
        token: token, // Also return token in response for debugging
      });
    }

    console.log("[/admin-login] Invalid admin credentials provided");
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  } catch (error) {
    console.error("[/admin-login] Admin login error:", error);
    res.status(500).json({ message: "Admin login failed" });
  }
});

app.post("/admin-logout", (req, res) => {
  res.clearCookie("adminToken");
  res.json({ success: true });
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
    const userId = req.user.userId;
    console.log("[/user/bookings] Fetching bookings for user:", userId);

    const bookings = await Booking.find({ userId: userId }).sort({
      createdAt: -1,
    });

    console.log("[/user/bookings] Found bookings count:", bookings.length);
    console.log("[/user/bookings] Bookings data:", bookings);

    res.json(bookings);
  } catch (error) {
    console.error("[/user/bookings] Error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Debug endpoint to check all bookings in database
app.get("/debug/all-bookings", async (req, res) => {
  try {
    const allBookings = await Booking.find().lean();
    const users = await User.find().select("_id email name").lean();

    console.log(
      "[/debug/all-bookings] Total bookings in DB:",
      allBookings.length,
    );
    console.log("[/debug/all-bookings] Bookings:", allBookings);
    console.log("[/debug/all-bookings] Users:", users);

    res.json({
      totalBookings: allBookings.length,
      bookings: allBookings,
      users: users,
    });
  } catch (error) {
    console.error("[/debug/all-bookings] Error:", error);
    res.status(500).json({ message: "Error fetching debug info" });
  }
});

// Test endpoint to create a booking manually (for debugging)
app.post("/debug/test-booking", authRequired, async (req, res) => {
  try {
    console.log(
      "[/debug/test-booking] Creating test booking for user:",
      req.user.userId,
    );

    const testBooking = await Booking.create({
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

    console.log(
      "[/debug/test-booking] ✅ Test booking created:",
      testBooking._id,
    );
    res.json({ success: true, booking: testBooking });
  } catch (error) {
    console.error("[/debug/test-booking] ❌ Error:", error);
    res
      .status(500)
      .json({ message: "Error creating test booking: " + error.message });
  }
});

/* -------------------- NEWSLETTER -------------------- */

app.post("/newsletter/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM newsletter_subscribers WHERE email = ?",
      [email],
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: "You are already subscribed",
      });
    }

    await db.query("INSERT INTO newsletter_subscribers (email) VALUES (?)", [
      email,
    ]);

    res.json({
      success: true,
      message: "Subscribed successfully",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe",
    });
  }
});

app.get("/admin/newsletters", authAdmin, async (req, res) => {
  try {
    console.log("Loading newsletters...");
    const newsletters = await Newsletter.find().sort({ subscribedAt: -1 });
    console.log("Found newsletters:", newsletters.length);
    res.json({
      success: true,
      count: newsletters.length,
      newsletters: newsletters,
    });
  } catch (error) {
    console.error("Fetch newsletters error:", error);
    res.status(500).json({ message: "Failed to fetch newsletters" });
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

app.post("/verify-payment", authRequired, async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log(
      "[/verify-payment] ============ PAYMENT VERIFICATION START ============",
    );
    console.log("[/verify-payment] User info:", {
      userId,
      email: req.user?.email,
    });
    console.log("[/verify-payment] Request body keys:", Object.keys(req.body));

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      console.error("[/verify-payment] Missing payment IDs in request");
      return res
        .status(400)
        .json({ status: "failure", message: "Missing payment data" });
    }

    console.log("[/verify-payment] Received payment data:", {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      userData: userData,
    });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const signatureMatch = expectedSignature === razorpay_signature;
    console.log("[/verify-payment] Signature verification:", {
      match: signatureMatch,
    });

    if (!signatureMatch) {
      console.error(
        "[/verify-payment] ❌ Signature mismatch! Payment rejected.",
      );
      return res.status(400).json({ status: "failure" });
    }

    console.log("[/verify-payment] ✅ Signature verified. Creating booking...");
    console.log("[/verify-payment] Booking details:", {
      userId,
      name: userData?.name,
      email: userData?.email,
      amount: userData?.amount,
      cars: userData?.cars?.length,
    });

    const booking = await Booking.create({
      userId: userId,
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

    console.log(
      "[/verify-payment] ✅ BOOKING CREATED:",
      booking._id,
      "for user:",
      userId,
    );
    console.log(
      "[/verify-payment] ============ PAYMENT VERIFICATION END ============",
    );
    res.json({ status: "success" });
  } catch (err) {
    console.error("[/verify-payment] ❌ ERROR:", err.message);
    console.error("[/verify-payment] Full error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* -------------------- ADMIN BOOKINGS & ANALYTICS -------------------- */

app.get("/admin/bookings", authAdmin, async (req, res) => {
  try {
    console.log(
      "[/admin/bookings] ========== LOADING ADMIN BOOKINGS ==========",
    );
    console.log("[/admin/bookings] Admin user:", req.user?.email);

    const data = await Booking.find().sort({ createdAt: -1 }).lean();
    console.log("[/admin/bookings] Found admin bookings:", data.length);

    res.json({
      success: true,
      count: data.length,
      bookings: data,
    });
  } catch (error) {
    console.error("[/admin/bookings] ❌ Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch bookings: " + error.message });
  }
});

app.get("/analytics/summary", authAdmin, async (req, res) => {
  try {
    console.log(
      "[/analytics/summary] ========== LOADING ANALYTICS SUMMARY ==========",
    );
    console.log("[/analytics/summary] Admin user:", req.user?.email);

    const bookings = await Booking.find().lean();
    console.log("[/analytics/summary] Found bookings:", bookings.length);

    if (bookings.length > 0) {
      console.log("[/analytics/summary] Sample booking:", {
        name: bookings[0].name,
        amount: bookings[0].amount,
        totalCars: bookings[0].totalCars,
      });
    }

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

    console.log("[/analytics/summary] ✅ Summary calculated:", {
      totalRevenue,
      totalBookings,
      totalCarsRented,
      avgBookingValue,
    });

    res.json({
      success: true,
      totalRevenue: Math.round(totalRevenue),
      totalBookings,
      totalCarsRented,
      avgBookingValue: Math.round(avgBookingValue),
    });
  } catch (error) {
    console.error("[/analytics/summary] ❌ Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to load summary analytics: " + error.message });
  }
});

app.get("/analytics/monthly-revenue", authAdmin, async (req, res) => {
  try {
    console.log(
      "[/analytics/monthly-revenue] ========== LOADING MONTHLY REVENUE ==========",
    );
    console.log("[/analytics/monthly-revenue] Admin user:", req.user?.email);

    const bookings = await Booking.find().lean();
    console.log(
      "[/analytics/monthly-revenue] Found bookings:",
      bookings.length,
    );

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
    const values = labels.map((label) => Math.round(monthlyMap[label]));

    console.log("[/analytics/monthly-revenue] ✅ Monthly data:", {
      labels,
      values,
    });

    res.json({ success: true, labels, values });
  } catch (error) {
    console.error("[/analytics/monthly-revenue] ❌ Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to load monthly revenue: " + error.message });
  }
});

app.get("/analytics/top-cars", authAdmin, async (req, res) => {
  try {
    console.log("[/analytics/top-cars] ========== LOADING TOP CARS ==========");
    console.log("[/analytics/top-cars] Admin user:", req.user?.email);

    const bookings = await Booking.find().lean();
    console.log("[/analytics/top-cars] Found bookings:", bookings.length);

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

    console.log("[/analytics/top-cars] ✅ Top cars:", sortedCars);

    res.json({
      success: true,
      labels: sortedCars.map(([name]) => name),
      values: sortedCars.map(([, count]) => count),
    });
  } catch (error) {
    console.error("[/analytics/top-cars] ❌ Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to load top cars analytics: " + error.message });
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
