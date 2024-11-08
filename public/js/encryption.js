import { auth, database } from '../firebase-config.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

document.getElementById('encryption-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the form from submitting normally
    const plaintext = document.getElementById('plaintext').value;

    try {
        // Encrypt the data
        const encryptedData = encrypt(plaintext, 'ThisIsASecretKey');
        document.getElementById('encrypted-data').innerText = 'Encrypted Data: ' + encryptedData;

        // Save the encrypted data to Firebase
        await saveDataToFirebase(encryptedData);
        
        // Decrypt the data
        const decryptedData = decrypt(encryptedData, 'ThisIsASecretKey');
        document.getElementById('decrypted-data').innerText = 'Decrypted Data: ' + decryptedData;

    } catch (error) {
        console.error("Encryption/Decryption Error:", error);
    }
});

async function saveDataToFirebase(encryptedData) {
    const userId = auth.currentUser ? auth.currentUser.uid : 'guest'; // Use current user ID or 'guest'
    const dataRef = ref(database, 'encryptedData/' + userId + '/' + Date.now()); // Create a unique key with timestamp
    await set(dataRef, { encryptedData: encryptedData });
    console.log("Data saved to Firebase:", encryptedData);
}

function encrypt(plaintext, secretKey) {
    const ciphertext = CryptoJS.AES.encrypt(plaintext, secretKey).toString();
    return ciphertext; // Return the encrypted data as a string
}

function decrypt(ciphertext, secretKey) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText; // Return the decrypted data
}
