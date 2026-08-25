const mongoose = require('mongoose');
const User = require('../models/User');

const getProfile = (req, res) => res.status(200).json({ user: req.user });

const updateProfile = async (req, res, next) => {
  try {
    const forbiddenFields = ['role', 'password', '_id'];
    if (forbiddenFields.some((field) => Object.hasOwn(req.body, field))) {
      return res.status(400).json({ message: 'Only username and email may be updated' });
    }

    const updates = {};
    if (Object.hasOwn(req.body, 'username')) {
      if (typeof req.body.username !== 'string' || !req.body.username.trim()) {
        return res.status(400).json({ message: 'Username cannot be empty' });
      }
      updates.username = req.body.username.trim();
    }
    if (Object.hasOwn(req.body, 'email')) {
      if (typeof req.body.email !== 'string' || !req.body.email.trim()) {
        return res.status(400).json({ message: 'Email cannot be empty' });
      }
      updates.email = req.body.email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide a username or email to update' });
    }

    if (updates.email) {
      const duplicate = await User.exists({ email: updates.email, _id: { $ne: req.user._id } });
      if (duplicate) {
        return res.status(409).json({ message: 'An account with this email already exists' });
      }
    }

    Object.assign(req.user, updates);
    await req.user.save();
    return res.status(200).json({ message: 'Profile updated successfully', user: req.user });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    return next(error);
  }
};

const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
};

const findUserOrRespond = async (userId, res) => {
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400).json({ message: 'Invalid user ID' });
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  return user;
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await findUserOrRespond(req.params.userId, res);
    if (!user) return undefined;

    await user.deleteOne();
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

const changeRole = (role) => async (req, res, next) => {
  try {
    const user = await findUserOrRespond(req.params.userId, res);
    if (!user) return undefined;

    if (user.role === role) {
      return res.status(400).json({ message: `User already has the ${role} role` });
    }

    user.role = role;
    await user.save();
    return res.status(200).json({
      message: role === 'admin' ? 'User promoted successfully' : 'Administrator demoted successfully',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUsers,
  deleteUser,
  promoteUser: changeRole('admin'),
  demoteUser: changeRole('user'),
};
