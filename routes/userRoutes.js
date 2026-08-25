const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const {
  getProfile,
  updateProfile,
  getUsers,
  deleteUser,
  promoteUser,
  demoteUser,
} = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);
router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/', requireAdmin, getUsers);
router.delete('/:userId', requireAdmin, deleteUser);
router.put('/:userId/promote', requireAdmin, promoteUser);
router.put('/:userId/demote', requireAdmin, demoteUser);

module.exports = router;
