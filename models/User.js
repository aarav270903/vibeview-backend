const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  // 🔐 SIGNUP FIELDS
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  // 👤 PROFILE FIELDS
  phone: {
    type: String,
    default: ""
  },

  dob: {
    type: String,
    default: ""
  },

  username: {
    type: String,
    default: ""
  },

  state: {
    type: String,
    default: ""
  },

  favDestination: {
    type: String,
    default: ""
  },

  // 🖼 OPTIONAL (future use)
  profilePic: {
    type: String,
    default: ""
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);