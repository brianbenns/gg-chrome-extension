// Get token from localStorage and send it back to content script
const tokenJson = localStorage.getItem('token');
let accessToken = null;

try {
    const tokenObj = JSON.parse(tokenJson);
    accessToken = tokenObj.access_token;
} catch (e) {
    console.error('Error parsing token:', e);
}

window.postMessage({
    type: 'LOCAL_STORAGE_TOKEN',
    token: accessToken
}, '*'); 