const express = require("express");
const router  = express.Router();
const Post    = require("../models/Post");
const multer  = require("multer");

// ── Upload setup ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ── CREATE POST (no auth header needed — userId from body) ──
router.post("/create", upload.single("image"), async (req, res) => {
  try {
    const { userId, username, caption } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ message: "userId and username required ❌" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image required ❌" });
    }

    const newPost = new Post({
      userId,
      username,
      caption,
      image: req.file.filename
    });

    await newPost.save();
    res.json({ message: "Post created ✅", post: newPost });

  } catch (err) {
    res.status(500).json({ message: "Server error ❌", error: err.message });
  }
});

// ── GET ALL POSTS ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching posts ❌" });
  }
});

// ── LIKE / UNLIKE POST ────────────────────────────────────
router.post("/like/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found ❌" });

    if (post.likedBy.includes(userId)) {
      post.likes--;
      post.likedBy = post.likedBy.filter(id => id !== userId);
    } else {
      post.likes++;
      post.likedBy.push(userId);
    }

    await post.save();
    res.json(post);

  } catch (err) {
    res.status(500).json({ message: "Error ❌", error: err.message });
  }
});

// ── DELETE POST ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found ❌" });

    if (post.userId !== userId) {
      return res.status(403).json({ message: "Not allowed ❌" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted ✅" });

  } catch (err) {
    res.status(500).json({ message: "Error ❌" });
  }
});

module.exports = router;