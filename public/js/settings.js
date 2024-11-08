import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();
const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Use a secure key in a real-world scenario

// Open the settings modal
document.getElementById('settingsButton').onclick = function() {
    document.getElementById('customSettingsPopup').style.display = "block";
}

// Close modal when clicking the close button
document.querySelector('.close-btn').onclick = function() {
    document.getElementById('customSettingsPopup').style.display = "none";
}

// Close the modal when clicking outside the modal content
window.onclick = function(event) {
    const modal = document.getElementById('customSettingsPopup');
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Reset password functionality
document.getElementById('resetPasswordForm').onsubmit = async function(event) {
    event.preventDefault();

    const userId = auth.currentUser.uid;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const statusElement = document.getElementById('resetStatus');

    if (newPassword !== confirmPassword) {
        statusElement.textContent = "New passwords do not match!";
        return;
    }

    // Validate the new password
    if (!validatePassword(newPassword)) {
        statusElement.textContent = 'Password must be at least 7 characters, contain one uppercase letter, and one special character.';
        return;
    }

    try {
        const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
        const snapshot = await get(masterPasswordRef);

        if (snapshot.exists()) {
            const savedMasterPassword = decryptData(snapshot.val());
            if (currentPassword === savedMasterPassword) {
                const encryptedNewPassword = encryptData(newPassword);
                await set(masterPasswordRef, encryptedNewPassword);
                statusElement.textContent = "Master password updated successfully!";
                statusElement.classList.add('success');
            } else {
                statusElement.textContent = "Current master password is incorrect.";
            }
        } else {
            statusElement.textContent = "Master password not found.";
        }
    } catch (error) {
        console.error("Error updating master password:", error);
        statusElement.textContent = "An error occurred while updating.";
    }
}

// Function to validate the password
function validatePassword(password) {
    const minLength = 7;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasSpecialChar;
}

// Function to encrypt data
function encryptData(data) {
    const encrypted = CryptoJS.AES.encrypt(data, secretKey).toString();
    return encrypted;
}

// Function to decrypt data
function decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData;
}
