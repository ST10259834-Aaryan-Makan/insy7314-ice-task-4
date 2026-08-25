const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authorization = req.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token is required' });
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'Authentication token is invalid' });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Authentication token is invalid or expired' });
  }
};

module.exports = authenticate;
