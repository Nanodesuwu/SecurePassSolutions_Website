import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';
import { auth } from './firebase-config.js';
const storage = getStorage();
const db = getDatabase();

// Get references to elements
const addCreditCardButton = document.getElementById('addCreditCardButton');
const logoutButton = document.getElementById('logoutButton');
const saveCreditCardButton = document.getElementById('saveCreditCardButton');
const closeModalButton = document.getElementById('closeModal');
const addCreditCardModal = document.getElementById('addCreditCardModal');
const creditCardList = document.getElementById('creditCardList');
const welcomeMessage = document.querySelector('.top-bar h1');
const viewCreditCardModal = document.getElementById('viewCreditCardModal');
const closeViewModalButton = document.getElementById('closeViewModal');
const viewCreditCardDetails = document.getElementById('viewCreditCardDetails');

// Load face-api.js models
async function loadModels() {
    const MODEL_URL = '/models'; // Path to your model files
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

            resolve(!!results); // Face recognized
        };
    });
}

// Verify face before executing an action
async function verifyFaceForAction(action) {
    const recognitionStatus = document.getElementById('recognitionStatus');
    recognitionStatus.innerText = 'Starting facial recognition...';
    recognitionStatus.style.display = 'block';

    const faceVerified = await startFacialRecognition();
    recognitionStatus.style.display = 'none';

    if (faceVerified) {
        action(); // Execute the action if the face is verified
    } else {
        alert('Face not recognized. Unable to proceed.');
    }
}

// Check authentication state on page load
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadModels(); // Load facial recognition models
        loadCreditCards(); 
    } else {
        window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
    }
});


// Show modal for adding credit card
addCreditCardButton.addEventListener('click', () => {
    clearModalFields();
    addCreditCardModal.style.display = 'flex';
});

// Close modal for adding credit card
closeModalButton.addEventListener('click', () => {
    addCreditCardModal.style.display = 'none';
});

// Close modal for viewing credit card
closeViewModalButton.addEventListener('click', () => {
    viewCreditCardModal.style.display = 'none';
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
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Replace with your actual secret key
    const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
    return encryptedData;
}

// Save or Edit credit card to Firebase
saveCreditCardButton.addEventListener('click', () => {
    const title = document.getElementById('title').value.trim();
    const cardholderName = document.getElementById('cardholderName').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const expirationDate = document.getElementById('expirationDate').value.trim();
    const cvv = document.getElementById('cvv').value.trim();
    const cardPin = document.getElementById('cardPin').value.trim();
    const zipCode = document.getElementById('zipCode').value.trim();
    const customField = document.getElementById('customField').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const requireMasterPassword = document.getElementById('requireMasterPassword').checked;
    const requireFacialRecognition = document.getElementById('requireFacialRecognition').checked; // Get the facial recognition checkbox state
    const fileUpload = document.getElementById('fileUpload').files[0]; // Get the file

    const userId = auth.currentUser.uid;
    const creditCardKey = document.getElementById('creditCardKey').value;

    const creditCardData = {
        title: title || 'N/A',
        cardholderName: encryptData(cardholderName) || 'N/A',
        cardNumber: encryptData(cardNumber) || 'N/A',
        expirationDate: encryptData(expirationDate) || 'N/A',
        cvv: encryptData(cvv) || 'N/A',
        cardPin: encryptData(cardPin) || 'N/A',
        zipCode: encryptData(zipCode) || 'N/A',
        customField: encryptData(customField) || 'N/A',
        notes: encryptData(notes) || 'N/A',
        requireMasterPassword: requireMasterPassword,
        requireFacialRecognition: requireFacialRecognition // Add the facial recognition property here
    };

    const creditCardRef = creditCardKey ? ref(db, 'CreditCards/' + userId + '/' + creditCardKey) : push(ref(db, 'CreditCards/' + userId));

    // Handle file upload
    if (fileUpload) {
        const storagePath = 'CreditCardFiles/' + userId + '/' + creditCardKey + '/' + fileUpload.name;
        const fileRef = storageRef(storage, storagePath);

        uploadBytes(fileRef, fileUpload).then(() => {
            return getDownloadURL(fileRef);
        }).then((url) => {
            creditCardData.fileUrl = url; // Add file URL here
            return set(creditCardRef, creditCardData);
        }).then(() => {
            alert('Credit card saved successfully with file!');
            addCreditCardModal.style.display = 'none';
            loadCreditCards();
        }).catch((error) => {
            alert('Error saving credit card: ' + error.message);
        });
    } else {
        // Save credit card without file
        set(creditCardRef, creditCardData).then(() => {
            alert('Credit card ' + (creditCardKey ? 'updated' : 'saved') + ' successfully!');
            addCreditCardModal.style.display = 'none';
            loadCreditCards();
        }).catch((error) => {
            alert('Error saving credit card: ' + error.message);
        });
    }
});

// Load saved credit cards
function loadCreditCards() {
    const userId = auth.currentUser.uid;
    const creditCardsRef = ref(db, 'CreditCards/' + userId);
    const searchCreditCardInput = document.getElementById('searchCreditCard'); // Get the search input element
    const recognitionStatus = document.getElementById('recognitionStatus'); // Notification area

    onValue(creditCardsRef, (snapshot) => {
        creditCardList.innerHTML = ''; // Clear existing list

        // This function will be used to filter the displayed credit cards
        function filterCreditCards(searchTerm) {
            creditCardList.innerHTML = ''; // Clear current list before filtering

            snapshot.forEach((childSnapshot) => {
                const creditCardData = childSnapshot.val();
                const creditCardKey = childSnapshot.key;

                // Check if the title matches the search term
                if (
                    creditCardData.title.toLowerCase().includes(searchTerm) ||
                    decryptData(creditCardData.cardholderName).toLowerCase().includes(searchTerm) ||
                    decryptData(creditCardData.cardNumber).toLowerCase().includes(searchTerm)
                ) {
                    const creditCardItem = document.createElement('div');
                    creditCardItem.className = 'credit-card-item';
                    creditCardItem.innerHTML = `
                        <div class="credit-card-title">${creditCardData.title}</div>
                        <button class="view-credit-card">View</button>
                        <div class="dropdown">
                            <button class="dropdown-toggle">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu">
                                <button class="edit-credit-card" data-key="${creditCardKey}">Edit</button>
                                <button class="delete-credit-card" data-key="${creditCardKey}">Delete</button>
                            </div>
                        </div>
                    `;
                    creditCardList.appendChild(creditCardItem);

                    // Verify if facial recognition is required for this credit card
                    const requiresFacialRecognition = creditCardData.requireFacialRecognition || false;

                    // Facial recognition setup for view, edit, delete actions
                    const verifyFaceForAction = async (callback) => {
                        if (requiresFacialRecognition) {
                            recognitionStatus.style.display = 'block'; // Show notification area
                            recognitionStatus.innerText = 'Starting facial recognition...'; // Initial status message

                            const isFaceVerified = await startFacialRecognition();
                            if (isFaceVerified) {
                                recognitionStatus.innerText = 'Face recognized. Proceeding...'; // Update status on success
                                setTimeout(() => {
                                    recognitionStatus.style.display = 'none'; // Hide notification after a brief period
                                }, 2000);
                                callback();
                            } else {
                                recognitionStatus.innerText = 'Face not recognized. Unable to proceed.'; // Status on failure
                                setTimeout(() => {
                                    recognitionStatus.style.display = 'none'; // Hide notification after a brief period
                                }, 2000);
                            }
                        } else {
                            // If facial recognition is not required, just call the callback
                            callback();
                        }
                    };

                    // View credit card with facial recognition
                    creditCardItem.querySelector('.view-credit-card').addEventListener('click', () => {
                        const viewAction = () => {
                            if (creditCardData.requireMasterPassword) {
                                verifyMasterPassword(userId).then((isValid) => {
                                    if (isValid) displayCreditCard(creditCardData);
                                    else alert('Incorrect master password.');
                                }).catch((error) => {
                                    alert('Error verifying master password: ' + error.message);
                                });
                            } else {
                                displayCreditCard(creditCardData);
                            }
                        };
                        verifyFaceForAction(viewAction);
                    });

                    // Edit credit card with facial recognition
                    creditCardItem.querySelector('.edit-credit-card').addEventListener('click', () => {
                        const editAction = () => {
                            if (creditCardData.requireMasterPassword) {
                                verifyMasterPassword(userId).then((isValid) => {
                                    if (isValid) editCreditCard(creditCardData, creditCardKey);
                                    else alert('Incorrect master password.');
                                }).catch((error) => {
                                    alert('Error verifying master password: ' + error.message);
                                });
                            } else {
                                editCreditCard(creditCardData, creditCardKey);
                            }
                        };
                        verifyFaceForAction(editAction);
                    });

                    // Delete credit card with facial recognition
                    creditCardItem.querySelector('.delete-credit-card').addEventListener('click', () => {
                        const deleteAction = () => {
                            const confirmDelete = confirm('Are you sure you want to delete this credit card?');
                            if (confirmDelete) {
                                const creditCardRef = ref(db, 'CreditCards/' + userId + '/' + creditCardKey);
                                const trashRef = ref(db, 'Trash/' + userId + '/CreditCards/' + creditCardKey); // Structured way to store in Trash

                                get(creditCardRef).then((snapshot) => {
                                    if (snapshot.exists()) {
                                        const creditCardData = snapshot.val();

                                        const itemData = {
                                            title: creditCardData.title || 'N/A',
                                            cardholderName: creditCardData.cardholderName || 'N/A',
                                            cardNumber: creditCardData.cardNumber || 'N/A',
                                            expirationDate: creditCardData.expirationDate || 'N/A',
                                            cvv: creditCardData.cvv || 'N/A',
                                            cardPin: creditCardData.cardPin || 'N/A',
                                            zipCode: creditCardData.zipCode || 'N/A',
                                            customField: creditCardData.customField || 'N/A',
                                            notes: creditCardData.notes || 'N/A',
                                            deletedAt: new Date().toISOString(), // Optionally add a timestamp for deletion
                                        };

                                        set(trashRef, itemData).then(() => {
                                            return remove(creditCardRef);
                                        }).then(() => {
                                            alert('Credit card moved to Trash successfully!');
                                            loadCreditCards(); // Refresh the list after deletion
                                        }).catch((error) => {
                                            alert('Error deleting credit card: ' + error.message);
                                        });
                                    } else {
                                        alert('Credit card does not exist.');
                                    }
                                }).catch((error) => {
                                    alert('Error retrieving credit card: ' + error.message);
                                });
                            }
                        };
                        verifyFaceForAction(deleteAction);
                    });

                    // Dropdown menu toggle
                    const dropdownToggle = creditCardItem.querySelector('.dropdown-toggle');
                    const dropdownMenu = creditCardItem.querySelector('.dropdown-menu');
                    dropdownToggle.addEventListener('click', () => {
                        dropdownMenu.classList.toggle('show');
                    });
                }
            });
        }

        // Load all credit cards initially
        filterCreditCards('');

        // Set up the search functionality
        searchCreditCardInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterCreditCards(searchTerm);
        });
    });
}



// Display credit card details in modal
function displayCreditCard(creditCardData) {
    const fileUrl = creditCardData.fileUrl || ''; // Get the file URL if it exists
    viewCreditCardDetails.innerHTML = `
        <h2 style="margin-bottom: 20px;">${creditCardData.title}</h2>
        
        <label>Cardholder Name:</label>
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <input type="text" value="${decryptData(creditCardData.cardholderName) || 'N/A'}" readonly id="cardholderNameInput" style="flex: 1; margin-right: 5px;">
            <i class="fas fa-copy" style="cursor: pointer;" onclick="copyToClipboard('cardholderNameInput')"></i>
        </div>
        
        <label>Card Number:</label>
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <input type="text" value="${decryptData(creditCardData.cardNumber) || 'N/A'}" readonly id="cardNumberInput" style="flex: 1; margin-right: 5px;">
            <i class="fas fa-copy" style="cursor: pointer;" onclick="copyToClipboard('cardNumberInput')"></i>
        </div>
        
        <label>Expiration Date:</label>
        <input type="text" value="${decryptData(creditCardData.expirationDate) || 'N/A'}" readonly style="margin-bottom: 10px;">
        
        <label>CVV:</label>
        <input type="text" value="${decryptData(creditCardData.cvv) || 'N/A'}" readonly style="margin-bottom: 10px;">
        
        <label>Card PIN:</label>
        <input type="text" value="${decryptData(creditCardData.cardPin) || 'N/A'}" readonly style="margin-bottom: 10px;">
        
        <label>ZIP Code:</label>
        <input type="text" value="${decryptData(creditCardData.zipCode) || 'N/A'}" readonly style="margin-bottom: 10px;">
        
        <label>Custom Field:</label>
        <input type="text" value="${decryptData(creditCardData.customField) || 'N/A'}" readonly style="margin-bottom: 10px;">
        
        <label>Notes:</label>
        <textarea readonly style="width: 100%; height: 100px;">${decryptData(creditCardData.notes) || 'N/A'}</textarea>
        
        ${fileUrl ? `<a href="${fileUrl}" target="_blank" style="margin-top: 10px; display: inline-block;">View File</a>` : ''}
    `;
    viewCreditCardModal.style.display = 'flex';
}


// Edit credit card function
function editCreditCard(creditCardData, creditCardKey) {
    document.getElementById('title').value = creditCardData.title || '';
    document.getElementById('cardholderName').value = decryptData(creditCardData.cardholderName) || '';
    document.getElementById('cardNumber').value = decryptData(creditCardData.cardNumber) || '';
    document.getElementById('expirationDate').value = decryptData(creditCardData.expirationDate) || '';
    document.getElementById('cvv').value = decryptData(creditCardData.cvv) || '';
    document.getElementById('cardPin').value = decryptData(creditCardData.cardPin) || '';
    document.getElementById('zipCode').value = decryptData(creditCardData.zipCode) || '';
    document.getElementById('customField').value = decryptData(creditCardData.customField) || '';
    document.getElementById('notes').value = decryptData(creditCardData.notes) || '';
    document.getElementById('requireMasterPassword').checked = creditCardData.requireMasterPassword || false;
    document.getElementById('creditCardKey').value = creditCardKey; // Set the key for editing
    addCreditCardModal.style.display = 'flex';
}

// Clear modal fields after saving
function clearModalFields() {
    document.getElementById('title').value = '';
    document.getElementById('cardholderName').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('expirationDate').value = '';
    document.getElementById('cvv').value = '';
    document.getElementById('cardPin').value = '';
    document.getElementById('zipCode').value = '';
    document.getElementById('customField').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('requireMasterPassword').checked = false;
    document.getElementById('creditCardKey').value = ''; // Clear the key
    document.getElementById('fileUpload').value = ''; // Reset the file input
}

// Function to decrypt data
function decryptData(encryptedData) {
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Replace with your actual secret key
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
