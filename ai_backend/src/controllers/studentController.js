// ============================================
// FILE: src/controllers/studentController.js
// ============================================
const StudentProfile = require('../models/StudentProfile');
const { ApiResponse } = require('../utils/apiResponse');

exports.getStudentProfile = async (req, res, next) => {
  try {
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });

    if (!studentProfile) {
      return res.status(404).json(
        ApiResponse.error('Student profile not found')
      );
    }

    res.status(200).json(
      ApiResponse.success({ studentProfile }, 'Student profile retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.createOrUpdateStudentProfile = async (req, res, next) => {
  try {
    const { grade, subjects, school, bio } = req.body;

    const studentProfile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      { grade, subjects, school, bio },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(
      ApiResponse.success({ studentProfile }, 'Student profile updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteStudentProfile = async (req, res, next) => {
  try {
    const studentProfile = await StudentProfile.findOneAndDelete({ user: req.user.id });

    if (!studentProfile) {
      return res.status(404).json(
        ApiResponse.error('Student profile not found')
      );
    }

    res.status(200).json(
      ApiResponse.success(null, 'Student profile deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
