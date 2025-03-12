// Function to get JWT token
async function getJwtToken() {
    return new Promise((resolve, reject) => {
        chrome.cookies.get({
            url: 'https://connect.garmin.com',
            name: 'JWT_WEB'
        }, (cookie) => {
            if (cookie) {
                resolve(cookie.value);
            } else {
                reject('JWT token not found. Please ensure you are logged in to Garmin Connect.');
            }
        });
    });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getJwtToken") {
        getJwtToken()
            .then(token => sendResponse({ token }))
            .catch(error => sendResponse({ error }));
        return true; // Will respond asynchronously
    }
    else if (message.action === "downloadFile") {
        chrome.downloads.download({
            url: message.url,
            filename: message.filename
        }, () => {
            // Notify content script that download has started
            chrome.tabs.sendMessage(sender.tab.id, { action: "downloadStarted" });
        });
        return true;
    }
}); 