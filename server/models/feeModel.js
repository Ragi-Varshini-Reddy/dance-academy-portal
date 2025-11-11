const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  amount: Number,
  month: String, // e.g. "June 2025"
  paidOn: Date,
  mode: { type: String, enum: ['cash', 'UPI', 'card', 'other'], default: 'cash' },
  status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
  remarks: String,
  academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true }
});

module.exports = mongoose.model('Fee', feeSchema);