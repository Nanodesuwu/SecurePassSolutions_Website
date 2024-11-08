const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./src/config/pass-solution-firebase-adminsdk-6045q-2f14efa7cb.json');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the "public" directory

// Firebase Admin Initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pass-solution-default-rtdb.asia-southeast1.firebasedatabase.app"
});

// Routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// New Routes for Google Authenticator
app.post('/generate-totp-secret', async (req, res) => {
  // Replace with your user's ID to retrieve or generate a new TOTP secret
  const userId = req.userId; // Make sure you have user ID here
  
  const secret = speakeasy.generateSecret({
    length: 20,
    name: "SecurePassSolutions", // Change the issuer name here
  });
  
  // Save the secret to your database associated with the user
  await admin.database().ref(`TOTPSecrets/${userId}`).set(secret.base32);

  // Generate QR code URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({ qrCodeUrl, secret: secret.base32 });
});

app.post('/verify-totp', async (req, res) => {
  const { code, secret } = req.body;

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
  });

  res.json({ verified });
});

// Server start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
