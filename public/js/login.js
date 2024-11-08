import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

// AES Encryption and Decryption Functions
const SECRET_KEY = 'ThisIsASecretKeyForAES256'; // Should be securely managed

function encrypt(text) {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(encryptedText) {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

const db = getDatabase();

// Function to check for master password
function checkMasterPassword(userId) {
    const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
    return get(masterPasswordRef).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val(); // Return the master password if it exists
        } else {
            return null; // No master password set
        }
    });
}

// Function to set master password
function setMasterPassword(userId, password) {
    const encryptedPassword = encrypt(password);
    const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
    return set(masterPasswordRef, encryptedPassword);
}

// After user logs in
function handleLogin(user) {
    checkMasterPassword(user.uid).then((encryptedMasterPassword) => {
        if (encryptedMasterPassword) {
            // Redirect to master-password.html to enter existing master password
            window.location.href = 'master-password.html?mode=login';
        } else {
            // Redirect to master-password.html to create a new master password
            window.location.href = 'master-password.html?mode=create';
        }
    });
}

// Email and password login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            handleLogin(user);
        })
        .catch((error) => {
            alert('Error: ' + error.message);
        });
});

// Google login
document.getElementById('googleLogin').addEventListener('click', function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            handleLogin(user);
        })
        .catch((error) => {
            alert('Error: ' + error.message);
            console.error('Google Sign-In Error:', error);  // Log the error for debugging
        });
});

// Toggle password visibility
document.addEventListener('DOMContentLoaded', function() {
    const masterPasswordField = document.getElementById('masterPassword');
    const togglePasswordButton = document.getElementById('togglePassword');

    if (masterPasswordField && togglePasswordButton) {
        togglePasswordButton.addEventListener('click', function() {
            // Toggle the password field type
            if (masterPasswordField.type === 'password') {
                masterPasswordField.type = 'text';
                togglePasswordButton.textContent = 'Hide'; // Change button text to 'Hide'
            } else {
                masterPasswordField.type = 'password';
                togglePasswordButton.textContent = 'Show'; // Change button text to 'Show'
            }
        });
    }
});
