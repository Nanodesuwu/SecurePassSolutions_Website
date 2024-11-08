import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';
const db = getDatabase();

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements after DOM is fully loaded
    const addNoteButton = document.getElementById('addNoteButton');
    const logoutButton = document.getElementById('logoutButton');
    const saveNoteButton = document.getElementById('saveNoteButton');
    const closeModalButton = document.getElementById('closeModal');
    const addNoteModal = document.getElementById('addNoteModal');
    const noteList = document.getElementById('noteList');
    const welcomeMessage = document.querySelector('.top-bar h1');
    const viewNoteModal = document.getElementById('viewNoteModal');
    const closeViewModalButton = document.getElementById('closeViewModal');
    const viewNoteDetails = document.getElementById('viewNoteDetails');

    // Check authentication state on page load
    auth.onAuthStateChanged((user) => {
        if (user) {
            welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
            loadNotes();
        } else {
            window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
        }
    });

    // Show modal for adding note
    addNoteButton.addEventListener('click', () => {
        clearModalFields();
        addNoteModal.style.display = 'flex';
    });

    // Close modal for adding note
    closeModalButton.addEventListener('click', () => {
        addNoteModal.style.display = 'none';
    });

    // Close modal for viewing note
    closeViewModalButton.addEventListener('click', () => {
        viewNoteModal.style.display = 'none';
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
        const secretKey = 'your-secret-key'; // Replace with your actual secret key
        const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
        return encryptedData;
    }

    // Save or Edit note to Firebase
    saveNoteButton.addEventListener('click', () => {
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        const requireMasterPassword = document.getElementById('requireMasterPassword').checked;

        const userId = auth.currentUser.uid;
        const noteKey = document.getElementById('noteKey').value;

        if (title || content) {
            const encryptedContent = encryptData(content);

            const noteRef = noteKey ? ref(db, 'Securenotes/' + userId + '/' + noteKey) : push(ref(db, 'Securenotes/' + userId));

            set(noteRef, {
                title: title || 'Untitled',
                content: encryptedContent || 'No content',
                requireMasterPassword: requireMasterPassword
            }).then(() => {
                alert('Note ' + (noteKey ? 'updated' : 'saved') + ' successfully!');
                addNoteModal.style.display = 'none';
                loadNotes();
            }).catch((error) => {
                alert('Error saving note: ' + error.message);
            });
        } else {
            alert('Please fill in at least the title or content to save the note.');
        }
    });

    // Load saved notes
    function loadNotes() {
        const userId = auth.currentUser.uid;
        const notesRef = ref(db, 'Securenotes/' + userId);

        onValue(notesRef, (snapshot) => {
            noteList.innerHTML = '';
            snapshot.forEach((childSnapshot) => {
                const noteData = childSnapshot.val();
                const noteKey = childSnapshot.key;

                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                noteItem.innerHTML = `
                    <div class="note-title">${noteData.title}</div>
                    <button class="view-note">View</button>
                    <div class="dropdown">
                        <button class="dropdown-toggle">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <button class="edit-note" data-key="${noteKey}">Edit</button>
                            <button class="delete-note" data-key="${noteKey}">Delete</button>
                        </div>
                    </div>
                `;
                noteList.appendChild(noteItem);

                // Add event listener for viewing note
                noteItem.querySelector('.view-note').addEventListener('click', () => {
                    if (noteData.requireMasterPassword) {
                        verifyMasterPassword(userId).then((isValid) => {
                            if (isValid) {
                                displayNote(noteData);
                            } else {
                                alert('Incorrect master password.');
                            }
                        }).catch((error) => {
                            alert('Error verifying master password: ' + error.message);
                        });
                    } else {
                        displayNote(noteData);
                    }
                });

                // Add event listener for editing note
                noteItem.querySelector('.edit-note').addEventListener('click', () => {
                    if (noteData.requireMasterPassword) {
                        verifyMasterPassword(userId).then((isValid) => {
                            if (isValid) {
                                editNote(noteData, noteKey);
                            } else {
                                alert('Incorrect master password.');
                            }
                        }).catch((error) => {
                            alert('Error verifying master password: ' + error.message);
                        });
                    } else {
                        editNote(noteData, noteKey);
                    }
                });

                // Add event listener for deleting note
                noteItem.querySelector('.delete-note').addEventListener('click', () => {
                    const confirmDelete = confirm('Are you sure you want to delete this note?');
                    if (confirmDelete) {
                        remove(ref(db, 'Securenotes/' + userId + '/' + noteKey)).then(() => {
                            alert('Note deleted successfully!');
                        }).catch((error) => {
                            alert('Error deleting note: ' + error.message);
                        });
                    }
                });

                // Add event listener for dropdown toggle
                const dropdownToggle = noteItem.querySelector('.dropdown-toggle');
                const dropdownMenu = noteItem.querySelector('.dropdown-menu');
                dropdownToggle.addEventListener('click', () => {
                    dropdownMenu.classList.toggle('show');
                });
            });
        });
    }

    // Function to display saved note details
    function displayNote(noteData) {
        viewNoteDetails.innerHTML = `
            <label>Title:</label>
            <div>${noteData.title || 'Untitled'}</div>
            <label>Content:</label>
            <textarea readonly>${decryptData(noteData.content) || 'No content'}</textarea>
        `;
        viewNoteModal.style.display = 'flex';
    }

    // Function to edit note
    function editNote(noteData, noteKey) {
        // Populate the modal fields with the current note data
        document.getElementById('title').value = noteData.title;
        document.getElementById('content').value = decryptData(noteData.content);
        document.getElementById('requireMasterPassword').checked = noteData.requireMasterPassword;

        // Set the noteKey value so that the saveNoteButton knows we're editing an existing note
        document.getElementById('noteKey').value = noteKey;

        // Show the add note modal
        addNoteModal.style.display = 'flex';
    }

    // Function to clear the modal fields
    function clearModalFields() {
        const title = document.getElementById('title');
        const content = document.getElementById('content');
        const noteKey = document.getElementById('noteKey');
        
        if (title) title.value = '';
        if (content) content.value = '';
        if (noteKey) noteKey.value = '';
    }

    // Function to decrypt data
    function decryptData(encryptedData) {
        const secretKey = 'your-secret-key'; // Replace with your actual secret key
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
});
