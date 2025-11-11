const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Batch = require('../models/batchModel');

// helper: validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get('/my-batches/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }

    const batches = await Batch.find({ teachers: teacherId })
      .populate('students')
      .populate('teachers');

    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;