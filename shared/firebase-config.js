/**
 * Brain Training Games
 * Author: Cao Viet Hoang
 * Created: 2025
 */

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

            // Start room cleanup service after Firebase is initialized
            // This ensures empty rooms are cleaned up even if no one joins multiplayer
            startRoomCleanupService();
        } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            database = firebase.database();
            auth = firebase.auth();
            console.log('✅ Firebase already initialized');

            // Also start cleanup if Firebase was already initialized
            startRoomCleanupService();
        } else {
            console.warn('⚠️ Firebase SDK not loaded. Make sure to include Firebase scripts in HTML.');
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }

    return { database, auth };
}

/**
 * Start room cleanup service if available
 * This is called after Firebase is initialized to ensure empty rooms are cleaned up
 */
function startRoomCleanupService() {
    // Use setTimeout to ensure roomCleanup is loaded (it may be loaded after firebase-config)
    setTimeout(() => {
        if (typeof roomCleanup !== 'undefined' && database) {
            roomCleanup.startAutoCleanup();
            console.log('✅ Room cleanup service auto-started');
        }
    }, 100);
}

// Export database and auth references
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { database, auth, firebaseConfig };
}
