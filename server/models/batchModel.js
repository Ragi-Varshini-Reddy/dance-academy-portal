const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  timeSlot: String,
  days: [String],
  location: String,
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  fee: { type: Number, required: true, default: 500 },
  academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true }
});

batchSchema.index({ name: 1, academy: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);