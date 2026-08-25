const mongoose = require('mongoose');
const Photo = require('../models/Photo');
const { streamUpload, deleteFromCloudinary } = require('../util/cloudinary');

const ownerFields = '_id username email';

const getPhotos = async (_req, res, next) => {
  try {
    const photos = await Photo.find().populate('owner', ownerFields).sort({ createdAt: -1 });
    return res.status(200).json({ photos });
  } catch (error) {
    return next(error);
  }
};

const createPhoto = async (req, res, next) => {
  let uploadedPublicId;
  let databaseSaved = false;
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'An image is required' });
    }

    const uploadResult = await streamUpload(req.file.buffer);
    uploadedPublicId = uploadResult.public_id;
    const photo = await Photo.create({
      title,
      description,
      imageUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      owner: req.user._id,
    });
    databaseSaved = true;
    await photo.populate('owner', ownerFields);

    return res.status(201).json({ message: 'Photo uploaded successfully', photo });
  } catch (error) {
    if (uploadedPublicId && !databaseSaved) {
      try {
        await deleteFromCloudinary(uploadedPublicId);
      } catch (_cleanupError) {
        console.error('Failed to clean up a Cloudinary upload after a database error');
      }
    }
    return next(error);
  }
};

const findPhotoOrRespond = async (photoId, res) => {
  if (!mongoose.isValidObjectId(photoId)) {
    res.status(400).json({ message: 'Invalid photo ID' });
    return null;
  }

  const photo = await Photo.findById(photoId);
  if (!photo) {
    res.status(404).json({ message: 'Photo not found' });
    return null;
  }
  return photo;
};

const canModify = (photo, user) =>
  user.role === 'admin' || photo.owner.toString() === user._id.toString();

const updatePhoto = async (req, res, next) => {
  let newPublicId;
  try {
    const photo = await findPhotoOrRespond(req.params.photoId, res);
    if (!photo) return undefined;
    if (!canModify(photo, req.user)) {
      return res.status(403).json({ message: 'You may only update your own photos' });
    }

    const hasTitle = Object.hasOwn(req.body, 'title');
    const hasDescription = Object.hasOwn(req.body, 'description');
    if (!hasTitle && !hasDescription && !req.file) {
      return res.status(400).json({ message: 'Provide a title, description or image to update' });
    }
    if (hasTitle && (typeof req.body.title !== 'string' || !req.body.title.trim())) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
    if (hasDescription && typeof req.body.description !== 'string') {
      return res.status(400).json({ message: 'Description must be text' });
    }

    const oldPublicId = photo.cloudinaryPublicId;
    if (req.file) {
      const uploadResult = await streamUpload(req.file.buffer);
      newPublicId = uploadResult.public_id;
      photo.imageUrl = uploadResult.secure_url;
      photo.cloudinaryPublicId = uploadResult.public_id;
    }
    if (hasTitle) photo.title = req.body.title.trim();
    if (hasDescription) photo.description = req.body.description.trim();

    try {
      await photo.save();
    } catch (error) {
      if (newPublicId) await deleteFromCloudinary(newPublicId);
      throw error;
    }

    if (newPublicId) {
      try {
        await deleteFromCloudinary(oldPublicId);
      } catch (_error) {
        console.error('Photo updated, but the previous Cloudinary asset could not be removed');
      }
    }

    await photo.populate('owner', ownerFields);
    return res.status(200).json({ message: 'Photo updated successfully', photo });
  } catch (error) {
    return next(error);
  }
};

const deletePhoto = async (req, res, next) => {
  try {
    const photo = await findPhotoOrRespond(req.params.photoId, res);
    if (!photo) return undefined;
    if (!canModify(photo, req.user)) {
      return res.status(403).json({ message: 'You may only delete your own photos' });
    }

    await deleteFromCloudinary(photo.cloudinaryPublicId);
    await photo.deleteOne();
    return res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPhotos, createPhoto, updatePhoto, deletePhoto };
