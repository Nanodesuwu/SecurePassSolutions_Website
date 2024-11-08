import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const db = getDatabase();

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userId = user.uid;
            const personalInfoRef = ref(db, 'PersonalInfo/' + userId);

            // Function to fetch and display saved information
            function displaySavedInformation() {
                get(personalInfoRef).then((snapshot) => {
                    const savedInfoList = document.getElementById('savedPersonalInfoList');
                    savedInfoList.innerHTML = ''; // Clear existing content

                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        savedInfoList.innerHTML = `
                            <div class="saved-info-item"><strong>Full Name:</strong> ${data.fullName || ''}</div>
                            <div class="saved-info-item"><strong>Email:</strong> ${data.email || ''}</div>
                            <div class="saved-info-item"><strong>Phone Number:</strong> ${data.phoneNumber || ''}</div>
                            <div class="saved-info-item"><strong>Address:</strong> ${data.address || ''}</div>
                        `;
                    } else {
                        savedInfoList.innerHTML = '<p>No personal information saved yet.</p>';
                    }
                }).catch((error) => {
                    alert('Error loading personal information: ' + error.message);
                });
            }

            // Call the function to display saved information on load
            displaySavedInformation();

            // Add event listener for the save button in the modal
            document.getElementById('savePersonalInfoButton').addEventListener('click', () => {
                const newData = {
                    fullName: document.getElementById('fullName').value,
                    email: document.getElementById('email').value,
                    phoneNumber: document.getElementById('phoneNumber').value,
                    address: document.getElementById('address').value
                };

                set(personalInfoRef, newData).then(() => {
                    alert('Personal information saved successfully!');
                    displaySavedInformation(); // Refresh the displayed information
                    closeModal(); // Close the modal after saving
                }).catch((error) => {
                    alert('Error saving personal information: ' + error.message);
                });
            });

        } else {
            alert("User not authenticated.");
        }
    });
});
