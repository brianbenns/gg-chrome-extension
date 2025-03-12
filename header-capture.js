// Function to inspect window object for token-related items
function inspectForTokens() {
    // List of potential token-related properties
    const tokenKeys = ['token', 'auth', 'jwt', 'bearer', 'oauth'];
    const foundTokens = {};

    // Search through localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (tokenKeys.some(tk => key.toLowerCase().includes(tk))) {
            foundTokens[`localStorage.${key}`] = localStorage.getItem(key);
        }
    }

    // Search through sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (tokenKeys.some(tk => key.toLowerCase().includes(tk))) {
            foundTokens[`sessionStorage.${key}`] = sessionStorage.getItem(key);
        }
    }

    // Look for global variables and functions
    Object.keys(window).forEach(key => {
        if (tokenKeys.some(tk => key.toLowerCase().includes(tk))) {
            try {
                const value = window[key];
                if (typeof value === 'string' || typeof value === 'function') {
                    foundTokens[`window.${key}`] = String(value);
                }
            } catch (e) {
                // Ignore errors from accessing certain properties
            }
        }
    });

    // Send found tokens back to content script
    window.postMessage({
        type: 'FOUND_TOKENS',
        tokens: foundTokens
    }, '*');
}

// Store the original fetch
const originalFetch = window.fetch;

// Override fetch to capture headers and inspect response
window.fetch = async function(...args) {
    const request = args[0];
    const options = args[1] || {};
    
    // Capture all authorization headers for analysis
    const authHeader = options.headers?.authorization;
    if (authHeader) {
        window.postMessage({
            type: 'CAPTURED_AUTH_HEADER',
            authHeader: authHeader,
            url: typeof request === 'string' ? request : request.url
        }, '*');
    }
    
    // Call the original fetch
    const response = await originalFetch.apply(this, args);
    
    // Clone the response so we can inspect it
    const clone = response.clone();
    
    // If it's a JSON response, inspect it for tokens
    if (response.headers.get('content-type')?.includes('application/json')) {
        clone.json().then(data => {
            // Look for token-like fields in the response
            const tokenFields = findTokensInObject(data);
            if (Object.keys(tokenFields).length > 0) {
                window.postMessage({
                    type: 'FOUND_RESPONSE_TOKENS',
                    tokens: tokenFields,
                    url: typeof request === 'string' ? request : request.url
                }, '*');
            }
        }).catch(() => {});
    }
    
    return response;
};

// Helper function to recursively search for tokens in objects
function findTokensInObject(obj, path = '', results = {}) {
    if (!obj || typeof obj !== 'object') return results;
    
    Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string' && 
            (key.toLowerCase().includes('token') || 
             key.toLowerCase().includes('auth') || 
             key.toLowerCase().includes('jwt') ||
             (typeof value === 'string' && value.startsWith('eyJ')))) {
            results[currentPath] = value;
        } else if (typeof value === 'object' && value !== null) {
            findTokensInObject(value, currentPath, results);
        }
    });
    
    return results;
}

// Run the initial inspection
inspectForTokens();

// Set up a periodic check
setInterval(inspectForTokens, 5000); 