const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  photo: String,
  dob: Date,
  parentName: String,
  parentPhone: String,
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  joinDate: { type: Date, default: Date.now },
  feesPaid: [{
    month: String,
    amountPaid: Number,
    paidOn: Date
  }],
  academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true }
});

studentSchema.index({ 
  name: 1, 
  parentName: 1,
  dob: 1, 
  academy: 1 
}, { unique: true });

module.exports = mongoose.model('Student', studentSchema);