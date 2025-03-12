import { downloadShotData } from './services/shotDataService';
import { downloadScorecardData } from './services/scorecardService';

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        // Get authorization token from headers
        const authToken = await getAuthToken();
        if (!authToken) {
            throw new Error('Authorization token not found');
        }

        switch (message.action) {
            case 'downloadShots':
                await downloadShotData(authToken);
                break;
            case 'downloadScorecards':
                await downloadScorecardData(authToken);
                break;
            default:
                console.warn('Unknown action:', message.action);
        }
    } catch (error) {
        console.error('Error processing message:', error);
        // Send error message back to popup
        chrome.runtime.sendMessage({
            action: 'error',
            error: error.message
        });
    }
});

// Helper function to get authorization token from headers
async function getAuthToken() {
    // Get all requests
    const requests = await chrome.webRequest.getAll();
    
    // Find a request to the Garmin API
    const garminRequest = requests.find(req => 
        req.url.includes('connect.garmin.com/gcs-golfcommunity/api/v2')
    );

    if (!garminRequest || !garminRequest.requestHeaders) {
        return null;
    }

    // Find the Authorization header
    const authHeader = garminRequest.requestHeaders.find(h => 
        h.name.toLowerCase() === 'authorization'
    );

    return authHeader ? authHeader.value : null;
} 