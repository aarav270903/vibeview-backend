const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  postId: String,
  userId: String,
  username: String,
  text: String,
  replies: [
    {
      userId: String,
      username: String,
      text: String
    }
  ]
});

module.exports = mongoose.model("Comment", commentSchema);