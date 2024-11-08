import { getDatabase, ref, set, push, onValue, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';
import { auth } from './firebase-config.js';
const db = getDatabase();
const storage = getStorage();

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

    return new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
            video.play();
            document.body.append(video);

            const results = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

            stream.getTracks().forEach(track => track.stop());
            video.remove();

            if (results) {
                resolve(true); // Face recognized
            } else {
                resolve(false); // No face recognized
            }
        };
    });
}

async function verifyFaceForNoteAction(action, noteData, noteKey) {
    const faceVerified = await startFacialRecognition();
    if (faceVerified) {
        action(noteData, noteKey); // Execute the action if the face is verified
    } else {
        alert('Face not recognized. Unable to proceed.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
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
    const fileInput = document.getElementById('fileInput');
    const uploadedFilesList = document.getElementById('uploadedFilesList');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
            await loadModels(); // Load facial recognition models
            loadNotes(); // Load notes after models are loaded
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
        const secretKey = 's3cur3Pa$$w0rdEncryp7ionK3y123456'; 
        const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString();
        return encryptedData;
    }

    // Save or Edit note to Firebase
saveNoteButton.addEventListener('click', async () => {
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const requireMasterPassword = document.getElementById('requireMasterPassword').checked;
    const requireFacialRecognition = document.getElementById('requireFacialRecognition').checked; 
    const userId = auth.currentUser.uid;
    const noteKey = document.getElementById('noteKey').value;

    let fileUrls = []; // Store uploaded file URLs

    if (fileInput.files.length > 0) {
        // Upload files and get URLs
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const fileRef = storageRef(storage, `uploads/${userId}/${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            fileUrls.push(downloadURL); // Add the file URL to the array
        }
    }

    if (title || content) {
        const encryptedContent = encryptData(content);
        const noteRef = noteKey ? ref(db, 'Securenotes/' + userId + '/' + noteKey) : push(ref(db, 'Securenotes/' + userId));

        set(noteRef, {
            title: title || 'Untitled',
            content: encryptedContent || 'No content',
            requireMasterPassword: requireMasterPassword,
            requireFacialRecognition: requireFacialRecognition, // Save the facial recognition property
            files: fileUrls // Store the file URLs with the note
        }).then(() => {
            alert('Note ' + (noteKey ? 'updated' : 'saved') + ' successfully!');
            addNoteModal.style.display = 'none';
            clearModalFields();
            loadNotes();
        }).catch((error) => {
            alert('Error saving note: ' + error.message);
        });
    } else {
        alert('Please fill in at least the title or content to save the note.');
    }
});


    // Function to display saved note details
    function displayNote(noteData) {
        viewNoteDetails.innerHTML = `
            <label>Title:</label>
            <div>${noteData.title || 'Untitled'}</div>
            <label>Content:</label>
            <textarea readonly>${decryptData(noteData.content) || 'No content'}</textarea>
            <label>Uploaded Files:</label>
            <div id="noteFiles"></div>
        `;
        
        // Display uploaded files
        const noteFilesDiv = document.getElementById('noteFiles');
        if (noteData.files && noteData.files.length > 0) {
            noteData.files.forEach(fileUrl => {
                const fileLink = document.createElement('a');
                fileLink.href = fileUrl;
                fileLink.target = '_blank';
                fileLink.textContent = 'View File';
                noteFilesDiv.appendChild(fileLink);
                noteFilesDiv.appendChild(document.createElement('br')); // Line break
            });
        }
        
        viewNoteModal.style.display = 'flex';
    }

   // Load saved notes
function loadNotes() {
    const userId = auth.currentUser.uid;
    const notesRef = ref(db, 'Securenotes/' + userId);
    const searchNoteInput = document.getElementById('searchNote');
    const recognitionStatus = document.getElementById('recognitionStatus');

    onValue(notesRef, (snapshot) => {
        noteList.innerHTML = ''; // Clear existing list

        function filterNotes(searchTerm) {
            noteList.innerHTML = ''; // Clear current list before filtering

            snapshot.forEach((childSnapshot) => {
                const noteData = childSnapshot.val();
                const noteKey = childSnapshot.key;

                // Check if the title matches the search term
                if (noteData.title.toLowerCase().includes(searchTerm)) {
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

                    // Helper function to run facial recognition if required
                    const executeWithFaceVerification = async (callback) => {
                        if (noteData.requireFacialRecognition) {
                            recognitionStatus.style.display = 'block';
                            recognitionStatus.innerText = 'Starting facial recognition...';
                            const isFaceVerified = await startFacialRecognition();
                            recognitionStatus.style.display = 'none';

                            if (isFaceVerified) {
                                callback();
                            } else {
                                alert('Face not recognized. Unable to proceed.');
                            }
                        } else {
                            callback();
                        }
                    };

                    // View note action
                    noteItem.querySelector('.view-note').addEventListener('click', () => {
                        const viewAction = () => {
                            if (noteData.requireMasterPassword) {
                                verifyMasterPassword(userId).then((isValid) => {
                                    if (isValid) displayNote(noteData);
                                    else alert('Incorrect master password.');
                                }).catch((error) => {
                                    alert('Error verifying master password: ' + error.message);
                                });
                            } else {
                                displayNote(noteData);
                            }
                        };
                        executeWithFaceVerification(viewAction);
                    });

                    // Edit note action
                    noteItem.querySelector('.edit-note').addEventListener('click', () => {
                        const editAction = () => {
                            if (noteData.requireMasterPassword) {
                                verifyMasterPassword(userId).then((isValid) => {
                                    if (isValid) editNote(noteData, noteKey);
                                    else alert('Incorrect master password.');
                                }).catch((error) => {
                                    alert('Error verifying master password: ' + error.message);
                                });
                            } else {
                                editNote(noteData, noteKey);
                            }
                        };
                        executeWithFaceVerification(editAction);
                    });

                    // Delete note action
                    noteItem.querySelector('.delete-note').addEventListener('click', () => {
                        const deleteAction = () => {
                            const confirmDelete = confirm('Are you sure you want to delete this note?');
                            if (confirmDelete) {
                                const noteRef = ref(db, 'Securenotes/' + userId + '/' + noteKey);
                                const trashRef = ref(db, 'Trash/' + userId + '/Securenotes/' + noteKey);

                                get(noteRef).then((snapshot) => {
                                    if (snapshot.exists()) {
                                        const noteData = snapshot.val();

                                        const itemData = {
                                            title: noteData.title,
                                            content: noteData.content,
                                            requireMasterPassword: noteData.requireMasterPassword,
                                            deletedAt: new Date().toISOString(),
                                        };

                                        set(trashRef, itemData).then(() => {
                                            return remove(noteRef);
                                        }).then(() => {
                                            alert('Note moved to Trash successfully!');
                                            loadNotes();
                                        }).catch((error) => {
                                            alert('Error deleting note: ' + error.message);
                                        });
                                    } else {
                                        alert('Note does not exist.');
                                    }
                                }).catch((error) => {
                                    alert('Error retrieving note: ' + error.message);
                                });
                            }
                        };
                        executeWithFaceVerification(deleteAction);
                    });

                    // Dropdown menu toggle
                    const dropdownToggle = noteItem.querySelector('.dropdown-toggle');
                    const dropdownMenu = noteItem.querySelector('.dropdown-menu');
                    dropdownToggle.addEventListener('click', () => {
                        dropdownMenu.classList.toggle('show');
                    });
                }
            });
        }

        filterNotes(''); // Initially load all notes

        // Search input event listener
        searchNoteInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterNotes(searchTerm);
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
        <label>Uploaded Files:</label>
        <div id="noteFiles"></div>
    `;

    // Display uploaded files
    const noteFilesDiv = document.getElementById('noteFiles');
    if (noteData.files && noteData.files.length > 0) {
        noteData.files.forEach(fileUrl => {
            const fileLink = document.createElement('a');
            fileLink.href = fileUrl;
            fileLink.target = '_blank'; // Open in new tab
            fileLink.textContent = 'View File'; // Link text
            noteFilesDiv.appendChild(fileLink);
            noteFilesDiv.appendChild(document.createElement('br')); // Line break for spacing
        });
    } else {
        noteFilesDiv.innerHTML = '<div>No files uploaded.</div>'; // Message if no files exist
    }

    viewNoteModal.style.display = 'flex'; // Show the modal
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
});
