import { downloadFile, updateProgress } from './downloadService';
import { generateDateStampedFilename } from '../utils/dateUtils';

// Convert scorecard data to CSV format
function convertScorecardDataToCSV(detailedData) {
    const scorecardFields = [
        'courseName', 'date', 'holesPlayed', 'fairwaysRecorded', 'greensInRegulation',
        'putts', 'strokes', 'strokesRecorded', 'totalScore', 'totalPar', 'totalDistance',
        'fairwaysHitPct', 'girPct', 'avgPutts', 'avgScore', 'avgScoreToPar'
    ];

    const holeFields = [
        'holeNumber', 'par', 'strokes', 'putts', 'fairwayShotOutcome',
        'fairwayPosition', 'approachShotOutcome', 'approachShotLie',
        'chipShotOutcome', 'chipShotLie', 'sandShotOutcome', 'sandShotLie',
        'puttShotOutcome'
    ];

    // Create header row
    const headerRow = [
        ...scorecardFields,
        ...Array(18).flatMap((_,i) => holeFields.map(field => `hole${i+1}_${field}`))
    ].join(',') + '\n';

    // Process each scorecard
    const rows = detailedData.map(sc => {
        // Create a map of hole data for easy access
        const holeMap = new Map();
        sc.holes.forEach(hole => {
            holeMap.set(hole.holeNumber, hole);
        });

        // Process scorecard-level fields
        const scorecardValues = scorecardFields.map(field => {
            let value = '';
            if (field === 'date') {
                value = new Date(sc.startTime).toISOString().split('T')[0];
            } else if (sc.scoreCardStats && sc.scoreCardStats.round && sc.scoreCardStats.round[field] !== undefined) {
                value = sc.scoreCardStats.round[field];
            } else {
                value = sc[field] || '';
            }
            return value;
        });

        // Process hole-level fields
        const holeValues = Array(18).flatMap(i => {
            const hole = holeMap.get(i + 1) || {};
            return holeFields.map(field => hole[field] || '');
        });

        // Combine all values and escape if needed
        const allValues = [...scorecardValues, ...holeValues].map(value => {
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });

        return allValues.join(',');
    });

    return headerRow + rows.join('\n');
}

// Main function to download scorecard data
export async function downloadScorecardData(authToken) {
    try {
        // Get summary data
        const summaryResponse = await fetch('https://connect.garmin.com/gcs-golfcommunity/api/v2/scorecard/summary', {
            headers: { 'Authorization': authToken }
        });
        const summaryData = await summaryResponse.json();
        const scorecards = summaryData.scorecards;

        // Initialize progress tracking
        let processedScorecards = 0;
        const totalScorecards = scorecards.length;
        updateProgress(processedScorecards, totalScorecards);

        // Collect detailed data for each scorecard
        const detailedData = [];
        for (const sc of scorecards) {
            const detailResponse = await fetch(`https://connect.garmin.com/gcs-golfcommunity/api/v2/scorecard/${sc.id}`, {
                headers: { 'Authorization': authToken }
            });
            const detailData = await detailResponse.json();
            detailedData.push(detailData);

            // Update progress
            processedScorecards++;
            updateProgress(processedScorecards, totalScorecards);
        }

        // Convert to CSV and download
        const csvContent = convertScorecardDataToCSV(detailedData);
        const filename = generateDateStampedFilename('garmin_golf_scorecards');
        downloadFile(csvContent, filename);

    } catch (error) {
        console.error('Error downloading scorecard data:', error);
        throw error;
    }
} 