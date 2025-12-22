/**
 * Google Analytics Integration
 * Centralized analytics configuration for Brain Training App
 */

(function() {
    'use strict';

    // Google Analytics Measurement ID
    const GA_MEASUREMENT_ID = 'G-94CCVZW2JR';

    /**
     * Initialize Google Analytics
     */
    function initializeGoogleAnalytics() {
        // Create and inject gtag.js script
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(gtagScript);

        // Initialize dataLayer and gtag function
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            window.dataLayer.push(arguments);
        }
        
        // Configure gtag
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID);

        // Make gtag globally available
        window.gtag = gtag;

        console.log('✓ Google Analytics initialized');
    }

    /**
     * Track custom events (optional utility function)
     * Example: trackEvent('game_start', { game_name: 'Math Game' });
     */
    window.trackEvent = function(eventName, eventParams = {}) {
        if (window.gtag) {
            window.gtag('event', eventName, eventParams);
        }
    };

    /**
     * Track page views (optional utility function)
     */
    window.trackPageView = function(pagePath) {
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_path: pagePath
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGoogleAnalytics);
    } else {
        initializeGoogleAnalytics();
    }
})();
