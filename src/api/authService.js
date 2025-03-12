// Function to get token from localStorage
export function getLocalStorageToken() {
    return new Promise((resolve) => {
        // Set up the message listener before injecting the script
        const messageListener = function(event) {
            if (event.data.type === 'LOCAL_STORAGE_TOKEN') {
                const token = event.data.token;
                if (token) {
                    const authHeader = `Bearer ${token}`;
                    console.log('Got token from localStorage');
                    resolve(authHeader);
                }
                // Remove the listener after getting the token
                window.removeEventListener('message', messageListener);
            }
        };
        window.addEventListener('message', messageListener);

        // Inject the script
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('token-getter.js');
        script.onload = () => {
            script.remove();
        };
        document.head.appendChild(script);
    });
}

// Function to get JWT token from background script
export async function getJwtToken() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getJwtToken" }, response => {
            if (response.token) {
                resolve(response.token);
            } else {
                reject(new Error(response.error || 'Failed to get JWT token'));
            }
        });
    });
}

// Function to ensure we have a valid auth token
export async function ensureAuthToken(currentToken) {
    if (!currentToken) {
        currentToken = await getLocalStorageToken();
        // Wait a bit for the token to be processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!currentToken) {
            throw new Error('Could not get token from localStorage');
        }
    }
    return currentToken;
} 