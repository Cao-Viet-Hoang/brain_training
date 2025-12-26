/**
 * Firebase Configuration
 * Replace with your Firebase project credentials
 * 
 * To get your config:
 * 1. Go to https://console.firebase.google.com/
 * 2. Select your project (or create one)
 * 3. Go to Project Settings > General
 * 4. Scroll down to "Your apps" section
 * 5. Click on the Web app icon (</>)
 * 6. Copy the firebaseConfig object
 * 
*/

// ⚠️ NOTE: If you somehow stumbled upon this config, please just look but don't touch anything... pretty please? 🥺
const firebaseConfig = {
  apiKey: "AIzaSyBmpjcuOC6-HlssHqnr-LIdNIo7ORcnIcc",
  authDomain: "brain-training-1cd7e.firebaseapp.com",
  databaseURL: "https://brain-training-1cd7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brain-training-1cd7e",
  storageBucket: "brain-training-1cd7e.firebasestorage.app",
  messagingSenderId: "206395911746",
  appId: "1:206395911746:web:a43be644c70fc6aa37c7db"
};

// Initialize Firebase (only once)
let database = null;
let auth = null;

// Don't auto-initialize - let multiplayer code initialize when needed
// This prevents unnecessary Firebase connections in single-player mode
function initFirebase() {
    if (database && auth) {
        console.log('✅ Firebase already initialized');
        return { database, auth };
    }

    try {
        if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            auth = firebase.auth();
            console.log('✅ Firebase initialized successfully');
        } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            database = firebase.database();
            auth = firebase.auth();
            console.log('✅ Firebase already initialized');
        } else {
            console.warn('⚠️ Firebase SDK not loaded. Make sure to include Firebase scripts in HTML.');
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }

    return { database, auth };
}

// Export database and auth references
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { database, auth, firebaseConfig };
}
