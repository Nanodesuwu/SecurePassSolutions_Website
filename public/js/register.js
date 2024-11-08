import { auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Register with email and password
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

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
