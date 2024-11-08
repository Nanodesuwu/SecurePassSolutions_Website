import { getDatabase, ref, onValue, remove, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();

// Get references to elements
const passwordList = document.getElementById('passwordList');
const addPasswordButton = document.getElementById('addPasswordButton');
const viewPasswordModal = document.getElementById('viewPasswordModal');
const logoutButton = document.getElementById('logoutButton');
const closeViewModalButton = document.getElementById('closeViewModal');
const viewPasswordDetails = document.getElementById('viewPasswordDetails');
const editPasswordModal = document.getElementById('editPasswordModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editPasswordForm = document.getElementById('editPasswordForm');
const recognitionStatus = document.getElementById('recognitionStatus'); // For facial recognition status

// Load face-api.js models
async function loadModels() {
    const MODEL_URL = '/models';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
}

// Start facial recognition process
async function startFacialRecognition() {
    const video = document.createElement('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
            video.play();
            document.body.append(video);

            const results = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

            stream.getTracks().forEach(track => track.stop());
            video.remove();

            resolve(!!results);
        };
    });
}

// Verify face before executing an action
async function verifyFaceForAction(callback) {
    recognitionStatus.innerText = 'Starting facial recognition...';
    recognitionStatus.style.display = 'block';

    const faceVerified = await startFacialRecognition();
    recognitionStatus.style.display = 'none';

    if (faceVerified) {
        callback();
    } else {
        alert('Face not recognized. Unable to proceed.');
    }
}

// Verify master password before executing an action
function verifyMasterPassword(userId, callback) {
    const masterPasswordInput = prompt("Please enter your master password:");
    const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);

    get(masterPasswordRef).then((snapshot) => {
        if (snapshot.exists()) {
            const savedMasterPassword = snapshot.val();
            if (masterPasswordInput === decryptData(savedMasterPassword)) {
                callback();
            } else {
                alert("Incorrect master password.");
            }
        } else {
            alert("Master password not found.");
        }
    }).catch((error) => {
        alert('Error verifying master password: ' + error.message);
    });
}

// Check authentication state on page load
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadModels();
        loadItems();
    } else {
        window.location.href = 'index.html';
    }
});

// Close modal for viewing password
closeViewModalButton.addEventListener('click', () => {
    viewPasswordModal.style.display = 'none';
});

// Logout user
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});

// Load Credit Cards, Passwords, Personal Info, and Secure Notes
function loadItems() {
    const userId = auth.currentUser.uid;
    const creditCardRef = ref(db, 'CreditCards/' + userId);
    const personalInfoRef = ref(db, 'PersonalInfo/' + userId);
    const passwordRef = ref(db, 'Passwords/' + userId);
    const secureNotesRef = ref(db, 'Securenotes/' + userId);

    passwordList.innerHTML = '';

    // Load each category with checks only if required
    onValue(creditCardRef, snapshot => loadCategoryItems(snapshot, 'Credit Card'));
    onValue(personalInfoRef, snapshot => loadCategoryItems(snapshot, 'Personal Info'));
    onValue(passwordRef, snapshot => loadCategoryItems(snapshot, 'Password'));
    onValue(secureNotesRef, snapshot => loadCategoryItems(snapshot, 'Secure Note'));
}

// Load and display each item category
function loadCategoryItems(snapshot, type) {
    snapshot.forEach(childSnapshot => {
        const itemData = childSnapshot.val();
        const itemKey = childSnapshot.key;

        const itemElement = createItem(type, itemData, itemKey);
        passwordList.appendChild(itemElement);
    });
}

// Create an item element
function createItem(type, itemData, itemKey) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item';

    let displayTitle = '';
    if (type === 'Personal Info') {
        displayTitle = itemData.fullName ? decryptData(itemData.fullName) : 'N/A';
    } else if (type === 'Credit Card') {
        displayTitle = itemData.title || 'N/A';
    } else if (type === 'Password') {
        displayTitle = itemData.siteName || 'N/A';
    } else if (type === 'Secure Note') {
        displayTitle = itemData.title || 'Untitled';
    }

    itemElement.innerHTML = `
        <div class="item-title">${type}: ${displayTitle}</div>
        <button class="view-item">View</button>
        <button class="delete-item" data-key="${itemKey}">Delete</button>
    `;

    // Add event listener for viewing item
    itemElement.querySelector('.view-item').addEventListener('click', () => {
        const viewAction = () => displayItem(type, itemData, itemKey);

        if (itemData.requireMasterPassword === true) {
            verifyMasterPassword(auth.currentUser.uid, () => {
                if (itemData.requireFacialRecognition === true) {
                    verifyFaceForAction(viewAction);
                } else {
                    viewAction();
                }
            });
        } else if (itemData.requireFacialRecognition === true) {
            verifyFaceForAction(viewAction);
        } else {
            viewAction();
        }
    });

    // Add event listener for deleting item
    itemElement.querySelector('.delete-item').addEventListener('click', () => {
        const deleteAction = () => deleteItem(itemKey, type);

        if (itemData.requireMasterPassword === true) {
            verifyMasterPassword(auth.currentUser.uid, () => {
                if (itemData.requireFacialRecognition === true) {
                    verifyFaceForAction(deleteAction);
                } else {
                    deleteAction();
                }
            });
        } else if (itemData.requireFacialRecognition === true) {
            verifyFaceForAction(deleteAction);
        } else {
            deleteAction();
        }
    });

    return itemElement;
}

// Function to display item details in modal
function displayItem(type, itemData, itemKey) {
    let decryptedData;

    if (type === 'Credit Card') {
        decryptedData = {
            title: itemData.title || 'N/A',
            cardholderName: itemData.cardholderName ? decryptData(itemData.cardholderName) : 'N/A',
            cardNumber: itemData.cardNumber ? decryptData(itemData.cardNumber) : 'N/A',
            expirationDate: itemData.expirationDate ? decryptData(itemData.expirationDate) : 'N/A',
            cvv: itemData.cvv ? decryptData(itemData.cvv) : 'N/A',
            cardPin: itemData.cardPin ? decryptData(itemData.cardPin) : 'N/A',
            zipCode: itemData.zipCode ? decryptData(itemData.zipCode) : 'N/A',
            customField: itemData.customField ? decryptData(itemData.customField) : 'N/A',
            notes: itemData.notes ? decryptData(itemData.notes) : 'N/A',
        };
    } else if (type === 'Personal Info') {
        decryptedData = {
            fullName: itemData.fullName ? decryptData(itemData.fullName) : 'N/A',
            email: itemData.email ? decryptData(itemData.email) : 'N/A',
            phone: itemData.phone ? decryptData(itemData.phone) : 'N/A',
            addressLine1: itemData.addressLine1 ? decryptData(itemData.addressLine1) : 'N/A',
            addressLine2: itemData.addressLine2 ? decryptData(itemData.addressLine2) : 'N/A',
            city: itemData.city ? decryptData(itemData.city) : 'N/A',
            state: itemData.state ? decryptData(itemData.state) : 'N/A',
            zipCode: itemData.zipCode ? decryptData(itemData.zipCode) : 'N/A',
            country: itemData.country ? decryptData(itemData.country) : 'N/A',
            customField: itemData.customField ? decryptData(itemData.customField) : 'N/A',
            notes: itemData.notes ? decryptData(itemData.notes) : 'N/A',
        };
    } else if (type === 'Password') {
        decryptedData = {
            siteName: itemData.siteName || 'N/A',
            username: itemData.username ? decryptData(itemData.username) : 'N/A',
            password: itemData.password ? decryptData(itemData.password) : 'N/A',
            websiteUrl: itemData.websiteUrl ? decryptData(itemData.websiteUrl) : 'N/A',
            customField: itemData.customField ? decryptData(itemData.customField) : 'N/A',
            notes: itemData.notes ? decryptData(itemData.notes) : 'N/A',
        };
    } else if (type === 'Secure Note') {
        decryptedData = {
            title: itemData.title || 'Untitled',
            content: itemData.content ? decryptData(itemData.content) : 'No content',
        };
    }

    viewPasswordDetails.innerHTML = generateDetailsHTML(type, decryptedData);
    viewPasswordModal.style.display = 'block';
}

// Function to generate HTML for displaying details
function generateDetailsHTML(type, decryptedData) {
    const fields = Object.entries(decryptedData).map(([key, value]) => `
        <label>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</label>
        <input type="text" value="${value}" readonly />
    `).join('');

    return `<h2>${type} Details</h2>${fields}`;
}

// Function to decrypt data
function decryptData(encryptedData) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456';
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, secretKey).toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

// Delete an item
function deleteItem(itemKey, type) {
    const userId = auth.currentUser.uid;
    const itemRef = ref(db, `${type}s/${userId}/${itemKey}`);

    remove(itemRef)
        .then(() => {
            alert("Item deleted successfully!");
        })
        .catch((error) => {
            console.error("Error deleting item:", error);
        });
}
