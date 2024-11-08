import { auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Function to validate the password
function validatePassword(password) {
    const minLength = 7; // Minimum length
    const hasUpperCase = /[A-Z]/.test(password); // At least one uppercase letter
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password); // At least one special character

    return password.length >= minLength && hasUpperCase && hasSpecialChar;
}

// Register with email and password
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate the password
    if (!validatePassword(password)) {
        alert('Your password must be at least 7 characters long, contain at least one uppercase letter, and include at least one special character.');
        return; // Stop registration if password is not valid
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Send user data to the server to store in Realtime Database
            fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    name: document.getElementById('name').value || 'Unnamed'
                })
            })
            .then(response => response.json())
            .then(data => {
                alert('User registered successfully');
                window.location.href = 'index.html'; // Redirect to index.html after registration
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert('Error: ' + errorMessage);
        });
});

// Register with Google
document.getElementById('googleRegister').addEventListener('click', function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;

            // Send user data to the server to store in Realtime Database
            fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    name: user.displayName || 'Unnamed'
                })
            })
            .then(response => response.json())
            .then(data => {
                alert('User registered with Google successfully');
                window.location.href = 'index.html'; // Redirect to index.html after registration
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert('Error: ' + errorMessage);
        });
});
