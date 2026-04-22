const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const multer = require("multer");
const auth = require("../middleware/auth");

// upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// ================= CREATE POST =================
router.post("/create", auth, upload.single("image"), async (req, res) => {
  try {
    const { userId, username, caption } = req.body;

    const newPost = new Post({
      userId,
      username,
      caption,
      image: req.file.filename
    });

    await newPost.save();

    res.json({ message: "Post created ✅" });

  } catch (err) {
    res.status(500).json({ message: "Error ❌" });
  }
});

// ================= GET POSTS =================
router.get("/", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

// ================= DELETE POST =================
router.delete("/:id", async (req, res) => {
  const { userId } = req.body;

  const post = await Post.findById(req.params.id);

  if (post.userId !== userId) {
    return res.status(403).json({ message: "Not allowed ❌" });
  }

  await Post.findByIdAndDelete(req.params.id);

  res.json({ message: "Deleted ✅" });
});

router.post("/like/:id", async (req, res) => {
  const { userId } = req.body;

  const post = await Post.findById(req.params.id);

  if (post.likedBy.includes(userId)) {
    post.likes--;
    post.likedBy = post.likedBy.filter(id => id !== userId);
  } else {
    post.likes++;
    post.likedBy.push(userId);
  }

  await post.save();

  res.json(post);
});
module.exports = router;