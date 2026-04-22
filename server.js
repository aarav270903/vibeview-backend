console.log = (...args) => {
  const filtered = args.map(arg => {
    if (typeof arg === "string" && arg.includes("base64")) {
      return "[IMAGE DATA HIDDEN]";
    }
    if (typeof arg === "object") {
      const clone = { ...arg };
      if (clone.profilePic) clone.profilePic = "[IMAGE]";
      return clone;
    }
    return arg;
  });

  process.stdout.write(filtered.join(" ") + "\n");
};

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
// Increased to 10MB — profile pics are base64 encoded (~1-3MB each)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ================= STATIC =================
// (images are stored as base64 in MongoDB — no local uploads folder needed)

// ================= ROUTES =================
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const commentRoutes = require("./routes/commentRoutes");

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);

// ================= PROFILE MODEL =================
const profileSchema = new mongoose.Schema({
  fullname: String,
  phone: String,
  email: String,
  dob: String,
  username: String,
  state: String,
  fav: String,
});

const Profile = mongoose.model("Profile", profileSchema);

// ================= PROFILE ROUTES =================

// SAVE OR UPDATE PROFILE
app.post("/api/profile/save", async (req, res) => {
  try {
    const data = req.body;

    let profile = await Profile.findOne({ email: data.email });

    if (profile) {
      await Profile.updateOne({ email: data.email }, data);
    } else {
      await Profile.create(data);
    }

    res.json({ message: "Profile saved successfully ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET PROFILE BY EMAIL
app.get("/api/profile/:email", async (req, res) => {
  try {
    const profile = await Profile.findOne({ email: req.params.email });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Server is working");
});

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err.message));

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});