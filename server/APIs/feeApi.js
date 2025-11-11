const express = require('express');
const router = express.Router();
const Fee = require('../models/feeModel');
const Batch = require('../models/batchModel');
const mongoose = require('mongoose');

// Helper function to check if only allowed fields are being updated
function onlyEditingAmountOrStatus(fields) {
  const allowed = ['amount', 'status', 'paidOn'];
  return Object.keys(fields).every((key) => allowed.includes(key));
}

// Create a new fee record with validations
router.post('/fees', async (req, res) => {
  try {
    const { student, batch, month, academy } = req.body;
    if (!student || !batch || !month || !academy) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!mongoose.Types.ObjectId.isValid(batch)) {
      return res.status(400).json({ message: 'Invalid batch ID format' });
    }

    const batchDoc = await Batch.findOne({ _id: batch, academy: academy });
    if (!batchDoc) {
      return res.status(400).json({ message: 'Invalid batch ID or batch not in academy' });
    }

    const feeMonthDate = new Date(`${month.trim()} 1`);
    if (isNaN(feeMonthDate)) {
      return res.status(400).json({ message: 'Invalid month format' });
    }

    const start = new Date(batchDoc.startDate);
    const end = new Date(batchDoc.endDate);
    if (feeMonthDate < start || feeMonthDate > end) {
      return res.status(400).json({
        message: `Month must be between ${start.toDateString()} and ${end.toDateString()}`,
      });
    }

    const studentIds = batchDoc.students.map((s) => s.toString());
    if (!studentIds.includes(student)) {
      return res.status(400).json({ message: 'Student not in batch' });
    }

    const existing = await Fee.findOne({ student, batch, month, academy });
    if (existing) {
      return res.status(400).json({
        message: 'Fee record already exists for this student, batch, and month',
      });
    }

    const fee = new Fee({ ...req.body, academy });
    await fee.save();
    res.status(201).json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

// Get all fee records for an academy
router.get('/fees', async (req, res) => {
  try {
    const { academy } = req.query;
    if (!academy) {
      return res.status(400).json({ message: 'Academy parameter is required' });
    }

    const fees = await Fee.find({ academy })
      .populate('student', 'name')
      .populate('batch', 'name timeSlot startDate endDate');
    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get distinct months for dropdown
router.get('/fees/months', async (req, res) => {
  try {
    const { academy } = req.query;
    if (!academy) {
      return res.status(400).json({ message: 'Academy parameter is required' });
    }

    const months = await Fee.distinct('month', { academy });
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get fees for a specific student
router.get('/fees/student/:studentId', async (req, res) => {
  try {
    const { academy } = req.query;
    if (!academy) {
      return res.status(400).json({ message: 'Academy parameter is required' });
    }

    const fees = await Fee.find({ 
      student: req.params.studentId,
      academy: academy 
    })
      .populate('batch', 'timeSlot')
      .sort({ paidOn: -1 });

    if (!fees.length) {
      return res.status(404).json({ message: 'No fee records found for this student' });
    }

    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update fee record
router.put('/fees/:id', async (req, res) => {
  try {
    const { academy } = req.body;
    
    // First verify the fee record exists in the specified academy
    const existingFee = await Fee.findOne({ _id: req.params.id, academy });
    if (!existingFee) {
      return res.status(404).json({ message: 'Fee not found in this academy' });
    }

    const updateFields = {};

    // Update amount if present
    if ('amount' in req.body) updateFields.amount = req.body.amount;

    // Update status and paidOn accordingly
    if ('status' in req.body) {
      const status = req.body.status.toLowerCase();
      updateFields.status = status;

      if (status === 'paid') {
        // Use paidOn from request if valid and not future
        if (req.body.paidOn) {
          const paidOnDate = new Date(req.body.paidOn);
          const now = new Date();

          if (isNaN(paidOnDate.getTime())) {
            return res.status(400).json({ message: 'Invalid paidOn date' });
          }
          if (paidOnDate > now) {
            return res.status(400).json({ message: 'paidOn date cannot be in the future' });
          }

          updateFields.paidOn = paidOnDate;
        } else {
          // If no paidOn provided, use current date
          updateFields.paidOn = new Date();
        }
      } else {
        // If status is not paid, clear paidOn
        updateFields.paidOn = null;
      }
    } else if ('paidOn' in req.body) {
      // If status not updated but paidOn provided, validate and update paidOn
      const paidOnDate = new Date(req.body.paidOn);
      const now = new Date();

      if (isNaN(paidOnDate.getTime())) {
        return res.status(400).json({ message: 'Invalid paidOn date' });
      }
      if (paidOnDate > now) {
        return res.status(400).json({ message: 'paidOn date cannot be in the future' });
      }

      updateFields.paidOn = paidOnDate;
    }

    const updated = await Fee.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    if (!updated) return res.status(404).json({ message: 'Fee not found' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a fee record
router.delete('/fees/:id', async (req, res) => {
  try {
    const { academy } = req.query;
    if (!academy) {
      return res.status(400).json({ message: 'Academy parameter is required' });
    }

    const deleted = await Fee.findOneAndDelete({ _id: req.params.id, academy });
    if (!deleted) return res.status(404).json({ message: 'Fee not found in this academy' });
    res.json({ message: 'Fee record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Filter fees by status, batch, month
router.get('/fees/filter', async (req, res) => {
  try {
    const { status, batch, month, academy } = req.query;
    if (!academy) {
      return res.status(400).json({ message: 'Academy parameter is required' });
    }

    const filter = { academy };
    if (status) filter.status = status;
    if (batch) filter.batch = batch;
    if (month) filter.month = month;

    const fees = await Fee.find(filter)
      .populate('student', 'name')
      .populate('batch', 'timeSlot');

    if (!fees.length) {
      return res.status(404).json({ message: 'No matching records found' });
    }

    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;