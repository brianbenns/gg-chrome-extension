import { formatDate } from './dateUtils';

// Helper function to escape CSV values
function escapeCSVValue(value) {
    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

// Convert summary data to CSV
export function convertSummaryToCSV(jsonData) {
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
                if ((field === 'startTime' || field === 'endTime') && value) {
                    value = formatDate(new Date(value));
                }
                return escapeCSVValue(value);
            });
            csv += row.join(',') + '\n';
        });
    }

    return csv;
}

// Convert detailed data to CSV
export function convertDetailedDataToCSV(detailedData) {
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

    const holeFields = [
        'number',
        'par',
        'strokes',
        'handicapScore',
        'putts',
        'fairwayShotOutcome',
    ];

    // Create CSV header
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
                value = scorecard.startTime ? formatDate(new Date(scorecard.startTime)) : '';
            } else if (field === 'courseName') {
                value = sc.courseName;
            } else if (sc.scorecardStats?.round?.[field]) {
                value = sc.scorecardStats.round[field];
            } else {
                value = scorecard[field] || '';
            }
            row.push(escapeCSVValue(value));
        });

        // Add hole-level fields
        for (let holeNum = 1; holeNum <= 18; holeNum++) {
            const holeData = holeMap[holeNum] || {};
            holeFields.forEach(field => {
                let value = '';
                if (field === 'par' && sc.holePars && sc.holePars[holeNum - 1]) {
                    value = sc.holePars[holeNum - 1];
                } else {
                    value = holeData[field] || '';
                }
                row.push(escapeCSVValue(value));
            });
        }

        csv += row.join(',') + '\n';
    });

    return csv;
}

// Convert shot data to CSV
export function convertShotDataToCSV(shotData, courseInfoMap, clubIdToNameMap, holeScores) {
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

    let csv = shotFields.join(',') + '\n';

    if (shotData.holeShots && Array.isArray(shotData.holeShots)) {
        shotData.holeShots.forEach(hole => {
            const holeNumber = hole.holeNumber;
            const holeScore = holeScores[holeNumber] || '';

            if (hole.shots && Array.isArray(hole.shots)) {
                hole.shots.forEach(shot => {
                    const row = shotFields.map(field => {
                        let value = '';
                        switch(field) {
                            case 'courseName':
                                value = courseInfoMap.courseName;
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
                                value = shot.meters ? (shot.meters * 1.09361).toFixed(1) : '';
                                break;
                            case 'startLoc_lie':
                                value = shot.startLoc?.lie || '';
                                break;
                            case 'endLoc_lie':
                                value = shot.endLoc?.lie || '';
                                break;
                            case 'startLoc_lat':
                                value = shot.startLoc?.lat || '';
                                break;
                            case 'startLoc_lon':
                                value = shot.startLoc?.lon || '';
                                break;
                            case 'endLoc_lat':
                                value = shot.endLoc?.lat || '';
                                break;
                            case 'endLoc_lon':
                                value = shot.endLoc?.lon || '';
                                break;
                            default:
                                value = shot[field] || '';
                        }
                        if (field === 'shotTime' && value) {
                            value = new Date(parseInt(value)).toISOString();
                        }
                        return escapeCSVValue(value);
                    });
                    csv += row.join(',') + '\n';
                });
            }
        });
    }

    return csv;
} 