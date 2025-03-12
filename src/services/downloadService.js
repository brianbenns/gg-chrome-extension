// Create and trigger file download
export function downloadFile(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);

    // Send message to background script to handle the download
    chrome.runtime.sendMessage({
        action: "downloadFile",
        url: blobUrl,
        filename: filename
    });

    // Listen for download started message
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "downloadStarted") {
            // Clean up the blob URL after download starts
            URL.revokeObjectURL(blobUrl);
        }
    });
}

// Send progress update
export function updateProgress(progress, total) {
    chrome.runtime.sendMessage({
        action: "updateProgress",
        progress,
        total
    });
} 