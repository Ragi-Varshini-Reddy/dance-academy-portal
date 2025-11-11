// academyModel.js
const mongoose = require('mongoose');

const academySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    unique: true
  },
  email: { 
    type: String, 
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: { 
    type: String, 
    required: true,
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  }
}, {
  versionKey: false
});

module.exports = mongoose.model('Academy', academySchema);