import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';
import { auth } from './firebase-config.js';
const db = getDatabase();
const storage = getStorage();

// Get references to elements
const addPasswordButton = document.getElementById('addPasswordButton');
const logoutButton = document.getElementById('logoutButton');
const savePasswordButton = document.getElementById('savePasswordButton');
const closeModalButton = document.getElementById('closeModal');
const addPasswordModal = document.getElementById('addPasswordModal');
const passwordList = document.getElementById('passwordList');
const welcomeMessage = document.querySelector('.top-bar h1');
const viewPasswordModal = document.getElementById('viewPasswordModal');
const closeViewModalButton = document.getElementById('closeViewModal');
const viewPasswordDetails = document.getElementById('viewPasswordDetails');
const searchInput = document.getElementById('search-input');
const requireFacialRecognitionCheckbox = document.getElementById('requireFacialRecognition');


// Load face-api.js models
async function loadModels() {
    const MODEL_URL = '/models'; // Path to your model files
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
}
// Function to verify facial recognition
function verifyFacialRecognition() {
    return new Promise((resolve, reject) => {
        startFacialRecognition()
            .then((isRecognized) => {
                resolve(isRecognized); // Resolve with the recognition result
            })
            .catch((error) => {
                console.error('Facial recognition error:', error);
                alert('An error occurred during facial recognition. Please try again.');
                reject(false); // Reject in case of an error
            });
    });
}


// Start facial recognition process
async function startFacialRecognition() {
    // Create a video element
    const video = document.createElement('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
            video.play();
            document.body.append(video);

            // Wait for a face to be recognized
            const results = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

            // Stop video stream after processing
            stream.getTracks().forEach(track => track.stop());
            video.remove();

            // Update recognition status based on results
            if (results) {
                displayRecognitionStatus("Facial recognition successful!", "success");
                resolve(true); // Face recognized
            } else {
                displayRecognitionStatus("No face detected. Please try again.", "error");
                resolve(false); // No face recognized
            }
        };
    });
}

// Display recognition status message
function displayRecognitionStatus(message, type) {
    const statusElement = document.getElementById('recognitionStatus');
    statusElement.style.display = 'block';
    statusElement.textContent = message;
    statusElement.style.color = type === "success" ? "green" : "red";
}

auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
        loadModels().then(() => {
            loadPasswords();
        }).catch((error) => {
            console.error('Error loading models:', error);
            alert('Error loading facial recognition models. Please refresh the page.');
        });
    } else {
        window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
    }
});



// Show modal for adding password
addPasswordButton.addEventListener('click', () => {
    clearModalFields();
    addPasswordModal.style.display = 'flex';
});

// Close modal for adding password
closeModalButton.addEventListener('click', () => {
    addPasswordModal.style.display = 'none';
});

// Close modal for viewing password
closeViewModalButton.addEventListener('click', () => {
    viewPasswordModal.style.display = 'none';
});

// Logout user
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});

// Function to encrypt data
function encryptData(data) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; 
    const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
    return encryptedData;
}


// Save or Edit password to Firebase
savePasswordButton.addEventListener('click', async () => {
    const siteName = document.getElementById('title').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const customField = document.getElementById('customField').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const requireMasterPassword = document.getElementById('requireMasterPassword').checked;
    const requireFacialRecognition = requireFacialRecognitionCheckbox.checked;
    const fileInput = document.getElementById('fileInput'); // Corrected to `fileInput`
    const file = fileInput ? fileInput.files[0] : null; // Check if fileInput exists

    const userId = auth.currentUser.uid;
    const passwordKey = document.getElementById('passwordKey').value;

    // Encrypt data before saving
    const encryptedUsername = encryptData(username);
    const encryptedPassword = encryptData(password);
    const encryptedWebsiteUrl = encryptData(websiteUrl);
    const encryptedCustomField = encryptData(customField);
    const encryptedNotes = encryptData(notes);

    // Prepare reference and data
    const passwordRef = passwordKey ? ref(db, 'Passwords/' + userId + '/' + passwordKey) : push(ref(db, 'Passwords/' + userId));
    const passwordData = {
        siteName: siteName || 'N/A',
        username: encryptedUsername || 'N/A',
        password: encryptedPassword || 'N/A',
        websiteUrl: encryptedWebsiteUrl || 'N/A',
        customField: encryptedCustomField || 'N/A',
        notes: encryptedNotes || 'N/A',
        requireMasterPassword: requireMasterPassword,
        requireFacialRecognition: requireFacialRecognition
    };

    // Upload the file to "PasswordFiles" folder in Firebase Storage if a file is selected
    if (file) {
        const fileRef = storageRef(storage, `PasswordFiles/${userId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        passwordData.fileURL = downloadURL; // Save the download URL with password data
    }

    // Save to Firebase
    set(passwordRef, passwordData)
        .then(() => {
            alert('Password ' + (passwordKey ? 'updated' : 'saved') + ' successfully!');
            addPasswordModal.style.display = 'none';
            loadPasswords();
        })
        .catch((error) => {
            alert('Error saving password: ' + error.message);
        });
});

// Load saved passwords with search filter
function loadPasswords() {
    const userId = auth.currentUser.uid;
    const passwordsRef = ref(db, 'Passwords/' + userId);
    const searchQuery = searchInput.value.toLowerCase();

    onValue(passwordsRef, (snapshot) => {
        passwordList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const passwordData = childSnapshot.val();
            const passwordKey = childSnapshot.key;

            if (passwordData.siteName.toLowerCase().includes(searchQuery)) {
                const passwordItem = document.createElement('div');
                passwordItem.className = 'password-item';
                passwordItem.innerHTML = `
                    <div class="password-name">${passwordData.siteName}</div>
                    <button class="view-password">View</button>
                    <div class="dropdown">
                        <button class="dropdown-toggle">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <button class="edit-password" data-key="${passwordKey}">Edit</button>
                            <button class="delete-password" data-key="${passwordKey}">Delete</button>
                        </div>
                    </div>
                `;
                passwordList.appendChild(passwordItem);

                // Add event listener for viewing password
passwordItem.querySelector('.view-password').addEventListener('click', () => {
    const showPassword = () => displayPassword(passwordData);
    
    if (passwordData.requireMasterPassword) {
        verifyMasterPassword(userId).then((isValid) => {
            if (isValid) {
                if (passwordData.requireFacialRecognition) {
                    verifyFacialRecognition().then((isRecognized) => {
                        if (isRecognized) showPassword();
                        else alert('Facial recognition failed.');
                    });
                } else {
                    showPassword();
                }
            } else {
                alert('Incorrect master password.');
            }
        }).catch((error) => {
            alert('Error verifying master password: ' + error.message);
        });
    } else if (passwordData.requireFacialRecognition) {
        verifyFacialRecognition().then((isRecognized) => {
            if (isRecognized) showPassword();
            else alert('Facial recognition failed.');
        });
    } else {
        showPassword();
    }
});

                // Add event listener for editing password
passwordItem.querySelector('.edit-password').addEventListener('click', () => {
    if (passwordData.requireMasterPassword) {
        verifyMasterPassword(userId).then((isValid) => {
            if (isValid) {
                if (passwordData.requireFacialRecognition) {
                    verifyFacialRecognition().then((isRecognized) => {
                        if (isRecognized) editPassword(passwordData, passwordKey);
                        else alert('Facial recognition failed.');
                    });
                } else {
                    editPassword(passwordData, passwordKey);
                }
            } else {
                alert('Incorrect master password.');
            }
        }).catch((error) => {
            alert('Error verifying master password: ' + error.message);
        });
    } else if (passwordData.requireFacialRecognition) {
        verifyFacialRecognition().then((isRecognized) => {
            if (isRecognized) editPassword(passwordData, passwordKey);
            else alert('Facial recognition failed.');
        });
    } else {
        editPassword(passwordData, passwordKey);
    }
});

                // Add event listener for deleting password
                passwordItem.querySelector('.delete-password').addEventListener('click', () => {
                    const confirmDelete = confirm('Are you sure you want to delete this password?');
                    if (confirmDelete) {
                        const passwordRef = ref(db, 'Passwords/' + userId + '/' + passwordKey);
                        const trashRef = ref(db, 'Trash/' + userId + '/Passwords/' + passwordKey);

                        get(passwordRef).then((snapshot) => {
                            if (snapshot.exists()) {
                                const passwordData = snapshot.val();
                                set(trashRef, { ...passwordData, deletedAt: new Date().toISOString() })
                                    .then(() => remove(passwordRef))
                                    .then(() => {
                                        alert('Password moved to Trash successfully!');
                                        loadPasswords();
                                    }).catch((error) => alert('Error deleting password: ' + error.message));
                            } else {
                                alert('Password does not exist.');
                            }
                        }).catch((error) => alert('Error retrieving password: ' + error.message));
                    }
                });

                // Dropdown menu toggle
                const dropdownToggle = passwordItem.querySelector('.dropdown-toggle');
                const dropdownMenu = passwordItem.querySelector('.dropdown-menu');
                dropdownToggle.addEventListener('click', () => {
                    dropdownMenu.classList.toggle('show');
                });
            }
        });
    });
}


// Trigger loadPasswords when search input changes
searchInput.addEventListener('input', loadPasswords);


// Function to display saved password details
function displayPassword(passwordData) {
    viewPasswordDetails.innerHTML = `
        <label>Title:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${passwordData.siteName || 'N/A'}" readonly id="titleInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('titleInput')"></i>
        </div>
        <label>Username:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(passwordData.username) || 'N/A'}" readonly id="usernameInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('usernameInput')"></i>
        </div>
        <label>Password:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(passwordData.password) || 'N/A'}" readonly id="passwordInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('passwordInput')"></i>
        </div>
        <label>Website URL:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(passwordData.websiteUrl) || 'N/A'}" readonly id="websiteUrlInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('websiteUrlInput')"></i>
        </div>
        <label>Custom Field:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(passwordData.customField) || 'N/A'}" readonly id="customFieldInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('customFieldInput')"></i>
        </div>
        <label>Notes:</label>
        <textarea readonly id="notesInput">${decryptData(passwordData.notes) || 'N/A'}</textarea>
        ${passwordData.fileURL ? `<label>File:</label><a href="${passwordData.fileURL}" target="_blank">Download File</a>` : ''}
    `;
    viewPasswordModal.style.display = 'flex';
}


// Function to edit password
function editPassword(passwordData, passwordKey) {
    document.getElementById('title').value = passwordData.siteName;
    document.getElementById('username').value = decryptData(passwordData.username);
    document.getElementById('password').value = decryptData(passwordData.password);
    document.getElementById('websiteUrl').value = decryptData(passwordData.websiteUrl);
    document.getElementById('customField').value = decryptData(passwordData.customField);
    document.getElementById('notes').value = decryptData(passwordData.notes);
    document.getElementById('requireMasterPassword').checked = passwordData.requireMasterPassword;
    requireFacialRecognitionCheckbox.checked = passwordData.requireFacialRecognition;
    document.getElementById('passwordKey').value = passwordKey;
    addPasswordModal.style.display = 'flex';

    // Set the passwordKey value so that the savePasswordButton knows we're editing an existing password
    document.getElementById('passwordKey').value = passwordKey;

    // Show the add password modal
    addPasswordModal.style.display = 'flex';
}



// Clear modal fields
function clearModalFields() {
    document.getElementById('title').value = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('websiteUrl').value = '';
    document.getElementById('customField').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('requireMasterPassword').checked = false;
    requireFacialRecognitionCheckbox.checked = false;
    document.getElementById('passwordKey').value = '';
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const inputElement = document.getElementById(elementId);
    inputElement.select();
    document.execCommand('copy');
    alert('Copied to clipboard!');
}

// Function to decrypt data
function decryptData(encryptedData) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; 
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, secretKey).toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

// Function to verify master password
function verifyMasterPassword(userId) {
    return new Promise((resolve, reject) => {
        const masterPasswordInput = prompt('Please enter your master password:');
        if (masterPasswordInput) {
            const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
            get(masterPasswordRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const savedMasterPassword = snapshot.val();
                    const decryptedMasterPassword = decryptData(savedMasterPassword);
                    if (masterPasswordInput === decryptedMasterPassword) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    reject(new Error('Master password not found.'));
                }
            }).catch((error) => {
                reject(error);
            });
        } else {
            resolve(false);
        }
    });
}


