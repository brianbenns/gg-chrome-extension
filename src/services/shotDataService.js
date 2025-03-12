import { downloadFile, updateProgress } from './downloadService';
import { generateDateStampedFilename } from '../utils/dateUtils';

// Convert meters to yards
function metersToYards(meters) {
    return meters ? (meters * 1.09361).toFixed(1) : '';
}

// Create mappings for club types and player clubs
async function getClubMappings(authToken) {
    try {
        // Fetch club types
        const clubTypesResponse = await fetch('https://connect.garmin.com/gcs-golfcommunity/api/v2/clubTypes', {
            headers: { 'Authorization': authToken }
        });
        const clubTypesData = await clubTypesResponse.json();
        const clubTypes = Array.isArray(clubTypesData) ? clubTypesData : clubTypesData.clubTypes;
        
        // Create mapping of club type IDs to names
        const clubTypeMap = new Map();
        clubTypes.forEach(type => {
            clubTypeMap.set(type.id, type.name);
        });

        // Fetch player clubs
        const playerClubsResponse = await fetch('https://connect.garmin.com/gcs-golfcommunity/api/v2/clubs', {
            headers: { 'Authorization': authToken }
        });
        const playerClubsData = await playerClubsResponse.json();
        
        // Create mapping of club IDs to names
        const clubMap = new Map();
        playerClubsData.forEach(club => {
            const clubTypeName = clubTypeMap.get(club.clubTypeId);
            clubMap.set(club.id, clubTypeName || 'Unknown');
        });

        return clubMap;
    } catch (error) {
        console.error('Error fetching club mappings:', error);
        return new Map();
    }
}

// Convert shot data to CSV format
function convertShotDataToCSV(shotData, clubMap) {
    const fields = [
        'courseName', 'holeNumber', 'holeScore', 'shotNumber',
        'clubType', 'shotTime', 'distance', 'startLat', 'startLon',
        'endLat', 'endLon'
    ];

    const header = fields.join(',') + '\n';
    const rows = [];

    shotData.forEach(shot => {
        const row = fields.map(field => {
            let value = '';
            switch (field) {
                case 'clubType':
                    value = clubMap.get(shot.clubId) || 'Unknown';
                    break;
                case 'shotTime':
                    value = new Date(shot.shotTime).toISOString();
                    break;
                case 'distance':
                    value = metersToYards(shot.meters);
                    break;
                default:
                    value = shot[field] || '';
            }
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
        rows.push(row);
    });

    return header + rows.join('\n');
}

// Main function to download shot data
export async function downloadShotData(authToken) {
    try {
        // Get club mappings
        const clubMap = await getClubMappings(authToken);

        // Get summary data to get scorecard IDs
        const summaryResponse = await fetch('https://connect.garmin.com/gcs-golfcommunity/api/v2/scorecard/summary', {
            headers: { 'Authorization': authToken }
        });
        const summaryData = await summaryResponse.json();
        const scorecards = summaryData.scorecards;

        // Initialize progress tracking
        let processedScorecards = 0;
        const totalScorecards = scorecards.length;
        updateProgress(processedScorecards, totalScorecards);

        // Collect all shot data
        const allShotData = [];
        for (const sc of scorecards) {
            // Get shot data for each hole
            const shotResponse = await fetch(`https://connect.garmin.com/gcs-golfcommunity/api/v2/shot/scorecard/${sc.id}/hole`, {
                headers: { 'Authorization': authToken }
            });
            const shotData = await shotResponse.json();

            // Add course name to each shot
            shotData.forEach(shot => {
                shot.courseName = sc.courseName;
            });

            allShotData.push(...shotData);

            // Update progress
            processedScorecards++;
            updateProgress(processedScorecards, totalScorecards);
        }

        // Convert to CSV and download
        const csvContent = convertShotDataToCSV(allShotData, clubMap);
        const filename = generateDateStampedFilename('garmin_golf_shots');
        downloadFile(csvContent, filename);

    } catch (error) {
        console.error('Error downloading shot data:', error);
        throw error;
    }
} 