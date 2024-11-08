import { getDatabase, ref, set, push, onValue, remove, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';
const db = getDatabase();

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

// Master password requirement checkbox
const requireMasterPasswordCheckbox = document.getElementById('requireMasterPasswordCheckbox');

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
        loadPersonalInfo();
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

    const userId = auth.currentUser.uid;
    const infoKey = document.getElementById('infoKey').value;

    if (fullName || email || phone) {
        const personalInfoRef = ref(db, 'PersonalInfo/' + userId);

        // Check the number of existing personal info entries
        get(personalInfoRef).then((snapshot) => {
            const existingEntries = snapshot.size;

            if (existingEntries >= 5 && !infoKey) {
                alert('You can only have a maximum of 5 personal info entries. Please delete an existing entry before adding a new one.');
                return; // Exit if the limit is reached and no editing is taking place
            }

            const infoRef = infoKey ? ref(db, 'PersonalInfo/' + userId + '/' + infoKey) : push(personalInfoRef);

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
                notes: encryptData(notes)
            };

            set(infoRef, encryptedData).then(() => {
                alert('Personal Info ' + (infoKey ? 'updated' : 'saved') + ' successfully!');
                addInfoModal.style.display = 'none';
                loadPersonalInfo();
            }).catch((error) => {
                alert('Error saving personal info: ' + error.message);
            });
        }).catch((error) => {
            alert('Error retrieving personal info: ' + error.message);
        });
    } else {
        alert('Please fill in at least Full Name, Email or Phone to save the info.');
    }
});


// Load saved personal info
function loadPersonalInfo() {
    const userId = auth.currentUser.uid;
    const personalInfoRef = ref(db, 'PersonalInfo/' + userId);
    const searchInfoInput = document.getElementById('searchInfo'); // Get the search input element

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
                        displayInfo(infoData);
                    });

                    // Add event listener for editing personal info
                    infoItem.querySelector('.edit-info').addEventListener('click', () => {
                        editInfo(infoData, infoKey);
                    });

                    // Add event listener for deleting personal info
                    infoItem.querySelector('.delete-info').addEventListener('click', () => {
                        const confirmDelete = confirm('Are you sure you want to delete this info?');
                        if (confirmDelete) {
                            const personalInfoRef = ref(db, 'PersonalInfo/' + userId + '/' + infoKey);
                            const trashRef = ref(db, 'Trash/' + userId + '/PersonalInfo/' + infoKey); // Structured way to store in Trash

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
                                        deletedAt: new Date().toISOString(), // Optional: store the date of deletion
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
