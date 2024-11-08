import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

// AES Encryption and Decryption Functions
const SECRET_KEY = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Should be securely managed

function encrypt(text) {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(encryptedText) {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

const db = getDatabase();
let loginAttempts = 0;
const maxLoginAttempts = 8;

// Function to check for master password
function checkMasterPassword(userId) {
    const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
    return get(masterPasswordRef).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
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
            window.location.href = 'master-password.html?mode=login';
        } else {
            window.location.href = 'master-password.html?mode=create';
        }
    });
}


// Email and password login with attempt limit
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    if (loginAttempts >= maxLoginAttempts) {
        document.getElementById('loginWarning').textContent = "Too many login attempts. Please try again later.";
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            handleLogin(user);
        })
        .catch((error) => {
            loginAttempts++;
            if (loginAttempts >= maxLoginAttempts) {
                document.getElementById('loginForm').querySelector('button[type="submit"]').disabled = true;
                document.getElementById('loginWarning').textContent = "Too many login attempts. Please try again later.";
            } else {
                document.getElementById('loginWarning').textContent = `Error: ${error.message} (Attempt ${loginAttempts} of ${maxLoginAttempts})`;
            }
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
            document.getElementById('loginWarning').textContent = 'Error: ' + error.message;
            console.error('Google Sign-In Error:', error);
        });
});

// Toggle password visibility
document.addEventListener('DOMContentLoaded', function() {
    const masterPasswordField = document.getElementById('masterPassword');
    const togglePasswordButton = document.getElementById('togglePassword');

    if (masterPasswordField && togglePasswordButton) {
        togglePasswordButton.addEventListener('click', function() {
            if (masterPasswordField.type === 'password') {
                masterPasswordField.type = 'text';
                togglePasswordButton.textContent = 'Hide';
            } else {
                masterPasswordField.type = 'password';
                togglePasswordButton.textContent = 'Show';
            }
        });
    }
});
