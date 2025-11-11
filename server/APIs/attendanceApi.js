const express = require('express');
const router = express.Router();
const Attendance = require('../models/attendanceModel');
const Batch = require('../models/batchModel');

// Helper to normalize date (set time to 00:00:00 for uniqueness)
function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// POST: Submit attendance for a batch (only once per batch per day)
router.post('/attendance/:batchId', async (req, res) => {
  try {
    const batchId = req.params.batchId;
    const { teacher, date, attendance, notes, academy } = req.body;

    const normalizedDate = normalizeDate(date);

    // 1. Verify batch exists and belongs to the academy
    const batch = await Batch.findOne({ _id: batchId, academy: academy });
    if (!batch) return res.status(404).json({ message: 'Batch not found in this academy' });

    // 2. Check teacher is assigned to the batch
    if (!batch.teachers.some(t => t.toString() === teacher)) {
      return res.status(403).json({ message: 'Teacher is not assigned to this batch' });
    }

    // 3. Validate all students in attendance belong to batch
    const batchStudentIds = batch.students.map(s => s.toString());
    const invalidStudents = attendance.filter(a => !batchStudentIds.includes(a.studentId.toString()));

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        message: 'One or more students do not belong to this batch',
        invalidStudentIds: invalidStudents.map(s => s.studentId)
      });
    }

    // 4. Check if attendance for this batch/date already exists (regardless of teacher)
    const existingAttendance = await Attendance.findOne({
      batch: batchId,
      date: normalizedDate,
      academy: academy
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already submitted for this batch today.' });
    }

    // 5. Save attendance with academy reference
    const attendanceRecord = new Attendance({
      batch: batchId,
      teacher,
      date: normalizedDate,
      attendance,
      notes,
      academy: academy
    });

    await attendanceRecord.save();

    res.status(201).json(attendanceRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Fetch attendance record for a batch for a specific date
router.get('/attendance/:batchId/:date', async (req, res) => {
  try {
    const { batchId, date } = req.params;
    const { academy } = req.query;
    
    const normalizedDate = normalizeDate(date);

    const attendanceRecord = await Attendance.findOne({
      batch: batchId,
      date: normalizedDate,
      academy: academy
    })
      .populate('teacher', 'username')
      .populate('attendance.studentId', 'name');

    if (!attendanceRecord) {
      return res.json([]);
    }

    res.json([attendanceRecord]);
  } catch (err) {
    console.error('Attendance GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Get students and their attendance percentage for a batch
router.get('/attendance-percentage/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { academy } = req.query;

    // Fetch all attendance records for the batch in this academy
    const attendanceRecords = await Attendance.find({ 
      batch: batchId,
      academy: academy 
    });

    // Count total sessions (days) attendance was taken for this batch
    const totalSessions = attendanceRecords.length;

    const studentStats = {};

    for (const record of attendanceRecords) {
      for (const entry of record.attendance) {
        const id = entry.studentId.toString();
        if (!studentStats[id]) {
          studentStats[id] = { presentCount: 0 };
        }
        if (entry.present) {
          studentStats[id].presentCount += 1;
        }
      }
    }

    // If no students found, return empty list
    if (Object.keys(studentStats).length === 0) {
      return res.json([]);
    }

    // Fetch student names from the same academy
    const studentIds = Object.keys(studentStats);
    const Student = require('../models/studentModel');
    const students = await Student.find({ 
      _id: { $in: studentIds },
      academy: academy
    });

    const result = students.map((stu) => {
      const stat = studentStats[stu._id.toString()];
      return {
        name: stu.name,
        studentId: stu._id,
        percentage: totalSessions === 0 ? "0%" : ((stat.presentCount / totalSessions) * 100).toFixed(2) + "%"
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error computing attendance percentages:', err);
    res.status(500).json({ message: 'Failed to calculate attendance percentage' });
  }
});

// GET: Get all attendance records for a batch
router.get('/attendance-all/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { academy } = req.query;
    
    const records = await Attendance.find({ 
      batch: batchId,
      academy: academy 
    })
      .populate('attendance.studentId', 'name')
      .sort({ date: 1 });
    
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance history' });
  }
});

module.exports = router;