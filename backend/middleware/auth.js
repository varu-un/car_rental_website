const jwt = require("jsonwebtoken");

function readCookieToken(req, name) {
  return req.cookies?.[name] || null;
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function authRequired(req, res, next) {
  try {
    const token = readCookieToken(req, "token");

    console.log("[authRequired] User token present:", !!token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || "user",
    };

    return next();
  } catch (error) {
    console.error("[authRequired] Verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

function authAdmin(req, res, next) {
  try {
    const token = readCookieToken(req, "adminToken");

    console.log("[authAdmin] Admin token present:", !!token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin unauthorized",
      });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    console.error("[authAdmin] Verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token",
    });
  }
}

module.exports = { authRequired, authAdmin };
