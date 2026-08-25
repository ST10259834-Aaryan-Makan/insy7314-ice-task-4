const { v2: cloudinary } = require('cloudinary');
const stream = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const streamUpload = (buffer) =>
  new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'securephoto' },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error || new Error('Cloudinary upload failed'));
        }
      }
    );

    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });

const deleteFromCloudinary = async (publicId) =>
  cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

module.exports = { streamUpload, deleteFromCloudinary };
