const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  getPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
} = require('../controllers/photoController');

const router = express.Router();

router.use(authenticate);
router.get('/all', requireAdmin, getPhotos);
router.get('/', getPhotos);
router.post('/', upload.single('image'), createPhoto);
router.put('/:photoId', upload.single('image'), updatePhoto);
router.delete('/:photoId', deletePhoto);

module.exports = router;
