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
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ================= SEND OTP =================
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required ❌" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    console.log("📩 Sending OTP to:", email);
    console.log("🔑 EMAIL_USER:", process.env.EMAIL_USER);
    console.log("OTP SENT:", otp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
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

    console.log("📦 REGISTER DATA:", req.body);

    // 🔴 OTP CHECK
    if (!otp || String(otpStore[email]) !== String(otp)) {
      console.log("Stored OTP:", otpStore[email]);
      console.log("Entered OTP:", otp);
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    // REMOVE OTP AFTER USE
    delete otpStore[email];

    // 🔴 CHECK EMAIL EXISTS
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already registered ❌"
      });
    }

    // 🔴 CHECK USERNAME EXISTS
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists ❌"
      });
    }

    // 🔴 CREATE USER
    // 🔐 HASH PASSWORD
const hashedPassword = await bcrypt.hash(password, 10);

const newUser = new User({
  name,
  username,
  email,
  phone,
  password: hashedPassword,
  profilePic: "default.png"
});

    await newUser.save();

    res.json({
      message: "User registered successfully 🎉",
      user: newUser
    });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    console.log("📥 LOGIN BODY:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields required ❌" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "User not found ❌" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

if (!isMatch) {
  return res.status(400).json({ message: "Wrong password ❌" });
}

  const token = jwt.sign(
  { id: user._id },
  "secretkey123", // 🔥 later move to .env
  { expiresIn: "7d" }
);

res.json({
  message: "Login successful ✅",
  token,
  user
});

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// ================= UPDATE PROFILE =================
router.put("/update/:username", async (req, res) => {
  try {

    console.log("📥 Received Data:", req.body);
    console.log("👤 Username:", req.params.username);

    // ✅ ONLY ONE existingUser
    const existingUser = await User.findOne({
      username: req.params.username
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ UPDATE + KEEP IMAGE
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      {
        ...req.body,
        profilePic: req.body.profilePic || existingUser.profilePic
      },
      { new: true }
    );

    res.json({ message: "Profile updated", user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

// ================= GET USER DETAILS =================
// GET USER DETAILS
router.get("/profile/:username", async (req, res) => {
  try {

    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= FORGOT PASSWORD - SEND OTP =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email not registered ❌" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    console.log("RESET OTP:", otp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
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


// ================= VERIFY OTP + RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!otp || String(otpStore[email]) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    // 🔐 HASH NEW PASSWORD
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );

    delete otpStore[email];

    res.json({ message: "Password reset successful ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error ❌" });
  }
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email] || String(otpStore[email]) !== String(otp)) {
    return res.status(400).json({ message: "Invalid OTP ❌" });
  }

  res.json({ message: "OTP verified ✅" });
});

module.exports = router;