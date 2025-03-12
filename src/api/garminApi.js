// Common headers for Garmin API calls
const getHeaders = (authHeader) => ({
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': authHeader,
    'di-backend': 'golf.garmin.com',
    'nk': 'NT',
    'priority': 'u=1, i',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-app-ver': '5.10.1',
    'x-lang': 'en-US'
});

// Base API call function
async function fetchGarminApi(url, authHeader) {
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(authHeader)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    return response.json();
}

// API endpoints
export async function getScorecardSummary(origin, authHeader) {
    const url = `${origin}/gcs-golfcommunity/api/v2/scorecard/summary?user-locale=en&per-page=10000`;
    return fetchGarminApi(url, authHeader);
}

export async function getScorecardDetail(origin, authHeader, scorecardId) {
    const url = `${origin}/gcs-golfcommunity/api/v2/scorecard/detail?scorecard-ids=${scorecardId}&include-next-previous-ids=true&user-locale=en&include-longest-shot-distance=true`;
    return fetchGarminApi(url, authHeader);
}

export async function getShotData(origin, authHeader, scorecardId) {
    const url = `${origin}/gcs-golfcommunity/api/v2/shot/scorecard/${scorecardId}/hole`;
    return fetchGarminApi(url, authHeader);
}

export async function getClubTypes(origin, authHeader) {
    const url = `${origin}/gcs-golfcommunity/api/v2/club/types?maxClubTypeId=42`;
    return fetchGarminApi(url, authHeader);
}

export async function getPlayerClubs(origin, authHeader) {
    const url = `${origin}/gcs-golfcommunity/api/v2/club/player?per-page=1000&maxClubTypeId=42`;
    return fetchGarminApi(url, authHeader);
} 