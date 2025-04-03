// Function to update progress UI
function updateProgress(progress, total) {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'block';
    const percentage = (progress / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Processing: ${progress}/${total}`;
}

// Function to reset progress UI
function resetProgress() {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = 'Processing: 0/0';
}

// Function to update button states based on current URL
async function updateButtonStates() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const buttons = [
        document.getElementById('downloadSummaryButton'),
        document.getElementById('downloadDetailsButton'),
        document.getElementById('downloadShotsButton')
    ];
    
    const isGarminConnect = tab.url.startsWith('https://connect.garmin.com');
    
    buttons.forEach(button => {
        button.disabled = !isGarminConnect;
        if (!isGarminConnect) {
            button.title = 'Please navigate to Garmin Connect to use this feature';
        } else {
            button.title = '';
        }
    });
}

// Update button states when popup opens
document.addEventListener('DOMContentLoaded', updateButtonStates);

document.getElementById('downloadSummaryButton').addEventListener('click', async () => {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "downloadSummary" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        if (response && response.status === 'success') {
            console.log('Summary download initiated');
        }
    });
});

document.getElementById('downloadDetailsButton').addEventListener('click', async () => {
    // Reset progress bar
    resetProgress();
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "downloadDetails" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        if (response && response.status === 'success') {
            console.log('Scorecards download initiated');
        }
    });
});

document.getElementById('downloadShotsButton').addEventListener('click', async () => {
    // Reset progress bar
    resetProgress();
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "downloadShots" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        if (response && response.status === 'success') {
            console.log('Shots download initiated');
        }
    });
});

// Listen for progress updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateProgress") {
        updateProgress(message.progress, message.total);
    }
}); 