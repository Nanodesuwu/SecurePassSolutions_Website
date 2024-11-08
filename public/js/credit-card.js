import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';
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

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
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
    const userId = auth.currentUser.uid; // Define userId here
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
    const creditCardKey = document.getElementById('creditCardKey').value;

    if (title || cardholderName || cardNumber) {
        const creditCardRef = ref(db, 'CreditCards/' + userId);

        // Check the current number of credit cards
        get(creditCardRef).then((snapshot) => {
            const creditCardCount = snapshot.exists() ? snapshot.size : 0;

            if (creditCardCount >= 5 && !creditCardKey) { // Only check for the count when adding a new credit card
                alert('You can only save up to 5 credit cards. Please delete some before adding new ones.');
                return; // Prevent saving if limit is reached
            }

            const encryptedCardholderName = encryptData(cardholderName);
            const encryptedCardNumber = encryptData(cardNumber);
            const encryptedExpirationDate = encryptData(expirationDate);
            const encryptedCvv = encryptData(cvv);
            const encryptedCardPin = encryptData(cardPin);
            const encryptedZipCode = encryptData(zipCode);
            const encryptedCustomField = encryptData(customField);
            const encryptedNotes = encryptData(notes);

            const creditCardRefToUse = creditCardKey ? ref(db, 'CreditCards/' + userId + '/' + creditCardKey) : push(creditCardRef);

            set(creditCardRefToUse, {
                title: title || 'N/A',
                cardholderName: encryptedCardholderName || 'N/A',
                cardNumber: encryptedCardNumber || 'N/A',
                expirationDate: encryptedExpirationDate || 'N/A',
                cvv: encryptedCvv || 'N/A',
                cardPin: encryptedCardPin || 'N/A',
                zipCode: encryptedZipCode || 'N/A',
                customField: encryptedCustomField || 'N/A',
                notes: encryptedNotes || 'N/A',
                requireMasterPassword: requireMasterPassword
            }).then(() => {
                alert('Credit card ' + (creditCardKey ? 'updated' : 'saved') + ' successfully!');
                addCreditCardModal.style.display = 'none';
                loadCreditCards(userId); // Pass userId to loadCreditCards
            }).catch((error) => {
                alert('Error saving credit card: ' + error.message);
            });
        }).catch((error) => {
            alert('Error retrieving credit card count: ' + error.message);
        });
    } else {
        alert('Please fill in at least one field to save the credit card.');
    }
});
// Load saved credit cards
function loadCreditCards() {
    const userId = auth.currentUser.uid;
    const creditCardsRef = ref(db, 'CreditCards/' + userId);
    const searchCreditCardInput = document.getElementById('searchCreditCard'); // Get the search input element

    onValue(creditCardsRef, (snapshot) => {
        creditCardList.innerHTML = ''; // Clear existing list

        // This function will be used to filter the displayed credit cards
        function filterCreditCards(searchTerm) {
            // Clear the current list before filtering
            creditCardList.innerHTML = '';

            snapshot.forEach((childSnapshot) => {
                const creditCardData = childSnapshot.val();
                const creditCardKey = childSnapshot.key;

                // Check if the title, cardholder name, or card number matches the search term
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

                    // Add event listener for viewing credit card
                    creditCardItem.querySelector('.view-credit-card').addEventListener('click', () => {
                        if (creditCardData.requireMasterPassword) {
                            verifyMasterPassword(userId).then((isValid) => {
                                if (isValid) {
                                    displayCreditCard(creditCardData);
                                } else {
                                    alert('Incorrect master password.');
                                }
                            }).catch((error) => {
                                alert('Error verifying master password: ' + error.message);
                            });
                        } else {
                            displayCreditCard(creditCardData);
                        }
                    });

                    // Add event listener for editing credit card
                    creditCardItem.querySelector('.edit-credit-card').addEventListener('click', () => {
                        if (creditCardData.requireMasterPassword) {
                            verifyMasterPassword(userId).then((isValid) => {
                                if (isValid) {
                                    editCreditCard(creditCardData, creditCardKey);
                                } else {
                                    alert('Incorrect master password.');
                                }
                            }).catch((error) => {
                                alert('Error verifying master password: ' + error.message);
                            });
                        } else {
                            editCreditCard(creditCardData, creditCardKey);
                        }
                    });

                    // Add event listener for deleting credit card
                    creditCardItem.querySelector('.delete-credit-card').addEventListener('click', () => {
                        const confirmDelete = confirm('Are you sure you want to delete this credit card?');
                        if (confirmDelete) {
                            const creditCardRef = ref(db, 'CreditCards/' + userId + '/' + creditCardKey);
                            const trashRef = ref(db, 'Trash/' + userId + '/CreditCards/' + creditCardKey); // Structured way to store in Trash

                            // Get the credit card data before deletion
                            get(creditCardRef).then((snapshot) => {
                                if (snapshot.exists()) {
                                    const creditCardData = snapshot.val();

                                    // Prepare the data to move to Trash, ensuring no undefined values
                                    const itemData = {
                                        title: creditCardData.title || 'N/A',
                                        cardholderName: creditCardData.cardholderName || 'N/A',
                                        cardNumber: creditCardData.cardNumber || 'N/A',
                                        expirationDate: creditCardData.expirationDate || 'N/A',
                                        cvv: creditCardData.cvv || 'N/A',
                                        cardPin: creditCardData.cardPin || 'N/A', // Include cardPin
                                        zipCode: creditCardData.zipCode || 'N/A', // Include zipCode
                                        customField: creditCardData.customField || 'N/A',
                                        notes: creditCardData.notes || 'N/A',
                                        deletedAt: new Date().toISOString(), // Optionally add a timestamp for deletion
                                    };

                                    // Store the itemData in the Trash
                                    set(trashRef, itemData).then(() => {
                                        // Now delete the original credit card entry
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
                    });

                    // Add event listener for dropdown toggle
                    const dropdownToggle = creditCardItem.querySelector('.dropdown-toggle');
                    const dropdownMenu = creditCardItem.querySelector('.dropdown-menu');
                    dropdownToggle.addEventListener('click', () => {
                        dropdownMenu.classList.toggle('show');
                    });
                }
            });
        }

        filterCreditCards(''); // Initially load all credit cards

        // Add event listener for the search input
        searchCreditCardInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterCreditCards(searchTerm);
        });
    });
}


// Function to display saved credit card details
function displayCreditCard(creditCardData) {
    viewCreditCardDetails.innerHTML = `
        <label>Cardholder Name:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(creditCardData.cardholderName) || 'N/A'}" readonly id="cardholderNameInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('cardholderNameInput')"></i>
        </div>
        <label>Card Number:</label>
        <div style="display: flex; align-items: center;">
            <input type="text" value="${decryptData(creditCardData.cardNumber) || 'N/A'}" readonly id="cardNumberInput">
            <i class="fas fa-copy" style="cursor: pointer; margin-left: 5px;" onclick="copyToClipboard('cardNumberInput')"></i>
        </div>
        <label>Expiration Date:</label>
        <input type="text" value="${decryptData(creditCardData.expirationDate) || 'N/A'}" readonly>
        <label>CVV:</label>
        <input type="text" value="${decryptData(creditCardData.cvv) || 'N/A'}" readonly>
        <label>Card Pin:</label>
        <input type="text" value="${decryptData(creditCardData.cardPin) || 'N/A'}" readonly>
        <label>Zip Code:</label>
        <input type="text" value="${decryptData(creditCardData.zipCode) || 'N/A'}" readonly>
        <label>Custom Field:</label>
        <input type="text" value="${decryptData(creditCardData.customField) || 'N/A'}" readonly>
        <label>Notes:</label>
        <textarea readonly>${decryptData(creditCardData.notes) || 'N/A'}</textarea>
    `;
    viewCreditCardModal.style.display = 'flex';
}

// Function to edit credit card
function editCreditCard(creditCardData, creditCardKey) {
    // Populate the modal fields with the current credit card data
    document.getElementById('title').value = creditCardData.title;
    document.getElementById('cardholderName').value = decryptData(creditCardData.cardholderName);
    document.getElementById('cardNumber').value = decryptData(creditCardData.cardNumber);
    document.getElementById('expirationDate').value = decryptData(creditCardData.expirationDate);
    document.getElementById('cvv').value = decryptData(creditCardData.cvv);
    document.getElementById('cardPin').value = decryptData(creditCardData.cardPin);
    document.getElementById('zipCode').value = decryptData(creditCardData.zipCode);
    document.getElementById('customField').value = decryptData(creditCardData.customField);
    document.getElementById('notes').value = decryptData(creditCardData.notes);
    document.getElementById('requireMasterPassword').checked = creditCardData.requireMasterPassword;

    // Set the creditCardKey value so that the saveCreditCardButton knows we're editing an existing credit card
    document.getElementById('creditCardKey').value = creditCardKey;

    // Show the add credit card modal
    addCreditCardModal.style.display = 'flex';
}

// Function to clear the modal fields
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
    document.getElementById('creditCardKey').value = ''; // Clear the creditCardKey for new entries
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
