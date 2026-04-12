const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authAdmin(req, res, next) {
  try {
    const token = req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({ message: "Admin unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
}

module.exports = { authRequired, authAdmin };
