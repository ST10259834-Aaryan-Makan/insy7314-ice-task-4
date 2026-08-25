const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        delete returnedObject.password;
        return returnedObject;
      },
    },
    toObject: {
      transform: (_document, returnedObject) => {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
