const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, required: true },
  password: { type: String },
  phone: { type: String, unique: true, sparse: true }, // for phone login
  assignedBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true }
});
teacherSchema.index({ username: 1, academy: 1 }, { unique: true });
module.exports = mongoose.model('Teacher', teacherSchema);