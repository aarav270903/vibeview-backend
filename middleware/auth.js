const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "No token ❌" });
    }

    const decoded = jwt.verify(token, "secretkey123");

    req.userId = decoded.id;

    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token ❌" });
  }
};