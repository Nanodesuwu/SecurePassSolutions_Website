import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

const db = getDatabase();

// Fetch the QR code and secret
fetch('/generate-totp-secret', {
    method: 'POST'
}).then(response => response.json()).then(data => {
    document.getElementById('qrCodeImage').src = data.qrCodeUrl;
    document.getElementById('totpSecret').textContent = data.secret;

    // Save secret to localStorage or send it to your server for verification
    localStorage.setItem('totpSecret', data.secret);
}).catch(error => {
    console.error('Error fetching TOTP secret:', error);
    alert('Could not generate TOTP secret. Please try again.');
});

// Verify the 6-digit code
document.getElementById('verifyCodeButton').addEventListener('click', () => {
    const code = document.getElementById('totpCode').value;

    fetch('/verify-totp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, secret: localStorage.getItem('totpSecret') })
    }).then(response => response.json()).then(data => {
        if (data.verified) {
            alert('2FA setup successfully');
            const userId = auth.currentUser.uid; // Get the current user ID

            // Check premium status and expiration date
            const premiumRef = ref(db, `Account/${userId}/Premium`);
            get(premiumRef).then(snapshot => {
                if (snapshot.exists()) {
                    const premiumData = snapshot.val();
                    const expirationDate = new Date(premiumData.expiration);
                    const currentDate = new Date();

                    if (premiumData.status === true && expirationDate > currentDate) {
                        // User is still premium, redirect to premium home
                        window.location.href = 'premiumHome.html';
                    } else {
                        // Premium expired or user is not premium, update status and redirect to regular home
                        set(premiumRef, { status: false, expiration: null }).then(() => {
                            alert('Your premium subscription has expired. You have been downgraded to a normal user.');
                            window.location.href = 'home.html';
                        });
                    }
                } else {
                    // No premium status found, redirect to regular home
                    window.location.href = 'home.html';
                }
            }).catch(error => {
                console.error("Error fetching premium status:", error);
                alert("Could not check premium status. Please try again.");
            });
        } else {
            alert('Invalid code, please try again');
        }
    }).catch(error => {
        console.error('Error verifying TOTP code:', error);
        alert('Could not verify TOTP code. Please try again.');
    });
});
