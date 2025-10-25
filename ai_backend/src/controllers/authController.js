
// ============================================
// FILE: src/controllers/authController.js
// ============================================
const User = require('../models/User');
const jwtConfig = require('../config/jwt');
const { ApiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, username } = req.body;

    // Use username as name if name is not provided, but only if name is not required
    const userName = name || username;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(
        ApiResponse.error('User with this email already exists')
      );
    }

    // Check username uniqueness if provided
    if (username && username.trim() !== '') {
      const existingUsername = await User.findOne({ username: username.trim() });
      if (existingUsername) {
        return res.status(400).json(
          ApiResponse.error('Username already exists')
        );
      }
    }

    // Create user
    const userData = { name: userName, email, password, role: req.body.role || 'user' };
    if (username && username.trim() !== '') {
      userData.username = username;
    }
    const user = await User.create(userData);

    // Generate token
    const token = jwtConfig.generateToken({ id: user._id, role: user.role });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json(
      ApiResponse.success({ user, token }, 'User registered successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json(
        ApiResponse.error('Invalid credentials')
      );
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json(
        ApiResponse.error('Invalid credentials')
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json(
        ApiResponse.error('Account is deactivated')
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwtConfig.generateToken({ id: user._id, role: user.role });

    // Remove password from response
    user.password = undefined;

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json(
      ApiResponse.success({ user, token }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json(
        ApiResponse.error('User not found')
      );
    }

    res.status(200).json(
      ApiResponse.success({ user }, 'User retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json(
        ApiResponse.error('Current password is incorrect')
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    res.status(200).json(
      ApiResponse.success(null, 'Password updated successfully')
    );
  } catch (error) {
    next(error);
  }
};