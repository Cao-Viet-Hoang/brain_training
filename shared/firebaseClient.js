// ============================================================================
// FIREBASE CLIENT SDK
// Handles Firebase initialization and anonymous authentication
// ============================================================================

class FirebaseClient {
    constructor() {
        this.app = null;
        this.auth = null;
        this.database = null;
        this.currentUser = null;
        this.initialized = false;
    }

    /**
     * Initialize Firebase with configuration
     * @param {Object} config - Firebase configuration object
     * @returns {Promise<boolean>} - Success status
     */
    async initialize(config) {
        if (this.initialized) {
            console.warn('Firebase already initialized');
            return true;
        }

        try {
            // Initialize Firebase
            this.app = firebase.initializeApp(config);
            this.auth = firebase.auth();
            this.database = firebase.database();

            console.log('Firebase initialized successfully');
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            throw new Error(`Firebase initialization failed: ${error.message}`);
        }
    }

    /**
     * Sign in anonymously
     * @param {string} displayName - Optional display name for the user
     * @returns {Promise<Object>} - User object with uid and displayName
     */
    async signInAnonymously(displayName = null) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized. Call initialize() first.');
        }

        try {
            // Check if already signed in
            if (this.auth.currentUser) {
                this.currentUser = {
                    uid: this.auth.currentUser.uid,
                    displayName: displayName || this.generateDisplayName(),
                    isAnonymous: true
                };
                console.log('Already signed in:', this.currentUser);
                return this.currentUser;
            }

            // Sign in anonymously
            const result = await this.auth.signInAnonymously();
            
            this.currentUser = {
                uid: result.user.uid,
                displayName: displayName || this.generateDisplayName(),
                isAnonymous: true
            };

            console.log('Anonymous sign-in successful:', this.currentUser);
            return this.currentUser;
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Generate a random display name
     * @returns {string} - Random display name
     */
    generateDisplayName() {
        const adjectives = ['Quick', 'Smart', 'Bright', 'Sharp', 'Clever', 'Wise', 'Swift', 'Bold'];
        const nouns = ['Fox', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'Lion', 'Hawk', 'Owl'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 100);
        return `${adj}${noun}${num}`;
    }

    /**
     * Get current user
     * @returns {Object|null} - Current user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get Firebase database reference
     * @returns {firebase.database.Reference} - Database reference
     */
    getDatabaseRef() {
        if (!this.initialized || !this.database) {
            throw new Error('Firebase database not initialized');
        }
        return this.database.ref();
    }

    /**
     * Get Firebase auth instance
     * @returns {firebase.auth.Auth} - Auth instance
     */
    getAuth() {
        if (!this.initialized || !this.auth) {
            throw new Error('Firebase auth not initialized');
        }
        return this.auth;
    }

    /**
     * Sign out current user
     * @returns {Promise<void>}
     */
    async signOut() {
        if (!this.auth) {
            return;
        }

        try {
            await this.auth.signOut();
            this.currentUser = null;
            console.log('Signed out successfully');
        } catch (error) {
            console.error('Sign out failed:', error);
            throw new Error(`Sign out failed: ${error.message}`);
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null && this.auth.currentUser !== null;
    }
}

// Export singleton instance
const firebaseClient = new FirebaseClient();

// Make it available globally for easy access
if (typeof window !== 'undefined') {
    window.firebaseClient = firebaseClient;
}
