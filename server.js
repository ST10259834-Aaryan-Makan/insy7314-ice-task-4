require('dotenv').config({ quiet: true });

const express = require('express');
const multer = require('multer');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const photoRoutes = require('./routes/photoRoutes');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Photostore API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/photos', photoRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 5 MB or smaller' });
    }
    return res.status(400).json({ message: 'Only a valid image file is accepted in the image field' });
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body contains invalid JSON' });
  }

  if (error && error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Submitted data is invalid' });
  }

  const safeName =
    typeof error?.name === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)
      ? error.name
      : 'Error';
  const safeCode =
    typeof error?.code === 'number' ||
    (typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code))
      ? error.code
      : 'UNKNOWN';
  console.error('An unexpected server error occurred', { name: safeName, code: safeCode });
  return res.status(500).json({ message: 'Internal server error' });
});

const validateEnvironment = () => {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const startServer = async () => {
  validateEnvironment();
  await connectDB();
  const port = process.env.PORT || 5000;
  return app.listen(port, () => console.log(`Server listening on port ${port}`));
};

if (require.main === module) {
  startServer().catch(() => {
    console.error('Server startup failed');
    process.exit(1);
  });
}

module.exports = { app, startServer };
