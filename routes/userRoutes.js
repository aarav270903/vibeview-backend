const express = require("express");
const router = express.Router();
const User = require("../models/User");

const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ================= OTP STORE =================
const otpStore = {};

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, "uploads/"); },
  filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});

const upload = multer({ storage });

// ================= SEND OTP =================
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required ❌" });

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "VibeView OTP",
      text: `Your OTP is ${otp}`
    });

    res.json({ message: "OTP sent successfully ✅" });

  } catch (err) {
    console.error("❌ MAIL ERROR:", err);
    res.status(500).json({ message: "Error sending OTP ❌" });
  }
});

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, phone, password, otp } = req.body;

    if (!otp || String(otpStore[email]) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    delete otpStore[email];

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already registered ❌" });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username already exists ❌" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name, username, email, phone,
      password: hashedPassword,
      profilePic: ""
    });

    await newUser.save();

    res.json({ message: "User registered successfully 🎉", user: newUser });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ message: "All fields required ❌" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found ❌" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password ❌" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secretkey123", { expiresIn: "7d" });

    res.json({ message: "Login successful ✅", token, user });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// ================= UPDATE PROFILE =================
// ✅ Also saves profilePic (base64) to MongoDB so posts can display it
router.put("/update/:username", async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.params.username });
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    const updateData = { ...req.body };

    // Only fall back to existing pic if the field was NOT sent at all.
    // An explicit "" means "remove the pic" — that should be honoured.
    if (updateData.profilePic === undefined) {
      updateData.profilePic = existingUser.profilePic;
    }

    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      updateData,
      { new: true }
    );

    res.json({ message: "Profile updated ✅", user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

// ================= GET USER PROFILE =================
router.get("/profile/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET USER BY ID =================
// ✅ NEW — used by gallery posts to fetch profile pic by userId
router.get("/by-id/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not registered ❌" });

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password OTP",
      text: `Your password reset OTP is ${otp}`
    });

    res.json({ message: "OTP sent to email ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error ❌" });
  }
});

// ================= VERIFY OTP =================
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!otpStore[email] || String(otpStore[email]) !== String(otp)) {
    return res.status(400).json({ message: "Invalid OTP ❌" });
  }
  res.json({ message: "OTP verified ✅" });
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!otp || String(otpStore[email]) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    delete otpStore[email];

    res.json({ message: "Password reset successful ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error ❌" });
  }
});

module.exports = router;