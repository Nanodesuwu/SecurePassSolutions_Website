const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

module.exports = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  jwt.verify(token, 'your_jwt_secret', async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    try {
      const user = await admin.auth().getUser(decoded.id);
      req.user = user;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
