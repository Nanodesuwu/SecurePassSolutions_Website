import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();
const secretKey = 'your-secret-key'; // Use a secure key in a real-world scenario

document.addEventListener('DOMContentLoaded', () => {
    // Ensure that the user is authenticated
    auth.onAuthStateChanged((user) => {
        if (user) {
            const userId = user.uid;
            const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);

            get(masterPasswordRef).then((snapshot) => {
                const formTitle = document.getElementById('formTitle');
                const submitButton = document.getElementById('submitButton');

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
                            // Redirect to Google Authenticator page after correct master password entry
                            window.location.href = 'google-authenticator.html';
                        } else {
                            alert('Incorrect master password.');
                        }
                    });
                } else {
                    formTitle.textContent = 'Create a Master Password';
                    submitButton.textContent = 'Create';

                    document.getElementById('masterPasswordForm').addEventListener('submit', (event) => {
                        event.preventDefault();
                        const newPassword = document.getElementById('masterPassword').value;

                        if (newPassword) {
                            // Encrypt the new password before saving it to Firebase
                            const encryptedPassword = encryptData(newPassword);

                            set(masterPasswordRef, encryptedPassword).then(() => {
                                alert('Master password set successfully!');
                                // Redirect to Google Authenticator page after master password creation
                                window.location.href = 'google-authenticator.html';
                            }).catch((error) => {
                                alert('Error setting master password: ' + error.message);
                            });
                        } else {
                            alert('Please enter a master password.');
                        }
                    });
                }
            }).catch((error) => {
                alert('Error loading master password: ' + error.message);
            });
        } else {
            window.location.href = 'index.html'; // Redirect if no user is logged in
        }
    });
});

// Function to encrypt data using AES-256
function encryptData(data) {
    const encrypted = CryptoJS.AES.encrypt(data, secretKey).toString();
    return encrypted;
}

// Function to decrypt data using AES-256
function decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData;
}
