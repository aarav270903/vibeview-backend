const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  userId: String,
  username: String,
  caption: String,
  image: String,
  likes: {
  type: Number,
  default: 0
},
likedBy: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", postSchema);