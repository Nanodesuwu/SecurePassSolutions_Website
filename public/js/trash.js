import { getDatabase, ref, onValue, remove, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();

// Get references to elements
const trashList = document.getElementById('trashList'); // Element to display trash items
const viewTrashItemModal = document.getElementById('viewTrashItemModal');
const closeViewTrashModalButton = document.getElementById('closeViewTrashModal');
const viewTrashItemDetails = document.getElementById('viewTrashItemDetails');
const logoutButton = document.getElementById('logoutButton');


// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        loadTrashItems();
    } else {
        window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
    }
});
// Get the clear trash button reference
const clearTrashButton = document.getElementById('clearTrashButton');

// Clear trash items on button click
clearTrashButton.addEventListener('click', () => {
    const confirmClear = confirm("Are you sure you want to clear all items from the trash?");
    if (confirmClear) {
        clearTrashItems();
    }
});

// Close modal for viewing trash item
closeViewTrashModalButton.addEventListener('click', () => {
    viewTrashItemModal.style.display = 'none';
});

// Load deleted items from Trash
function loadTrashItems() {
    const userId = auth.currentUser.uid;
    const creditCardTrashRef = ref(db, 'Trash/' + userId + '/CreditCards');
    const personalInfoTrashRef = ref(db, 'Trash/' + userId + '/PersonalInfo');
    const passwordTrashRef = ref(db, 'Trash/' + userId + '/Passwords');
    const secureNotesTrashRef = ref(db, 'Trash/' + userId + '/Securenotes'); // Reference for secure notes trash

    // Clear current trash list
    trashList.innerHTML = '';

    // Load credit card trash items
    onValue(creditCardTrashRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const trashData = childSnapshot.val();
            const trashKey = childSnapshot.key;

            const trashItem = createTrashItem('Credit Card', trashData, trashKey);
            trashList.appendChild(trashItem);
        });
    });

    // Load personal info trash items
    onValue(personalInfoTrashRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const trashData = childSnapshot.val();
            const trashKey = childSnapshot.key;

            const trashItem = createTrashItem('Personal Info', trashData, trashKey);
            trashList.appendChild(trashItem);
        });
    });

    // Load password trash items
    onValue(passwordTrashRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const trashData = childSnapshot.val();
            const trashKey = childSnapshot.key;

            const trashItem = createTrashItem('Password', trashData, trashKey);
            trashList.appendChild(trashItem);
        });
    });

    // Load secure notes trash items
    onValue(secureNotesTrashRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const trashData = childSnapshot.val();
            const trashKey = childSnapshot.key;

            const trashItem = createTrashItem('Secure Note', trashData, trashKey);
            trashList.appendChild(trashItem);
        });
    });
}

// Create a trash item element
function createTrashItem(type, itemData, trashKey) {
    const trashItem = document.createElement('div');
    trashItem.className = 'trash-item';
    trashItem.style.display = 'flex'; // Set display to flex
    trashItem.style.justifyContent = 'space-between'; // Space items evenly
    trashItem.style.alignItems = 'center'; // Center items vertically
    trashItem.style.padding = '10px'; // Add padding for better spacing
    trashItem.style.border = '1px solid #ccc'; // Add a border for separation
    trashItem.style.marginBottom = '10px'; // Add margin between items
    
    // Decrypt data only for display
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

    trashItem.innerHTML = `
        <div class="trash-title" style="flex: 1;">${type}: ${displayTitle}</div>
        <div style="display: flex; gap: 5px;">
            <button class="view-trash-item">View</button>
            <button class="restore-trash-item" data-key="${trashKey}">Restore</button>
            <button class="delete-permanently" data-key="${trashKey}">Delete Permanently</button>
        </div>
    `;

    // Add event listener for viewing trash item
    trashItem.querySelector('.view-trash-item').addEventListener('click', () => {
        displayTrashItem(type, itemData, trashKey);
    });

    // Add event listener for restoring trash item
    trashItem.querySelector('.restore-trash-item').addEventListener('click', () => {
        restoreTrashItem(trashKey, itemData, type);
    });

    // Add event listener for permanently deleting trash item
    trashItem.querySelector('.delete-permanently').addEventListener('click', () => {
        const confirmDelete = confirm("Are you sure you want to delete this item permanently?");
        if (confirmDelete) {
            deleteTrashItem(trashKey, type);
        }
    });

    return trashItem;
}

// Function to display deleted item details in modal
function displayTrashItem(type, itemData, trashKey) {
    let decryptedData;

    // Decrypt and display item details based on type
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
            requireMasterPassword: itemData.requireMasterPassword ? decryptData(itemData.requireMasterPassword) : 'No',
        };
    }

    // Display decrypted details in modal
    viewTrashItemDetails.innerHTML = generateDetailsHTML(type, decryptedData);
    viewTrashItemModal.style.display = 'flex';
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
    const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; // Ensure this matches your encryption setup
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, secretKey).toString(CryptoJS.enc.Utf8);
    return decryptedData;
}

// Restore a deleted item
function restoreTrashItem(trashKey, itemData, type) {
    const userId = auth.currentUser.uid;

    // Determine the correct path based on item type
    let restoreRef;
    if (type === 'Credit Card') {
        restoreRef = ref(db, 'CreditCards/' + userId + '/' + trashKey);
    } else if (type === 'Personal Info') {
        restoreRef = ref(db, 'PersonalInfo/' + userId + '/' + trashKey);
    } else if (type === 'Password') {
        restoreRef = ref(db, 'Passwords/' + userId + '/' + trashKey);
    } else if (type === 'Secure Note') {
        restoreRef = ref(db, 'Securenotes/' + userId + '/' + trashKey); 
    }

    // Restore the item
    set(restoreRef, itemData)
        .then(() => {
            console.log("Item restored successfully.");
            alert("Item restored successfully and Item deleted from trash successfully!"); // Alert for successful restoration
            // Remove from Trash after restoring
            return deleteTrashItem(trashKey, type); // Ensure deleteTrashItem returns a promise
        })
        .then(() => {
            console.log("Item deleted from trash successfully.");
        })
        .catch((error) => {
            console.error("Error restoring item:", error);
        });
}

// Permanently delete an item from trash
function deleteTrashItem(trashKey, type) {
    const userId = auth.currentUser.uid; // Get the current user's ID
    const trashRef = ref(db, 'Trash/' + userId + '/' + type + '/' + trashKey); // Reference to the trash item

    console.log(`Attempting to delete item at: ${trashRef.toString()}`); // Log the path for debugging

    return remove(trashRef) // Return the promise from remove()
        .then(() => {
            console.log("Item deleted from trash successfully.");
            alert("Item deleted from trash successfully!"); // Alert for successful deletion
        })
        .catch((error) => {
            console.error("Error deleting item:", error);
            alert("Failed to delete the item. Please try again."); // Alert for deletion failure
        });
}

// Function to clear all trash items
function clearTrashItems() {
    const userId = auth.currentUser.uid; // Get the current user's ID
    const trashRef = ref(db, 'Trash/' + userId); // Reference to the user's trash

    remove(trashRef).then(() => {
        console.log("All trash items cleared.");
        loadTrashItems(); // Reload trash items after clearing
    }).catch((error) => {
        console.error("Error clearing trash items:", error);
    });
}


// Logout user
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});