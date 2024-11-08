const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); 
// Example route to get user details
router.get('/details', authMiddleware, (req, res) => {
  res.json(req.user);
});

// Example route to update user information
router.put('/update', authMiddleware, (req, res) => {
  res.send('User details updated');
});

module.exports = router;
