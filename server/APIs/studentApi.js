const express = require('express');
const router = express.Router();
const Student = require('../models/studentModel');
const Batch = require('../models/batchModel');
const Admin = require('../models/adminModel');
const Fee = require('../models/feeModel'); 

// Middleware to verify admin (same as teacher API)
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

// Helper function to generate months between start and end date
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

// Helper function to create fee records for a student
async function createFeeRecordsForStudent(studentId, batchIds, academyId) {
  try {
    // Get all batches with fee information
    const batches = await Batch.find({ 
      _id: { $in: batchIds }, 
      academy: academyId 
    });
    
    const feeRecords = [];
    
    for (const batch of batches) {
      if (batch.fee && batch.startDate && batch.endDate) {
        const months = getMonthYearRange(batch.startDate, batch.endDate);
        
        for (const month of months) {
          // Check if fee record already exists
          const existingFee = await Fee.findOne({
            student: studentId,
            batch: batch._id,
            month: month,
            academy: academyId
          });
          
          if (!existingFee) {
            feeRecords.push({
              student: studentId,
              batch: batch._id,
              month: month,
              amount: batch.fee,
              status: 'pending',
              academy: academyId
            });
          }
        }
      }
    }
    
    if (feeRecords.length > 0) {
      await Fee.insertMany(feeRecords);
    }
    
    return feeRecords.length;
  } catch (error) {
    console.error('Error creating fee records:', error);
    return 0;
  }
}

// Helper function to update fee records when batches change
async function updateFeeRecordsForStudent(studentId, oldBatches, newBatches, academyId) {
  try {
    // Find batches that were removed
    const batchesToRemove = oldBatches.filter(id => !newBatches.includes(id.toString()));
    
    // Delete fee records for removed batches
    if (batchesToRemove.length > 0) {
      await Fee.deleteMany({
        student: studentId,
        batch: { $in: batchesToRemove },
        academy: academyId
      });
    }
    
    // Find batches that were added
    const batchesToAdd = newBatches.filter(id => !oldBatches.map(b => b.toString()).includes(id.toString()));
    
    // Create fee records for added batches
    if (batchesToAdd.length > 0) {
      await createFeeRecordsForStudent(studentId, batchesToAdd, academyId);
    }
    
    return { removed: batchesToRemove.length, added: batchesToAdd.length };
  } catch (error) {
    console.error('Error updating fee records:', error);
    return { removed: 0, added: 0 };
  }
}

// CREATE student
router.post('/students', async (req, res) => {
  try {
    const { name, photo, dob, parentName, parentPhone, batches, joinDate } = req.body;

    if (!name || !parentName || !parentPhone) {
      return res.status(400).json({ message: "Name, parent name and parent phone are required" });
    }

    const academyId = req.admin.academyId;

    // Check for duplicate student in the same academy
    const existingStudent = await Student.findOne({
      name: name.trim(),
      parentName: parentName.trim(),
      dob: dob ? new Date(dob) : null,
      academy: academyId
    });

    if (existingStudent) {
      return res.status(409).json({ 
        message: "Student already exists with the same details in this academy" 
      });
    }

    const student = new Student({
      name: name.trim(),
      photo,
      dob: dob ? new Date(dob) : null,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      batches: Array.isArray(batches) ? batches : [],
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      academy: academyId
    });

    const savedStudent = await student.save();

    // Update batches only if batches are provided
    if (Array.isArray(batches) && batches.length > 0) {
      await Batch.updateMany(
        { 
          _id: { $in: batches }, 
          academy: academyId 
        },
        { $addToSet: { students: savedStudent._id } }
      );
      
      // Create fee records for the student
      const feeRecordsCreated = await createFeeRecordsForStudent(savedStudent._id, batches, academyId);
    }

    res.status(201).json(savedStudent);
  } catch (err) {
    console.error("Student creation error:", err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ 
        message: "Student already exists with the same details in this academy" 
      });
    }
    
    res.status(500).json({ message: "Student creation failed", error: err.message });
  }
});

// GET all students for admin's academy
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find({ academy: req.admin.academyId })
      .populate('batches');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one student (with academy check)
router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ 
      _id: req.params.id, 
      academy: req.admin.academyId 
    }).populate('batches');
    
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE student
router.put('/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const academyId = req.admin.academyId;
    const { name, parentName, parentPhone, dob } = req.body;

    // Check if student exists in this academy
    const oldStudent = await Student.findOne({ 
      _id: studentId, 
      academy: academyId 
    });

    if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

    // Check for duplicate student (excluding current student)
    const existingStudent = await Student.findOne({
      name: name.trim(),
      parentName: parentName.trim(),
      dob: dob ? new Date(dob) : null,
      academy: academyId,
      _id: { $ne: studentId } // Exclude current student
    });

    if (existingStudent) {
      return res.status(409).json({ 
        message: "Another student already exists with the same details in this academy" 
      });
    }

    const oldBatches = oldStudent.batches.map(id => id.toString());
    const newBatches = req.body.batches ? req.body.batches.map(id => id.toString()) : [];

    const updateData = { 
      ...req.body,
      name: name.trim(),
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      dob: dob ? new Date(dob) : null
    };
    
    const updatedStudent = await Student.findByIdAndUpdate(studentId, updateData, { new: true });

    // Update batches with academy check
    const batchesToRemove = oldBatches.filter(id => !newBatches.includes(id));
    const batchesToAdd = newBatches.filter(id => !oldBatches.includes(id));

    await Promise.all([
      // Remove from old batches (only if they belong to this academy)
      ...batchesToRemove.map(id => 
        Batch.findOneAndUpdate(
          { _id: id, academy: academyId },
          { $pull: { students: studentId } }
        )
      ),
      // Add to new batches (only if they belong to this academy)
      ...batchesToAdd.map(id => 
        Batch.findOneAndUpdate(
          { _id: id, academy: academyId },
          { $addToSet: { students: studentId } }
        )
      )
    ]);

    // Update fee records based on batch changes
    if (batchesToRemove.length > 0 || batchesToAdd.length > 0) {
      const feeUpdateResult = await updateFeeRecordsForStudent(
        studentId, 
        oldBatches, 
        newBatches, 
        academyId
      );
    }

    res.json(updatedStudent);
  } catch (err) {
    console.error("Update error:", err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ 
        message: "Another student already exists with the same details in this academy" 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// DELETE student
router.delete('/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const academyId = req.admin.academyId;

    // Check if student exists in this academy
    const student = await Student.findOne({ 
      _id: studentId, 
      academy: academyId 
    });

    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Remove student from batches (only academy batches)
    if (student.batches && student.batches.length > 0) {
      await Batch.updateMany(
        { 
          _id: { $in: student.batches }, 
          academy: academyId 
        },
        { $pull: { students: studentId } }
      );
    }

    // Delete all fee records for the student
    await Fee.deleteMany({
      student: studentId,
      academy: academyId
    });

    await Student.findByIdAndDelete(studentId);

    res.json({ message: 'Student and associated fee records deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;