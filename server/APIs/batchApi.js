const express = require('express');
const router = express.Router();
const Batch = require('../models/batchModel');
const Fee = require('../models/feeModel');
const Teacher = require('../models/teacherModel');
const Student = require('../models/studentModel');
const Admin = require('../models/adminModel');

// Middleware to verify admin (same as other APIs)
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

// Helper to generate months between start and end date
function getMonthYearRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = [];
  while (start <= end) {
    months.push(`${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`);
    start.setMonth(start.getMonth() + 1);
  }
  return months;
}

// Create Batch + Fee
router.post('/batches', async (req, res) => {
  try {
    const academyId = req.admin.academyId;

    // Check for existing batch with the same name in the same academy
    const existing = await Batch.findOne({ 
      name: req.body.name.trim(),
      academy: academyId 
    });
    if (existing) {
      return res.status(409).json({ error: 'Batch with this name already exists in your academy' });
    }

    const batch = new Batch({
      ...req.body,
      name: req.body.name.trim(),
      academy: academyId
    });
    await batch.save();

    // Update teachers and students with academy check
    await Promise.all(batch.teachers.map(tid =>
      Teacher.findOneAndUpdate(
        { _id: tid, academy: academyId },
        { $addToSet: { assignedBatches: batch._id } }
      )
    ));
    
    await Promise.all(batch.students.map(sid =>
      Student.findOneAndUpdate(
        { _id: sid, academy: academyId },
        { $addToSet: { batches: batch._id } }
      )
    ));

    const months = getMonthYearRange(batch.startDate, batch.endDate);
    const feeRecords = batch.students.flatMap(studentId =>
      months.map(month => ({
        student: studentId,
        batch: batch._id,
        month,
        amount: batch.fee,
        status: 'pending',
        academy: academyId
      }))
    );
    await Fee.insertMany(feeRecords);

    res.status(201).json(batch);
  } catch (err) {
    console.error("Batch creation error:", err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: 'Batch with this name already exists in your academy' 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Update Batch + Fee
router.put('/batches/:id', async (req, res) => {
  try {
    const batchId = req.params.id;
    const academyId = req.admin.academyId;
    const { teachers = [], students = [], name } = req.body;

    // Check if batch exists in this academy
    const oldBatch = await Batch.findOne({ 
      _id: batchId, 
      academy: academyId 
    });
    if (!oldBatch) return res.status(404).json({ message: 'Batch not found' });

    // Check for duplicate name in other batches of the same academy
    const duplicate = await Batch.findOne({ 
      name: name.trim(), 
      academy: academyId,
      _id: { $ne: batchId } 
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Another batch with this name already exists in your academy' });
    }

    const updatedBatch = await Batch.findByIdAndUpdate(batchId, {
      ...req.body,
      name: name.trim()
    }, { new: true });

    const removedStudents = oldBatch.students.filter(id => !students.includes(id.toString()));
    const addedStudents = students.filter(id => !oldBatch.students.map(s => s.toString()).includes(id));

    const months = getMonthYearRange(updatedBatch.startDate, updatedBatch.endDate);

    // Check if fee or dates changed
    const feeChanged = oldBatch.fee !== req.body.fee;
    const dateChanged = oldBatch.startDate.toISOString() !== new Date(req.body.startDate).toISOString() ||
                        oldBatch.endDate.toISOString() !== new Date(req.body.endDate).toISOString();

    if (feeChanged || dateChanged) {
      // Delete all fee records for this batch
      await Fee.deleteMany({ batch: batchId });

      // Recreate fee records for all students in updated list
      const allStudentIds = students;
      const allFees = allStudentIds.flatMap(sid =>
        months.map(month => ({
          student: sid,
          batch: batchId,
          month,
          amount: req.body.fee,
          status: 'pending',
          academy: academyId
        }))
      );
      await Fee.insertMany(allFees);
    } else {
      // Handle only added/removed students
      await Fee.deleteMany({ batch: batchId, student: { $in: removedStudents } });

      const newFees = addedStudents.flatMap(sid =>
        months.map(month => ({
          student: sid,
          batch: batchId,
          month,
          amount: updatedBatch.fee,
          status: 'pending',
          academy: academyId
        }))
      );
      await Fee.insertMany(newFees);
    }

    // Update teacher assignments with academy check
    await Teacher.updateMany(
      { academy: academyId }, 
      { $pull: { assignedBatches: batchId } }
    );
    await Teacher.updateMany(
      { _id: { $in: teachers }, academy: academyId },
      { $addToSet: { assignedBatches: batchId } }
    );

    // Update student assignments with academy check
    await Student.updateMany(
      { academy: academyId },
      { $pull: { batches: batchId } }
    );
    await Student.updateMany(
      { _id: { $in: students }, academy: academyId },
      { $addToSet: { batches: batchId } }
    );

    res.json(updatedBatch);
  } catch (err) {
    console.error("Update error:", err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: 'Another batch with this name already exists in your academy' 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Delete Batch + Fees
router.delete('/batches/:id', async (req, res) => {
  try {
    const academyId = req.admin.academyId;
    
    const batch = await Batch.findOneAndDelete({ 
      _id: req.params.id, 
      academy: academyId 
    });
    
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    await Teacher.updateMany(
      { _id: { $in: batch.teachers }, academy: academyId },
      { $pull: { assignedBatches: batch._id.toString() } }
    );
    
    await Student.updateMany(
      { _id: { $in: batch.students }, academy: academyId },
      { $pull: { batches: batch._id } }
    );
    
    await Fee.deleteMany({ batch: batch._id });

    res.json({ message: 'Batch and related fee records deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all batches for admin's academy
router.get('/batches', async (req, res) => {
  try {
    const batches = await Batch.find({ academy: req.admin.academyId })
      .populate('teachers')
      .populate('students');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single batch
router.get("/batches/:id", async (req, res) => {
  try {
    const batch = await Batch.findOne({
      _id: req.params.id,
      academy: req.admin.academyId
    }).populate("students");
    
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// One-time fee generation for existing batches and students (academy-scoped)
router.get('/generate-missing-fees', async (req, res) => {
  try {
    const academyId = req.admin.academyId;
    const batches = await Batch.find({ academy: academyId }).populate('students');
    const allOps = [];

    for (const batch of batches) {
      const months = getMonthYearRange(batch.startDate, batch.endDate);
      for (const student of batch.students) {
        for (const month of months) {
          const exists = await Fee.exists({ student: student._id, batch: batch._id, month });
          if (!exists) {
            allOps.push({
              student: student._id,
              batch: batch._id,
              month,
              amount: batch.fee,
              status: 'pending',
              academy: academyId
            });
          }
        }
      }
    }

    if (allOps.length > 0) {
      await Fee.insertMany(allOps);
    }

    res.json({ message: `${allOps.length} missing fee records created.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;