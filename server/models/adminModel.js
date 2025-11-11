// adminModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  academyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Academy',
    required: true,
    immutable: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 4
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  versionKey: false
});

// Compound indexes to allow same details across different academies
adminSchema.index({ academyId: 1, email: 1 }, { unique: true });
adminSchema.index({ academyId: 1, phone: 1 }, { unique: true });
adminSchema.index({ academyId: 1, username: 1 }, { unique: true });

// Password hashing
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password comparison
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);