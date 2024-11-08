import { auth } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const lengthSlider = document.getElementById('lengthSlider');
    const lengthValue = document.getElementById('lengthValue');
    const generateButton = document.getElementById('generateButton');
    const passwordDisplay = document.getElementById('generatedPassword');
    const regenerateIcon = document.getElementById('regenerateIcon');
    const logoutButton = document.getElementById('logoutButton');

    const includeUppercase = document.getElementById('includeUppercase');
    const includeNumbers = document.getElementById('includeNumbers');
    const includeSymbols = document.getElementById('includeSymbols');
    const typeOptions = document.getElementsByName('type');
    
    function generatePassword() {
        const length = lengthSlider.value;
        let charset = 'abcdefghijklmnopqrstuvwxyz';
        
        if (includeUppercase.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeNumbers.checked) charset += '0123456789';
        if (includeSymbols.checked) charset += '!@#$%^&*()_+{}[]';
        
        const type = Array.from(typeOptions).find(option => option.checked).value;

        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        passwordDisplay.textContent = password;
    }

    lengthSlider.addEventListener('input', () => {
        lengthValue.textContent = lengthSlider.value;
    });

    generateButton.addEventListener('click', generatePassword);
    regenerateIcon.addEventListener('click', generatePassword);
});



const logoutButton = document.getElementById('logoutButton');
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});