import { getDatabase, ref, set, push, onValue, remove, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';
import { auth } from './firebase-config.js';
const db = getDatabase();
const storage = getStorage();

// Get references to elements
const addInfoButton = document.getElementById('addInfoButton');
const logoutButton = document.getElementById('logoutButton');
const saveInfoButton = document.getElementById('saveInfoButton');
const closeModalButton = document.getElementById('closeModal');
const addInfoModal = document.getElementById('addInfoModal');
const infoList = document.getElementById('infoList');
const welcomeMessage = document.querySelector('.top-bar h1');
const viewInfoModal = document.getElementById('viewInfoModal');
const closeViewModalButton = document.getElementById('closeViewModal');
const viewInfoDetails = document.getElementById('viewInfoDetails');
const fileUpload = document.getElementById('fileUpload');
const fileImageContainer = document.getElementById('fileImageContainer'); 
const requireFacialRecognitionCheckbox = document.getElementById('requireFacialRecognition');
const video = document.getElementById('video');

// Setup face-api for facial recognition
async function setupFaceApi() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}


// Master password requirement checkbox
const requireMasterPasswordCheckbox = document.getElementById('requireMasterPasswordCheckbox');

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
        loadPersonalInfo();
        setupFaceApi(); // Setup face-api
    } else {
        window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
    }
});

// Show modal for adding personal info
addInfoButton.addEventListener('click', () => {
    clearModalFields();
    addInfoModal.style.display = 'flex';
});

// Close modal for adding personal info
closeModalButton.addEventListener('click', () => {
    addInfoModal.style.display = 'none';
});

// Close modal for viewing personal info
closeViewModalButton.addEventListener('click', () => {
    viewInfoModal.style.display = 'none';
});

// Logout user
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});

// Save or Edit personal info to Firebase
saveInfoButton.addEventListener('click', () => {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const addressLine1 = document.getElementById('addressLine1').value.trim();
    const addressLine2 = document.getElementById('addressLine2').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const zipCode = document.getElementById('zipCode').value.trim();
    const country = document.getElementById('country').value.trim();
    const customField = document.getElementById('customField').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const file = fileUpload.files[0];

    const userId = auth.currentUser.uid;
    const infoKey = document.getElementById('infoKey').value;

    // Get the checked status of the checkboxes
    const requireMasterPassword = document.getElementById('requireMasterPassword').checked;
    const requireFacialRecognition = document.getElementById('requireFacialRecognition').checked;

    if (fullName || email || phone) {
        const personalInfoRef = infoKey ? ref(db, 'PersonalInfo/' + userId + '/' + infoKey) : push(ref(db, 'PersonalInfo/' + userId));

        // Encrypt data before saving
        const encryptedData = {
            fullName: encryptData(fullName),
            email: encryptData(email),
            phone: encryptData(phone),
            addressLine1: encryptData(addressLine1),
            addressLine2: encryptData(addressLine2),
            city: encryptData(city),
            state: encryptData(state),
            zipCode: encryptData(zipCode),
            country: encryptData(country),
            customField: encryptData(customField),
            notes: encryptData(notes),
            requireMasterPassword: requireMasterPassword,
            requireFacialRecognition: requireFacialRecognition
        };

        // Handle file upload
        if (file) {
            const fileRef = storageRef(storage, `personal_info/${userId}/${file.name}`);
            uploadBytes(fileRef, file).then(() => {
                // Get the download URL
                return getDownloadURL(fileRef);
            }).then((downloadURL) => {
                // Include the download URL in the encrypted data
                encryptedData.fileURL = downloadURL;

                // Save data to the database
                return set(personalInfoRef, encryptedData);
            }).then(() => {
                alert('Personal Info ' + (infoKey ? 'updated' : 'saved') + ' successfully!');
                addInfoModal.style.display = 'none';
                loadPersonalInfo();
            }).catch((error) => {
                alert('Error saving personal info: ' + error.message);
            });
        } else {
            // If no file is uploaded, save data without the file URL
            set(personalInfoRef, encryptedData).then(() => {
                alert('Personal Info ' + (infoKey ? 'updated' : 'saved') + ' successfully!');
                addInfoModal.style.display = 'none';
                loadPersonalInfo();
            }).catch((error) => {
                alert('Error saving personal info: ' + error.message);
            });
        }
    } else {
        alert('Please fill in at least Full Name, Email or Phone to save the info.');
    }
});

async function startCamera() {
    const video = document.getElementById('video'); // Your video element
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();
    } catch (error) {
        console.error('Error accessing the camera:', error);
        alert('Unable to access the camera. Please check your permissions.');
    }
}


// Load saved personal info with search filter
function loadPersonalInfo() {
    const userId = auth.currentUser.uid;
    const personalInfoRef = ref(db, 'PersonalInfo/' + userId);
    const searchInfoInput = document.getElementById('searchInfo'); // Get the search input element
    const requireMasterPasswordCheckbox = document.getElementById('requireMasterPassword'); // The checkbox element
    const requireFaceRecognitionCheckbox = document.getElementById('requireFaceRecognition'); // The facial recognition checkbox element
    const recognitionStatus = document.getElementById('recognitionStatus'); // Notification area

    onValue(personalInfoRef, (snapshot) => {
        infoList.innerHTML = ''; // Clear existing list

        // This function will be used to filter the displayed personal info
        function filterPersonalInfo(searchTerm) {
            // Clear the current list before filtering
            infoList.innerHTML = '';

            snapshot.forEach((childSnapshot) => {
                const infoData = childSnapshot.val();
                const infoKey = childSnapshot.key;

                // Check if the full name matches the search term
                if (decryptData(infoData.fullName).toLowerCase().includes(searchTerm)) {
                    const infoItem = document.createElement('div');
                    infoItem.className = 'info-item';
                    infoItem.innerHTML = `
                        <div class="info-name">${decryptData(infoData.fullName)}</div>
                        <button class="view-info">View</button>
                        <div class="dropdown">
                            <button class="dropdown-toggle">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu">
                                <button class="edit-info" data-key="${infoKey}">Edit</button>
                                <button class="delete-info" data-key="${infoKey}">Delete</button>
                            </div>
                        </div>
                    `;
                    infoList.appendChild(infoItem);

                    // Add event listener for viewing personal info
                    infoItem.querySelector('.view-info').addEventListener('click', () => {
                        const showInfo = () => displayInfo(infoData);
                        recognitionStatus.style.display = 'block'; // Show notification area

                        if (infoData.requireMasterPassword || (requireMasterPasswordCheckbox && requireMasterPasswordCheckbox.checked)) {
                            verifyMasterPassword(userId).then((isValid) => {
                                if (isValid) {
                                    if (infoData.requireFacialRecognition || (requireFaceRecognitionCheckbox && requireFaceRecognitionCheckbox.checked)) {
                                        recognitionStatus.innerText = 'Starting facial recognition...';
                                        verifyFacialRecognition(userId).then((isRecognized) => {
                                            if (isRecognized) {
                                                recognitionStatus.innerText = 'Facial recognition successful!';
                                                showInfo();
                                            } else {
                                                recognitionStatus.innerText = 'Facial recognition failed. Please try again.';
                                            }
                                        }).catch((error) => {
                                            recognitionStatus.innerText = 'Error verifying facial recognition: ' + error.message;
                                        });
                                    } else {
                                        showInfo();
                                    }
                                } else {
                                    alert('Invalid master password. Please try again.');
                                }
                            }).catch((error) => {
                                alert('Error verifying master password: ' + error.message);
                            });
                        } else if (infoData.requireFacialRecognition || (requireFaceRecognitionCheckbox && requireFaceRecognitionCheckbox.checked)) {
                            recognitionStatus.innerText = 'Starting facial recognition...';
                            verifyFacialRecognition(userId).then((isRecognized) => {
                                if (isRecognized) {
                                    recognitionStatus.innerText = 'Facial recognition successful!';
                                    showInfo();
                                } else {
                                    recognitionStatus.innerText = 'Facial recognition failed. Please try again.';
                                }
                            }).catch((error) => {
                                recognitionStatus.innerText = 'Error verifying facial recognition: ' + error.message;
                            });
                        } else {
                            showInfo();
                        }
                    });

                    // Add event listener for editing personal info
                    infoItem.querySelector('.edit-info').addEventListener('click', () => {
                        recognitionStatus.style.display = 'block'; // Show notification area

                        if (infoData.requireMasterPassword || (requireMasterPasswordCheckbox && requireMasterPasswordCheckbox.checked)) {
                            verifyMasterPassword(userId).then((isValid) => {
                                if (isValid) {
                                    if (infoData.requireFacialRecognition || (requireFaceRecognitionCheckbox && requireFaceRecognitionCheckbox.checked)) {
                                        recognitionStatus.innerText = 'Starting facial recognition...';
                                        verifyFacialRecognition(userId).then((isRecognized) => {
                                            if (isRecognized) {
                                                recognitionStatus.innerText = 'Facial recognition successful!';
                                                editInfo(infoData, infoKey);
                                            } else {
                                                recognitionStatus.innerText = 'Facial recognition failed. Please try again.';
                                            }
                                        }).catch((error) => {
                                            recognitionStatus.innerText = 'Error verifying facial recognition: ' + error.message;
                                        });
                                    } else {
                                        editInfo(infoData, infoKey);
                                    }
                                } else {
                                    alert('Invalid master password. Please try again.');
                                }
                            }).catch((error) => {
                                alert('Error verifying master password: ' + error.message);
                            });
                        } else if (infoData.requireFacialRecognition || (requireFaceRecognitionCheckbox && requireFaceRecognitionCheckbox.checked)) {
                            recognitionStatus.innerText = 'Starting facial recognition...';
                            verifyFacialRecognition(userId).then((isRecognized) => {
                                if (isRecognized) {
                                    recognitionStatus.innerText = 'Facial recognition successful!';
                                    editInfo(infoData, infoKey);
                                } else {
                                    recognitionStatus.innerText = 'Facial recognition failed. Please try again.';
                                }
                            }).catch((error) => {
                                recognitionStatus.innerText = 'Error verifying facial recognition: ' + error.message;
                            });
                        } else {
                            editInfo(infoData, infoKey);
                        }
                    });

                    // Add event listener for deleting personal info
                    infoItem.querySelector('.delete-info').addEventListener('click', () => {
                        const confirmDelete = confirm('Are you sure you want to delete this info?');
                        if (confirmDelete) {
                            const personalInfoRef = ref(db, 'PersonalInfo/' + userId + '/' + infoKey);
                            const trashRef = ref(db, 'Trash/' + userId + '/PersonalInfo/' + infoKey);

                            // Get the personal info data before deletion
                            get(personalInfoRef).then((snapshot) => {
                                if (snapshot.exists()) {
                                    const infoData = snapshot.val();

                                    // Prepare the data to move to Trash
                                    const itemData = {
                                        fullName: infoData.fullName,
                                        email: infoData.email,
                                        phone: infoData.phone,
                                        addressLine1: infoData.addressLine1,
                                        addressLine2: infoData.addressLine2,
                                        city: infoData.city,
                                        state: infoData.state,
                                        zipCode: infoData.zipCode,
                                        country: infoData.country,
                                        customField: infoData.customField,
                                        notes: infoData.notes,
                                        deletedAt: new Date().toISOString(),
                                    };

                                    // Store the itemData in the Trash
                                    set(trashRef, itemData).then(() => {
                                        // Now delete the original personal info entry
                                        return remove(personalInfoRef);
                                    }).then(() => {
                                        alert('Personal info moved to Trash successfully!');
                                        loadPersonalInfo(); // Refresh the list after deletion
                                    }).catch((error) => {
                                        alert('Error deleting personal info: ' + error.message);
                                    });
                                } else {
                                    alert('Personal info does not exist.');
                                }
                            }).catch((error) => {
                                alert('Error retrieving personal info: ' + error.message);
                            });
                        }
                    });

                    // Add event listener for dropdown toggle
                    const dropdownToggle = infoItem.querySelector('.dropdown-toggle');
                    const dropdownMenu = infoItem.querySelector('.dropdown-menu');
                    dropdownToggle.addEventListener('click', () => {
                        dropdownMenu.classList.toggle('show');
                    });
                }
            });
        }

        filterPersonalInfo(''); // Initially load all personal info

        // Add event listener for the search input
        searchInfoInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterPersonalInfo(searchTerm);
        });
    });
}




// Function to display saved personal info details
function displayInfo(infoData) {
    viewInfoDetails.innerHTML = `
        <label>Full Name:</label>
        <input type="text" value="${decryptData(infoData.fullName) || 'N/A'}" readonly>
        <label>Email:</label>
        <input type="text" value="${decryptData(infoData.email) || 'N/A'}" readonly>
        <label>Phone:</label>
        <input type="text" value="${decryptData(infoData.phone) || 'N/A'}" readonly>
        <label>Address Line 1:</label>
        <input type="text" value="${decryptData(infoData.addressLine1) || 'N/A'}" readonly>
        <label>Address Line 2:</label>
        <input type="text" value="${decryptData(infoData.addressLine2) || 'N/A'}" readonly>
        <label>City:</label>
        <input type="text" value="${decryptData(infoData.city) || 'N/A'}" readonly>
        <label>State:</label>
        <input type="text" value="${decryptData(infoData.state) || 'N/A'}" readonly>
        <label>Zip Code:</label>
        <input type="text" value="${decryptData(infoData.zipCode) || 'N/A'}" readonly>
        <label>Country:</label>
        <input type="text" value="${decryptData(infoData.country) || 'N/A'}" readonly>
        <label>Custom Field:</label>
        <input type="text" value="${decryptData(infoData.customField) || 'N/A'}" readonly>
        <label>Notes:</label>
        <textarea readonly>${decryptData(infoData.notes) || 'N/A'}</textarea>
        <label>File:</label>
        ${infoData.fileURL ? `<a href="${infoData.fileURL}" target="_blank">View Uploaded File</a>` : 'N/A'}
    `;
    viewInfoModal.style.display = 'flex';
}

// Function to edit personal info
function editInfo(infoData, infoKey) {
    document.getElementById('fullName').value = decryptData(infoData.fullName);
    document.getElementById('email').value = decryptData(infoData.email);
    document.getElementById('phone').value = decryptData(infoData.phone);
    document.getElementById('addressLine1').value = decryptData(infoData.addressLine1);
    document.getElementById('addressLine2').value = decryptData(infoData.addressLine2);
    document.getElementById('city').value = decryptData(infoData.city);
    document.getElementById('state').value = decryptData(infoData.state);
    document.getElementById('zipCode').value = decryptData(infoData.zipCode);
    document.getElementById('country').value = decryptData(infoData.country);
    document.getElementById('customField').value = decryptData(infoData.customField);
    document.getElementById('notes').value = decryptData(infoData.notes);
    document.getElementById('infoKey').value = infoKey; // Store the key for editing

    addInfoModal.style.display = 'flex'; // Show the modal
}

// Function to encrypt data
function encryptData(data) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456';
    return CryptoJS.AES.encrypt(data, secretKey).toString();
}

// Function to decrypt data
function decryptData(encryptedData) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456';
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, secretKey).toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

// Clear modal fields
function clearModalFields() {
    document.getElementById('fullName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('addressLine1').value = '';
    document.getElementById('addressLine2').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
    document.getElementById('zipCode').value = '';
    document.getElementById('country').value = '';
    document.getElementById('customField').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('infoKey').value = ''; // Clear the infoKey
}

// Function to verify master password
function verifyMasterPassword(userId) {
    return new Promise((resolve, reject) => {
        const masterPasswordInput = prompt('Please enter your master password:');
        if (masterPasswordInput) {
            const masterPasswordRef = ref(db, 'MasterPasswords/' + userId);
            
            get(masterPasswordRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const savedMasterPassword = snapshot.val();

                        try {
                            const decryptedMasterPassword = decryptData(savedMasterPassword);
                            if (masterPasswordInput === decryptedMasterPassword) {
                                resolve(true);
                            } else {
                                alert('The entered master password does not match. Please try again.');
                                resolve(false);
                            }
                        } catch (error) {
                            reject(new Error('Error decrypting the master password: ' + error.message));
                        }
                    } else {
                        reject(new Error('Master password not found for this user.'));
                    }
                })
                .catch((error) => {
                    reject(new Error('Error retrieving the master password: ' + error.message));
                });
        } else {
            resolve(false);
        }
    });
}


// Function to verify facial recognition
function verifyFacialRecognition(userId) {
    return new Promise((resolve, reject) => {
        // Start video stream
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then((stream) => {
                video.srcObject = stream;
                video.play();

                // Load face-api models
                faceapi.nets.tinyFaceDetector.loadFromUri('/models')
                    .then(() => faceapi.nets.faceLandmark68Net.loadFromUri('/models'))
                    .then(() => faceapi.nets.faceRecognitionNet.loadFromUri('/models'))
                    .then(() => {
                        // Run face detection every 100ms
                        const intervalId = setInterval(async () => {
                            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
                            if (detections) {
                                // Here you would compare the detected face with the stored face data
                                // For now, we just simulate a successful match
                                clearInterval(intervalId);
                                stream.getTracks().forEach(track => track.stop()); // Stop video stream
                                resolve(true);
                            }
                        }, 100);
                    }).catch(reject);
            })
            .catch((error) => {
                reject(new Error('Could not access camera: ' + error.message));
            });
    });
}
