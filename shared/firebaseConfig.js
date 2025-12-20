// ============================================================================
// FIREBASE CONFIGURATION
// Replace with your Firebase project configuration
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBmpjcuOC6-HlssHqnr-LIdNIo7ORcnIcc",
  authDomain: "brain-training-1cd7e.firebaseapp.com",
  databaseURL: "https://brain-training-1cd7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brain-training-1cd7e",
  storageBucket: "brain-training-1cd7e.firebasestorage.app",
  messagingSenderId: "206395911746",
  appId: "1:206395911746:web:a43be644c70fc6aa37c7db"
};

// Export configuration
if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
}
