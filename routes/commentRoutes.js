const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");

// ADD COMMENT
router.post("/add", async (req, res) => {
  const comment = new Comment(req.body);
  await comment.save();
  res.json(comment);
});

// GET COMMENTS
router.get("/:postId", async (req, res) => {
  const comments = await Comment.find({ postId: req.params.postId });
  res.json(comments);
});

// ADD REPLY
router.post("/reply/:id", async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  comment.replies.push(req.body);
  await comment.save();
  res.json(comment);
});

module.exports = router;