import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';
const db = getDatabase();

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


// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
        loadPasswords();
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
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Replace with your actual secret key
    const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
    return encryptedData;
}

savePasswordButton.addEventListener('click', () => {
    const siteName = document.getElementById('title').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const customField = document.getElementById('customField').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const requireMasterPassword = document.getElementById('requireMasterPassword').checked;

    const userId = auth.currentUser.uid;
    const passwordKey = document.getElementById('passwordKey').value; // Check if we're editing

    // Check existing passwords count if adding a new password (not editing)
    if (!passwordKey) {
        const passwordsRef = ref(db, 'Passwords/' + userId);
        get(passwordsRef).then((snapshot) => {
            const existingPasswordsCount = snapshot.exists() ? snapshot.val() : null;

            // Count the number of existing passwords if they exist
            const passwordCount = existingPasswordsCount ? Object.keys(existingPasswordsCount).length : 0;

            if (passwordCount >= 5) {
                alert('You can only save up to 5 passwords. Please delete some before adding new ones.');
                return; // Prevent further execution
            }

            // Proceed to save the password since it's a new entry and limit is not exceeded
            savePasswordData(passwordKey, siteName, username, password, websiteUrl, customField, notes, requireMasterPassword);
        }).catch((error) => {
            console.error('Error retrieving passwords:', error);
        });
    } else {
        // If editing, skip the password count check and directly save
        savePasswordData(passwordKey, siteName, username, password, websiteUrl, customField, notes, requireMasterPassword);
    }
});

// Function to handle saving password data to Firebase
function savePasswordData(passwordKey, siteName, username, password, websiteUrl, customField, notes, requireMasterPassword) {
    const userId = auth.currentUser.uid;
    const encryptedUsername = encryptData(username);
    const encryptedPassword = encryptData(password);
    const encryptedWebsiteUrl = encryptData(websiteUrl);
    const encryptedCustomField = encryptData(customField);
    const encryptedNotes = encryptData(notes);

    const passwordRef = passwordKey ? ref(db, 'Passwords/' + userId + '/' + passwordKey) : push(ref(db, 'Passwords/' + userId));

    set(passwordRef, {
        siteName: siteName || 'N/A',
        username: encryptedUsername || 'N/A',
        password: encryptedPassword || 'N/A',
        websiteUrl: encryptedWebsiteUrl || 'N/A',
        customField: encryptedCustomField || 'N/A',
        notes: encryptedNotes || 'N/A',
        requireMasterPassword: requireMasterPassword
    }).then(() => {
        alert('Password ' + (passwordKey ? 'updated' : 'saved') + ' successfully!');
        addPasswordModal.style.display = 'none';
        loadPasswords();
    }).catch((error) => {
        alert('Error saving password: ' + error.message);
    });
}




// Load saved passwords with search filter
function loadPasswords() {
    const userId = auth.currentUser.uid;
    const passwordsRef = ref(db, 'Passwords/' + userId);
    const searchQuery = searchInput.value.toLowerCase(); // Get the search query and convert to lowercase

    onValue(passwordsRef, (snapshot) => {
        passwordList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const passwordData = childSnapshot.val();
            const passwordKey = childSnapshot.key;

            // Filter passwords based on the search query
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
                    if (passwordData.requireMasterPassword) {
                        verifyMasterPassword(userId).then((isValid) => {
                            if (isValid) {
                                displayPassword(passwordData);
                            } else {
                                alert('Incorrect master password.');
                            }
                        }).catch((error) => {
                            alert('Error verifying master password: ' + error.message);
                        });
                    } else {
                        displayPassword(passwordData);
                    }
                });

                // Add event listener for editing password
                passwordItem.querySelector('.edit-password').addEventListener('click', () => {
                    if (passwordData.requireMasterPassword) {
                        verifyMasterPassword(userId).then((isValid) => {
                            if (isValid) {
                                editPassword(passwordData, passwordKey);
                            } else {
                                alert('Incorrect master password.');
                            }
                        }).catch((error) => {
                            alert('Error verifying master password: ' + error.message);
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
                
                                const itemData = {
                                    siteName: passwordData.siteName || 'N/A',
                                    username: passwordData.username || 'N/A',
                                    password: passwordData.password || 'N/A',
                                    websiteUrl: passwordData.websiteUrl || 'N/A',
                                    customField: passwordData.customField || 'N/A',
                                    notes: passwordData.notes || 'N/A',
                                    deletedAt: new Date().toISOString(),
                                };
                
                                set(trashRef, itemData).then(() => remove(passwordRef)).then(() => {
                                    alert('Password moved to Trash successfully!');
                                    loadPasswords();
                                }).catch((error) => {
                                    alert('Error deleting password: ' + error.message);
                                });
                            } else {
                                alert('Password does not exist.');
                            }
                        }).catch((error) => {
                            alert('Error retrieving password: ' + error.message);
                        });
                    }
                });

                // Add event listener for dropdown toggle
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
    `;
    viewPasswordModal.style.display = 'flex';
}

// Function to edit password
function editPassword(passwordData, passwordKey) {
    // Populate the modal fields with the current password data
    document.getElementById('title').value = passwordData.siteName || ''; // Include title (site name)
    document.getElementById('username').value = decryptData(passwordData.username);
    document.getElementById('password').value = decryptData(passwordData.password);
    document.getElementById('websiteUrl').value = decryptData(passwordData.websiteUrl);
    document.getElementById('customField').value = decryptData(passwordData.customField);
    document.getElementById('notes').value = decryptData(passwordData.notes);
    document.getElementById('requireMasterPassword').checked = passwordData.requireMasterPassword;

    // Set the passwordKey value so that the savePasswordButton knows we're editing an existing password
    document.getElementById('passwordKey').value = passwordKey;

    // Show the add password modal
    addPasswordModal.style.display = 'flex';
}



// Function to clear the modal fields
function clearModalFields() {
    document.getElementById('title').value = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('websiteUrl').value = '';
    document.getElementById('customField').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('requireMasterPassword').checked = false;
    document.getElementById('passwordKey').value = ''; // Clear the passwordKey for new entries
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


