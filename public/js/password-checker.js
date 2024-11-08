import { auth } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('checkPasswordButton').addEventListener('click', function() {
        const password = document.getElementById('passwordInput').value;
        const feedbackText = document.getElementById('feedbackText');
        const strengthIndicator = document.getElementById('strengthIndicator');
        const feedbackIcon = document.getElementById('feedbackIcon');
        const logoutButton = document.getElementById('logoutButton');

        let strength = 0;

        // Check password length
        if (password.length >= 8) {
            strength += 25;
        }

        // Check for uppercase letters
        if (/[A-Z]/.test(password)) {
            strength += 25;
        }

        // Check for numbers
        if (/\d/.test(password)) {
            strength += 25;
        }

        // Check for special characters
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            strength += 25;
        }

        // Update the strength bar
        strengthIndicator.style.width = `${strength}%`;

        // Provide feedback
        if (strength === 100) {
            feedbackText.textContent = 'Strong password!';
            strengthIndicator.style.backgroundColor = '#10B981'; // Green
            feedbackIcon.classList.remove('hidden');
        } else if (strength >= 50) {
            feedbackText.textContent = 'Moderate password.';
            strengthIndicator.style.backgroundColor = '#FBBF24'; // Yellow
            feedbackIcon.classList.add('hidden');
        } else {
            feedbackText.textContent = 'Weak password.';
            strengthIndicator.style.backgroundColor = '#EF4444'; // Red
            feedbackIcon.classList.add('hidden');
        }
    });
});


const logoutButton = document.getElementById('logoutButton');
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});

