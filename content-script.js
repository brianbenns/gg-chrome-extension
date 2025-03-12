// Inject script to intercept fetch requests and capture headers
function injectHeaderCapture() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('header-capture.js');
    document.head.appendChild(script);
}

// Function to get token from localStorage
function getLocalStorageToken() {
    return new Promise((resolve) => {
        // Set up the message listener before injecting the script
        const messageListener = function(event) {
            if (event.data.type === 'LOCAL_STORAGE_TOKEN') {
                const token = event.data.token;
                if (token) {
                    capturedAuthHeader = `Bearer ${token}`;
                    console.log('Got token from localStorage');
                }
                // Remove the listener after getting the token
                window.removeEventListener('message', messageListener);
                resolve();
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

// Listen for messages from the injected script
let capturedAuthHeader = null;
let foundTokens = {};

window.addEventListener('message', function(event) {
    if (event.data.type === 'FOUND_TOKENS') {
        console.log('Found tokens in page:', event.data.tokens);
        foundTokens = {...foundTokens, ...event.data.tokens};
    }
    else if (event.data.type === 'FOUND_RESPONSE_TOKENS') {
        console.log('Found tokens in response for URL:', event.data.url);
        console.log('Tokens:', event.data.tokens);
        foundTokens = {...foundTokens, ...event.data.tokens};
    }
});

// Function to get JWT token from background script
async function getJwtToken() {
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

// Function to convert JSON data to CSV
function convertToCSV(jsonData) {
    // Define the fields we want to extract
    const fields = [
        'courseName',
        'strokes',
        'holesCompleted',
        'startTime',
        'endTime',
        'handicappedStrokes',
        'scoreWithHandicap',
        'scoreWithoutHandicap'
    ];

    // Create CSV header
    let csv = fields.join(',') + '\n';

    // Add data rows
    if (jsonData.scorecardSummaries && Array.isArray(jsonData.scorecardSummaries)) {
        jsonData.scorecardSummaries.forEach(summary => {
            const row = fields.map(field => {
                let value = summary[field] || '';
                // Format dates if present
                if ((field === 'startTime' || field === 'endTime') && value) {
                    const date = new Date(value);
                    value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                }
                // Escape commas and quotes in the value
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
    }

    return csv;
}

// Function to convert detailed JSON data to CSV
function convertDetailedDataToCSV(detailedData) {
    // Define the scorecard-level fields we want
    const scorecardFields = [
        'courseName',
        'date',
        'strokes',
        'handicappedStrokes',
        'holesCompleted',
        'playerHandicap',
        'teeBox',
        'teeBoxRating',
        'teeBoxSlope',
        // Add specific fields from scoreCardStats.round
        'holesPlayed',
        'fairwaysRecorded',
        'fairwaysHit',
        'fairwaysLeft',
        'fairwaysRight',
        'greensInRegulation',
        'greensRecorded',
        'putts',
        'scoreWithHandicap',
        'scoreWithoutHandicap',
        'meanPuttsPerHole',
        'holesUnderPar',
        'holesPar',
        'holesBogey',
        'holesOverBogey',
        'holesBirdie',
        'holesEagle',
        'holesDoubleEagleOrUnder',
        'upsAndDowns',
        'chips'
    ];

    // Define the hole-level fields we want (excluding specified fields)
    const holeFields = [
        'number',
        'par',
        'strokes',
        'handicapScore',
        'putts',
        'fairwayShotOutcome',
    ];

    // Create CSV header
    // First the scorecard fields, then hole fields repeated for each hole
    let headerRow = [...scorecardFields];
    for (let holeNum = 1; holeNum <= 18; holeNum++) {
        holeFields.forEach(field => {
            headerRow.push(`hole${holeNum}_${field}`);
        });
    }
    let csv = headerRow.join(',') + '\n';

    // Process each scorecard
    detailedData.forEach(sc => {
        const scorecard = sc.scorecard;
        // Debugging
        console.log(sc);
        const row = [];
        
        // Create a map of hole data for easy access
        const holeMap = {};
        if (scorecard.holes && Array.isArray(scorecard.holes)) {
            scorecard.holes.forEach(hole => {
                holeMap[hole.number] = hole;
            });
        }
        
        // Add scorecard-level fields
        scorecardFields.forEach(field => {
            let value = '';
            if (field === 'date') {
                value = scorecard.startTime || '';
                if (value) {
                    const date = new Date(value);
                    value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                }
            } else if (field === 'courseName') {
                value = sc.courseName;
            } else if (sc.scorecardStats && sc.scorecardStats.round && sc.scorecardStats.round[field]) {
                value = sc.scorecardStats.round[field] || '';
            } else {
                value = scorecard[field] || '';
            }
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            row.push(value);
        });

        // Add hole-level fields for all 18 holes
        for (let holeNum = 1; holeNum <= 18; holeNum++) {
            const holeData = holeMap[holeNum] || {};
            holeFields.forEach(field => {
                let value = '';
                if (field === 'par' && sc.holePars && sc.holePars[holeNum - 1]) {
                    // Get par from the holePars array (0-based index)
                    value = sc.holePars[holeNum - 1];
                } else {
                    value = holeData[field] || '';
                }
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                row.push(value);
            });
        }

        csv += row.join(',') + '\n';
    });

    return csv;
}

// Function to download summary data
async function downloadSummaryData(endpoint = '/gcs-golfcommunity/api/v2/scorecard/summary?user-locale=en&per-page=10000') {
    try {
        // Get token from localStorage if we don't have it yet
        if (!capturedAuthHeader) {
            await getLocalStorageToken();
            // Wait a bit for the token to be processed
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!capturedAuthHeader) {
                throw new Error('Could not get token from localStorage');
            }
        }

        const url = window.location.origin + endpoint;
        console.log('Requesting URL:', url);
        console.log('Using authorization header:', capturedAuthHeader);

        // Fetch data from the current site with credentials
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': capturedAuthHeader,
                'di-backend': 'golf.garmin.com',
                'nk': 'NT',
                'priority': 'u=1, i',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-app-ver': '5.10.1',
                'x-lang': 'en-US'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        // Parse the JSON response
        const jsonData = await response.json();
        
        // Convert to CSV
        const csvContent = convertToCSV(jsonData);
        
        // Create a blob with the CSV data
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);

        // Generate filename with current date
        const now = new Date();
        const filename = `garmin_golf_scores_summary_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

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

        return true;
    } catch (error) {
        console.error('Error downloading summary data:', error);
        return false;
    }
}

// Function to fetch detailed scorecard data
async function downloadDetailsData() {
    try {
        // First, get the summary data to get all scorecard IDs and course names
        const url = window.location.origin + '/gcs-golfcommunity/api/v2/scorecard/summary?user-locale=en&per-page=10000';
        
        // Ensure we have the auth token
        if (!capturedAuthHeader) {
            await getLocalStorageToken();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!capturedAuthHeader) {
                throw new Error('Could not get token from localStorage');
            }
        }

        // Fetch summary data to get IDs and course names
        const summaryResponse = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': capturedAuthHeader,
                'di-backend': 'golf.garmin.com',
                'nk': 'NT',
                'priority': 'u=1, i',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-app-ver': '5.10.1',
                'x-lang': 'en-US'
            }
        });

        if (!summaryResponse.ok) {
            throw new Error(`HTTP error! status: ${summaryResponse.status}`);
        }

        const summaryData = await summaryResponse.json();
        
        // Create a mapping of scorecard ID to courseName and holePars
        const courseInfoMap = {};
        summaryData.scorecardSummaries.forEach(summary => {
            if (summary.id) {
                courseInfoMap[summary.id] = {
                    courseName: summary.courseName || '',
                    holePars: summary.holePars ? summary.holePars.split('') : []
                };
                // Debugging
                console.log(`Adding course ${summary.courseName} with ID ${summary.id} and pars ${summary.holePars}`);
            }
        });

        const scorecardIds = summaryData.scorecardSummaries.map(summary => summary.id);
        console.log(`Found ${scorecardIds.length} scorecards to process`);

        // Send initial progress
        chrome.runtime.sendMessage({
            action: "updateProgress",
            progress: 0,
            total: scorecardIds.length
        });

        // Fetch details for each scorecard
        const detailedData = [];
        var i = 0;
        for (const id of scorecardIds) {
            // Send progress update
            chrome.runtime.sendMessage({
                action: "updateProgress",
                progress: i + 1,
                total: scorecardIds.length
            });

            const detailUrl = `${window.location.origin}/gcs-golfcommunity/api/v2/scorecard/detail?scorecard-ids=${id}&include-next-previous-ids=true&user-locale=en&include-longest-shot-distance=true`;

            console.log(`Fetching details for scorecard ${id}`);
            
            const detailResponse = await fetch(detailUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'authorization': capturedAuthHeader,
                    'di-backend': 'golf.garmin.com',
                    'nk': 'NT',
                    'priority': 'u=1, i',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-app-ver': '5.10.1',
                    'x-lang': 'en-US'
                }
            });

            if (!detailResponse.ok) {
                console.error(`Failed to fetch details for scorecard ${id}`);
                continue;
            }

            var detailData = await detailResponse.json();
            detailData = detailData.scorecardDetails[0];
            // Add courseName and holePars from our mapping using the scorecard ID
            if (courseInfoMap[id]) {
                detailData.courseName = courseInfoMap[id].courseName;
                detailData.holePars = courseInfoMap[id].holePars;
            }
            // Debugging
            console.log(detailData);

            detailedData.push(detailData);
            i++;
        }

        // Send completion progress
        chrome.runtime.sendMessage({
            action: "updateProgress",
            progress: scorecardIds.length,
            total: scorecardIds.length
        });

        // Convert detailed data to CSV
        const csvContent = convertDetailedDataToCSV(detailedData);
        
        // Create a blob with the CSV data
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);

        // Generate filename with current date
        const now = new Date();
        const filename = `garmin_golf_scores_details_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

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

        return true;
    } catch (error) {
        console.error('Error downloading detailed data:', error);
        return false;
    }
}

// Function to download shot data
async function downloadShotData() {
    try {
        // Ensure we have the auth token
        if (!capturedAuthHeader) {
            await getLocalStorageToken();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!capturedAuthHeader) {
                throw new Error('Could not get token from localStorage');
            }
        }

        // First get the club types
        const clubTypesUrl = window.location.origin + '/gcs-golfcommunity/api/v2/club/types?maxClubTypeId=42';
        const clubTypesResponse = await fetch(clubTypesUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': capturedAuthHeader,
                'di-backend': 'golf.garmin.com',
                'nk': 'NT',
                'priority': 'u=1, i',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-app-ver': '5.10.1',
                'x-lang': 'en-US'
            }
        });

        if (!clubTypesResponse.ok) {
            throw new Error(`HTTP error! status: ${clubTypesResponse.status}`);
        }

        const clubTypesData = await clubTypesResponse.json();

        // Create mapping of club type ID to name
        const clubTypeMap = {};
           (clubTypesData.clubTypes || []);
        
        clubTypesData.forEach(type => {
            clubTypeMap[type.value] = type.name;
        });
        
        // Now get the player's clubs
        const playerClubsUrl = window.location.origin + '/gcs-golfcommunity/api/v2/club/player?per-page=1000&maxClubTypeId=42';
        const playerClubsResponse = await fetch(playerClubsUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': capturedAuthHeader,
                'di-backend': 'golf.garmin.com',
                'nk': 'NT',
                'priority': 'u=1, i',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-app-ver': '5.10.1',
                'x-lang': 'en-US'
            }
        });

        if (!playerClubsResponse.ok) {
            throw new Error(`HTTP error! status: ${playerClubsResponse.status}`);
        }

        const playerClubsData = await playerClubsResponse.json();
        
        // Debug the response structure
        console.log('Player clubs response:', playerClubsData);
        
        // Create mapping of club ID to club type name
        const clubIdToNameMap = {};
        // Handle both array at root level or nested in clubs property
        const playerClubsArray = Array.isArray(playerClubsData) ? playerClubsData :
                               (playerClubsData.clubs || []);
        
        playerClubsArray.forEach(club => {
            clubIdToNameMap[club.id] = clubTypeMap[club.clubTypeId] || 'Unknown';
        });
        
        // Debug the mapping
        console.log('Club ID to name mapping:', clubIdToNameMap);

        // Now get the summary data to get all scorecard IDs and course names
        const url = window.location.origin + '/gcs-golfcommunity/api/v2/scorecard/summary?user-locale=en&per-page=10000';
        
        // Fetch summary data to get IDs and course names
        const summaryResponse = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': capturedAuthHeader,
                'di-backend': 'golf.garmin.com',
                'nk': 'NT',
                'priority': 'u=1, i',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-app-ver': '5.10.1',
                'x-lang': 'en-US'
            }
        });

        if (!summaryResponse.ok) {
            throw new Error(`HTTP error! status: ${summaryResponse.status}`);
        }

        const summaryData = await summaryResponse.json();
        
        // Create a mapping of scorecard ID to courseName
        const courseInfoMap = {};
        summaryData.scorecardSummaries.forEach(summary => {
            if (summary.id) {
                courseInfoMap[summary.id] = {
                    courseName: summary.courseName || ''
                };
            }
        });

        const scorecardIds = summaryData.scorecardSummaries.map(summary => summary.id);
        console.log(`Found ${scorecardIds.length} scorecards to process`);

        // Send initial progress
        chrome.runtime.sendMessage({
            action: "updateProgress",
            progress: 0,
            total: scorecardIds.length
        });

        // Create CSV header (we'll only do this once)
        const shotFields = [
            'courseName',
            'holeNumber',
            'holeScore',
            'shotOrder',
            'shotTime',
            'clubType',
            'shotType',
            'yards',
            'startLoc_lie',
            'endLoc_lie',
            'startLoc_lat',
            'startLoc_lon',
            'endLoc_lat',
            'endLoc_lon'
        ];
        let csvContent = shotFields.join(',') + '\n';

        // Fetch details for each scorecard
        var i = 0;
        for (const id of scorecardIds) {
            // Send progress update
            chrome.runtime.sendMessage({
                action: "updateProgress",
                progress: i + 1,
                total: scorecardIds.length
            });

            // First get the scorecard details to get hole scores
            const detailUrl = `${window.location.origin}/gcs-golfcommunity/api/v2/scorecard/detail?scorecard-ids=${id}&include-next-previous-ids=true&user-locale=en&include-longest-shot-distance=true`;
            const detailResponse = await fetch(detailUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'authorization': capturedAuthHeader,
                    'di-backend': 'golf.garmin.com',
                    'nk': 'NT',
                    'priority': 'u=1, i',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-app-ver': '5.10.1',
                    'x-lang': 'en-US'
                }
            });

            if (!detailResponse.ok) {
                console.error(`Failed to fetch details for scorecard ${id}`);
                continue;
            }

            const detailData = await detailResponse.json();
            const scorecardDetail = detailData.scorecardDetails[0];
            
            // Create a map of hole scores
            const holeScores = {};
            if (scorecardDetail.scorecard && scorecardDetail.scorecard.holes) {
                scorecardDetail.scorecard.holes.forEach(hole => {
                    holeScores[hole.number] = hole.strokes || '';
                });
            }

            // Now get the shot data
            const shotUrl = `${window.location.origin}/gcs-golfcommunity/api/v2/shot/scorecard/${id}/hole`;
            const shotResponse = await fetch(shotUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'authorization': capturedAuthHeader,
                    'di-backend': 'golf.garmin.com',
                    'nk': 'NT',
                    'priority': 'u=1, i',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-app-ver': '5.10.1',
                    'x-lang': 'en-US'
                }
            });

            if (!shotResponse.ok) {
                console.error(`Failed to fetch shots for scorecard ${id}`);
                continue;
            }

            const shotData = await shotResponse.json();
            
            // Process each hole's shots if they exist
            if (shotData && shotData.holeShots && Array.isArray(shotData.holeShots)) {
                shotData.holeShots.forEach(hole => {
                    const holeNumber = hole.holeNumber;
                    const holeScore = holeScores[holeNumber] || '';

                    // Process each shot in the hole if they exist
                    if (hole.shots && Array.isArray(hole.shots)) {
                        hole.shots.forEach(shot => {
                            const row = [];
                            shotFields.forEach(field => {
                                let value = '';
                                switch(field) {
                                    case 'courseName':
                                        value = courseInfoMap[id].courseName;
                                        break;
                                    case 'holeNumber':
                                        value = holeNumber;
                                        break;
                                    case 'holeScore':
                                        value = holeScore;
                                        break;
                                    case 'clubType':
                                        value = clubIdToNameMap[shot.clubId] || '';
                                        break;
                                    case 'yards':
                                        // Convert meters to yards
                                        value = shot.meters ? (shot.meters * 1.09361).toFixed(1) : '';
                                        break;
                                    case 'startLoc_lie':
                                        value = shot.startLoc ? shot.startLoc.lie : '';
                                        break;
                                    case 'endLoc_lie':
                                        value = shot.endLoc ? shot.endLoc.lie : '';
                                        break;
                                    case 'startLoc_lat':
                                        value = shot.startLoc ? shot.startLoc.lat : '';
                                        break;
                                    case 'startLoc_lon':
                                        value = shot.startLoc ? shot.startLoc.lon : '';
                                        break;
                                    case 'endLoc_lat':
                                        value = shot.endLoc ? shot.endLoc.lat : '';
                                        break;
                                    case 'endLoc_lon':
                                        value = shot.endLoc ? shot.endLoc.lon : '';
                                        break;
                                    default:
                                        value = shot[field] || '';
                                }
                                // Format date if it's shotTime
                                if (field === 'shotTime' && value) {
                                    const date = new Date(parseInt(value));
                                    value = date.toISOString();
                                }
                                // Escape commas and quotes in the value
                                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                                    value = `"${value.replace(/"/g, '""')}"`;
                                }
                                row.push(value);
                            });
                            csvContent += row.join(',') + '\n';
                        });
                    }
                });
            }

            i++;
        }

        // Send completion progress
        chrome.runtime.sendMessage({
            action: "updateProgress",
            progress: scorecardIds.length,
            total: scorecardIds.length
        });

        // Create a single blob with all the CSV data
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);

        // Generate filename with current date
        const now = new Date();
        const filename = `garmin_golf_shots_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.csv`;

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

        return true;
    } catch (error) {
        console.error('Error downloading shot data:', error);
        return false;
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadSummary") {
        downloadSummaryData().then(success => {
            sendResponse({ status: success ? 'success' : 'error' });
        });
        return true; // Will respond asynchronously
    }
    else if (message.action === "downloadDetails") {
        downloadDetailsData().then(success => {
            sendResponse({ status: success ? 'success' : 'error' });
        });
        return true; // Will respond asynchronously
    }
    else if (message.action === "downloadShots") {
        downloadShotData().then(success => {
            sendResponse({ status: success ? 'success' : 'error' });
        });
        return true; // Will respond asynchronously
    }
}); 