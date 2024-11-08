const { db } = require('../../server');

exports.getProfile = async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userDoc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, email } = req.body;
  try {
    const userRef = db.collection('users').doc(req.user.id);
    await userRef.update({
      name: name,
      email: email
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
