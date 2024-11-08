const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }

        // Reference to the Account collection in the Realtime Database
        const accountRef = admin.database().ref('Account');

        // Generate a unique ID for the new user
        const userId = accountRef.push().key;

        // Store user data in the Account collection
        await accountRef.child(userId).set({
            email: email,
            name: name
        });

        console.log('User data added to Account collection');
        res.status(201).json({ message: 'User data added to Account collection' });
    } catch (error) {
        console.error('Error accessing Account collection:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
