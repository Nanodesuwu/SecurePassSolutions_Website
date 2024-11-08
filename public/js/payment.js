import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();

// Get references to elements
const submitPaymentButton = document.getElementById('submitPayment');
const cardholderNameInput = document.getElementById('cardholderName');
const cardNumberInput = document.getElementById('cardNumber');
const expiryDateInput = document.getElementById('expiryDate');
const cvvInput = document.getElementById('cvv');
const welcomeMessage = document.querySelector('.top-bar h1');

// Check authentication state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        welcomeMessage.innerText = `Welcome, ${user.displayName || 'User'}!`;
    } else {
        window.location.href = 'index.html'; // Redirect to login page if user is not authenticated
    }
});

// Function to mark user as premium with expiration
function markUserAsPremium(userId) {
    const premiumRef = ref(db, `Account/${userId}/Premium`);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); 

    return set(premiumRef, {
        status: true,
        expiration: expirationDate.toISOString()
    });
}

// Handle form submission for payment
submitPaymentButton.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission

    const cardholderName = cardholderNameInput.value.trim();
    const cardNumber = cardNumberInput.value.trim();
    const expiryDate = expiryDateInput.value.trim();
    const cvv = cvvInput.value.trim();

    // Here you should validate the card details with your payment processing API
    if (cardholderName && cardNumber && expiryDate && cvv) {
        const userId = auth.currentUser.uid;

        // Mark the user as premium with expiration date in the database
        markUserAsPremium(userId)
            .then(() => {
                alert("You are now a premium user!");
                window.location.href = "premiumHome.html"; // Redirect to home page or another page
            })
            .catch((error) => {
                console.error("Error marking user as premium:", error);
                alert("There was an error processing your payment. Please try again.");
            });
    } else {
        alert('Please fill in all payment details.');
    }
});

