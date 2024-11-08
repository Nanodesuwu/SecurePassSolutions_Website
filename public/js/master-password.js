import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();
const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456';
const maxAttempts = 8;
let attemptCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            const userId = user.uid;
            const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);

            get(masterPasswordRef).then((snapshot) => {
                const formTitle = document.getElementById('formTitle');
                const submitButton = document.getElementById('submitButton');
                const warningMessage = document.getElementById('warningMessage'); // Display warning messages

                if (snapshot.exists()) {
                    formTitle.textContent = 'Enter your Master Password';
                    submitButton.textContent = 'Submit';

                    document.getElementById('masterPasswordForm').addEventListener('submit', (event) => {
                        event.preventDefault();
                        const enteredPassword = document.getElementById('masterPassword').value;

                        // Decrypt the saved password from Firebase
                        const encryptedPassword = snapshot.val();
                        const decryptedPassword = decryptData(encryptedPassword);

                        if (enteredPassword === decryptedPassword) {
                            window.location.href = 'google-authenticator.html';
                        } else {
                            attemptCount++;
                            if (attemptCount >= maxAttempts) {
                                submitButton.disabled = true;
                                warningMessage.textContent = 'Too many incorrect attempts. Please try again later.';
                            } else {
                                warningMessage.textContent = `Incorrect master password. Attempt ${attemptCount} of ${maxAttempts}.`;
                            }
                        }
                    });
                } else {
                    formTitle.textContent = 'Create a Master Password';
                    submitButton.textContent = 'Create';

                    document.getElementById('masterPasswordForm').addEventListener('submit', (event) => {
                        event.preventDefault();
                        const newPassword = document.getElementById('masterPassword').value;

                        if (validatePassword(newPassword)) {
                            const encryptedPassword = encryptData(newPassword);
                            set(masterPasswordRef, encryptedPassword).then(() => {
                                alert('Master password set successfully!');
                                window.location.href = 'google-authenticator.html';
                            }).catch((error) => {
                                alert('Error setting master password: ' + error.message);
                            });
                        } else {
                            alert('Your password must be at least 7 characters long, contain at least one uppercase letter, and include at least one special character.');
                        }
                    });
                }
            }).catch((error) => {
                alert('Error loading master password: ' + error.message);
            });
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Function to validate the password
function validatePassword(password) {
    const minLength = 7;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return password.length >= minLength && hasUpperCase && hasSpecialChar;
}

// Function to encrypt data using AES-256
function encryptData(data) {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
}

// Function to decrypt data using AES-256
function decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
}
