const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/adminModel');
const Teacher = require('../models/teacherModel'); 
const Academy = require('../models/academyModel');

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { academyName, adminName, email, phone, username, password } = req.body;

    // 1. Validate all required fields
    const requiredFields = ['academyName', 'adminName', 'email', 'phone', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields 
      });
    }

    // 2. Check for existing academy (case-insensitive)
    const existingAcademy = await Academy.findOne({ 
      name: { $regex: new RegExp(`^${academyName}$`, 'i') } 
    });
    
    if (existingAcademy) {
      return res.status(409).json({ 
        success: false,
        error: 'Academy with this name already exists',
        conflict: 'academyName'
      });
    }

    // 3. Create new academy
    const newAcademy = await Academy.create({
      name: academyName,
      email,
      phone
    });

    // 4. Create admin for this academy
    const newAdmin = await Admin.create({
      academyId: newAcademy._id,
      name: adminName,
      email,
      phone,
      username,
      password
    });

    // 5. Success response
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      academyId: newAcademy._id,
      adminId: newAdmin._id
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: err.message
    });
  }
});


// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { academyName, username, password } = req.body;

    if (!academyName || !username || !password) {
      return res.status(400).json({ error: 'Academy name, username, and password are required' });
    }

    // Find academy (case-insensitive)
    const academy = await Academy.findOne({
      name: { $regex: new RegExp(`^${academyName}$`, 'i') }
    });
    if (!academy) return res.status(404).json({ error: 'Academy not found' });

    // Check if user is admin
    const admin = await Admin.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      academyId: academy._id
    }).select('+password');

    // Check if user is teacher (assuming you have a Teacher model)
    const teacher = await Teacher.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      academy: academy._id
    }).select('+password');

    if (!admin && !teacher) return res.status(401).json({ error: 'Invalid credentials' });

    // Handle admin login
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const { password: _, ...adminData } = admin.toObject();
      return res.json({ 
        success: true, 
        role: 'admin',
        admin: adminData, 
        academy 
      });
    }

    // Handle teacher login
    if (teacher) {
      const isMatch = await bcrypt.compare(password, teacher.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const { password: _, ...teacherData } = teacher.toObject();
      return res.json({ 
        success: true, 
        role: 'teacher',
        teacher: teacherData, 
        academy 
      });
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

module.exports = router;