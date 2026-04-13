const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  try {
    const token = req.cookies.token;
    console.log(
      "[authRequired] Checking token, received:",
      token ? "yes" : "no",
    );

    if (!token) {
      console.log("[authRequired] No token found, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[authRequired] Token verified for user:", decoded.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("[authRequired] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authAdmin(req, res, next) {
  try {
    const token = req.cookies.adminToken;
    console.log(
      "[authAdmin] Checking adminToken, received:",
      token ? "yes" : "no",
    );

    if (!token) {
      console.log("[authAdmin] No adminToken found, returning 401");
      return res.status(401).json({ message: "Admin unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[authAdmin] Token verified for admin:", decoded.email);

    if (decoded.role !== "admin") {
      console.log("[authAdmin] User role is not admin:", decoded.role);
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.log("[authAdmin] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
}

module.exports = { authRequired, authAdmin };
