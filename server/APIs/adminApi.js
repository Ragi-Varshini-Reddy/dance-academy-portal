const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/teacherModel');
const Batch = require('../models/batchModel');
const Admin = require('../models/adminModel');

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const adminId = req.headers['x-admin-id'];
    if (!adminId) return res.status(401).json({ message: 'Admin ID required' });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(401).json({ message: 'Invalid admin' });

    if (!admin.academyId) return res.status(400).json({ message: 'Admin has no academy assigned' });

    req.admin = admin;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.use(verifyAdmin);

// CREATE teacher
router.post('/teachers', async (req, res) => {
  try {
    const { name, username, password, assignedBatches } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: "Name, username and password are required" });
    }

    const academyId = req.admin.academyId;

    // Check for existing username in the same academy
    const existing = await Teacher.findOne({ username: username.toLowerCase(), academy: academyId });
    if (existing) return res.status(400).json({ message: "Username already exists in this academy" });

    const teacher = new Teacher({
      name,
      username: username.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      academy: academyId,
      assignedBatches: Array.isArray(assignedBatches) ? assignedBatches : []
    });

    const savedTeacher = await teacher.save();

    // Update batches
    if (Array.isArray(assignedBatches) && assignedBatches.length > 0) {
      await Batch.updateMany(
        { _id: { $in: assignedBatches }, academy: academyId },
        { $addToSet: { teachers: savedTeacher._id } }
      );
    }

    res.status(201).json(savedTeacher);
  } catch (err) {
    console.error("Teacher creation error:", err);
    res.status(500).json({ message: "Teacher creation failed", error: err.message });
  }
});

// UPDATE teacher
router.put('/teachers/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;
    let { name, username, password, assignedBatches } = req.body;

    const teacher = await Teacher.findOne({ _id: teacherId, academy: req.admin.academyId });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Check username uniqueness
    const existing = await Teacher.findOne({
      username: username.toLowerCase(),
      _id: { $ne: teacherId },
      academy: req.admin.academyId
    });
    if (existing) return res.status(400).json({ message: "Username already exists" });

    if (!Array.isArray(assignedBatches)) assignedBatches = assignedBatches ? [assignedBatches] : [];

    const updateData = { name, username: username.toLowerCase(), assignedBatches };
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedTeacher = await Teacher.findByIdAndUpdate(teacherId, updateData, { new: true });

    // Update batches
    const oldBatchIds = teacher.assignedBatches.map(id => id.toString());
    const newBatchIds = assignedBatches.map(id => id.toString());

    const removedBatchIds = oldBatchIds.filter(id => !newBatchIds.includes(id));
    const addedBatchIds = newBatchIds.filter(id => !oldBatchIds.includes(id));

    await Promise.all([
      ...removedBatchIds.map(id => Batch.findByIdAndUpdate(id, { $pull: { teachers: teacherId } })),
      ...addedBatchIds.map(id => Batch.findByIdAndUpdate(id, { $addToSet: { teachers: teacherId } }))
    ]);

    res.json(updatedTeacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE teacher
router.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, academy: req.admin.academyId });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    await Teacher.deleteOne({ _id: teacher._id });
    await Batch.updateMany({ teachers: teacher._id }, { $pull: { teachers: teacher._id } });

    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all teachers for admin's academy
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({ academy: req.admin.academyId }).populate('assignedBatches');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single teacher (with academy check)
router.get('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, academy: req.admin.academyId }).populate('assignedBatches');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET password
router.put("/teachers/reset-password/:id", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const teacher = await Teacher.findOne({ _id: req.params.id, academy: req.admin.academyId });

    if (!teacher) return res.status(404).json({ message: "Teacher not found." });
    if (!oldPassword || !newPassword) return res.status(400).json({ message: "Both passwords are required." });

    const isMatch = await bcrypt.compare(oldPassword, teacher.password);
    if (!isMatch) return res.status(401).json({ message: "Old password is incorrect." });

    teacher.password = await bcrypt.hash(newPassword, 10);
    await teacher.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error while resetting password." });
  }
});

module.exports = router;