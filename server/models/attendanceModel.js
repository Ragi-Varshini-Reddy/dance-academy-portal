const mongoose = require('mongoose'); 

const attendanceSchema = new mongoose.Schema({
  date: {type: Date, required: true},
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  attendance: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    present: { type: Boolean, required: true }
  }],
  notes: { type: String, default: '' },
  academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true }
});

// Ensure a teacher can only submit once per batch per date
attendanceSchema.index({ date: 1, batch: 1}, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);