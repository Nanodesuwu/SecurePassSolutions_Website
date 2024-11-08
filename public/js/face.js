// Import necessary Firebase functions
import { getDatabase, ref, set, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { auth } from './firebase-config.js';

// Initialize Firebase database
const db = getDatabase();

// Elements for video and buttons
const video = document.getElementById('video');
const captureButton = document.getElementById('captureButton');
const recognizeButton = document.getElementById('recognizeButton');
const resetButton = document.getElementById('resetButton');
const status = document.getElementById('status');
const warning = document.getElementById('warning');
const agreeButton = document.getElementById('agreeButton'); 
const logoutButton = document.getElementById('logoutButton');

// Set up camera to access webcam stream
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = 'block'; // Show the video feed
}

// Load face-api.js models
async function loadModels() {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
    console.log('Models loaded successfully');
}

// Show warning message and set up the camera
async function startCamera() {
    warning.style.display = 'block'; // Show the warning
    await setupCamera();
    await loadModels();
    agreeButton.style.display = 'none'; // Hide the agree button
    captureButton.style.display = 'block'; // Show the capture button
    recognizeButton.style.display = 'block'; // Show the recognize button
    resetButton.style.display = 'block'; // Show the reset button
}

// Capture and save face descriptor to Firebase
async function captureFace() {
    const userId = auth.currentUser.uid;
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();

    if (detections.length > 0) {
        const faceDescriptor = detections[0].descriptor;

        const faceDataRef = ref(db, 'FacialRecognition/' + userId);
        await set(faceDataRef, { descriptor: Array.from(faceDescriptor) });
        status.innerText = 'Face data saved successfully!';
        console.log('Face descriptor saved:', faceDescriptor);
    } else {
        status.innerText = 'No face detected. Please try again.';
        console.log('No face detected');
    }
}

// Recognize face by comparing with saved descriptor in Firebase
async function recognizeFace() {
    const userId = auth.currentUser.uid;
    const faceDataRef = ref(db, 'FacialRecognition/' + userId);

    const snapshot = await get(faceDataRef);
    if (snapshot.exists()) {
        const storedFaceData = new Float32Array(snapshot.val().descriptor);

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        if (detections.length > 0) {
            const labeledFaceDescriptors = [new faceapi.LabeledFaceDescriptors(userId, [storedFaceData])];
            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

            const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
            if (bestMatch.label === userId) {
                status.innerText = 'Face recognized successfully!';
                console.log('Face recognized!');
            } else {
                status.innerText = 'Face not recognized.';
                console.log('Face not recognized:', bestMatch);
            }
        } else {
            status.innerText = 'No face detected. Please try again.';
            console.log('No face detected during recognition');
        }
    } else {
        status.innerText = 'No face data found. Please capture your face first.';
        console.log('No face data found in Firebase');
    }
}

// Reset facial recognition data from Firebase
async function resetFaceData() {
    const userId = auth.currentUser.uid;
    const faceDataRef = ref(db, 'FacialRecognition/' + userId);

    await remove(faceDataRef)
        .then(() => {
            status.innerText = 'Facial recognition data deleted successfully. You can re-register your face.';
            console.log('Facial recognition data deleted for user:', userId);
        })
        .catch((error) => {
            status.innerText = 'Error deleting facial recognition data: ' + error.message;
            console.error('Error deleting facial recognition data:', error);
        });
}

// Add event listeners for agreeing to use the camera, capturing, recognizing, and resetting faces
agreeButton.addEventListener('click', startCamera); // Start camera on button click
captureButton.addEventListener('click', captureFace);
recognizeButton.addEventListener('click', recognizeFace);
resetButton.addEventListener('click', resetFaceData);

// Hide video and other buttons initially
video.style.display = 'none'; // Initially hide the video
captureButton.style.display = 'none'; // Hide the capture button
recognizeButton.style.display = 'none'; // Hide the recognize button
resetButton.style.display = 'none'; // Hide the reset button


// Logout user
logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html'; // Redirect to login page after logout
    }).catch((error) => {
        alert('Error: ' + error.message);
    });
});