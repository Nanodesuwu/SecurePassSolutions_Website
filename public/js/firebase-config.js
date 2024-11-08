import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJU9aBlYc_LoioUH4cHuJlM50Ulw9eI0s",
  authDomain: "pass-solution.firebaseapp.com",
  databaseURL: "https://pass-solution-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pass-solution",
  storageBucket: "pass-solution.appspot.com",
  messagingSenderId: "13094429807",
  appId: "1:13094429807:web:0462c4bedc11de877e999a",
  measurementId: "G-HK5TMVEE8D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
