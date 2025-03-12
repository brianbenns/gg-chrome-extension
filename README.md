# Garmin Golf Data Downloader Chrome Extension

A Chrome extension that allows you to download your Garmin Golf data in CSV format. This extension works with the Garmin Golf web interface and provides easy access to your golf statistics and shot data.

## Features

### 1. Scorecard Summary Download
- Downloads basic scorecard information for all your rounds
- Includes course name, scores, dates, and handicap information
- Exports as a CSV file with a date-stamped filename

### 2. Scorecard Details Download
- Comprehensive hole-by-hole data for each round
- Includes detailed statistics such as:
  - Course information (name, tee box, slope, rating)
  - Round statistics (fairways hit, greens in regulation, putts)
  - Individual hole data (par, strokes, putts, fairway outcomes)
- Progress bar shows real-time download status
- Exports as a CSV file with detailed statistics for analysis

### 3. Shot Data Download
- Detailed shot-by-shot information for each round
- Features include:
  - Shot location data (start and end coordinates)
  - Club selection and shot type
  - Distance information (automatically converted to yards)
  - Lie conditions
  - Shot timing information
- Progress bar shows real-time download status
- Exports as a CSV file with comprehensive shot data

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to the Garmin Golf website and log in
2. Click the extension icon in your Chrome toolbar
3. Choose from three download options:
   - "Download Scorecard Summary CSV"
   - "Download Scorecard Details CSV" (includes progress bar)
   - "Download Shot Data CSV" (includes progress bar)
4. For details and shot data downloads, a progress bar will show the current status
5. Files will be automatically downloaded with date-stamped filenames

## Data Format

### Scorecard Summary CSV
- Basic round information
- One row per round
- Includes course name, total score, handicap information

### Scorecard Details CSV
- Detailed hole-by-hole data
- One row per round
- Includes both round-level statistics and hole-specific data

### Shot Data CSV
- Shot-by-shot information
- Multiple rows per hole (one per shot)
- Includes detailed location, club, and condition data
- Distances are converted from meters to yards

## Notes

- The extension requires you to be logged into the Garmin Golf website
- Downloads may take some time for details and shot data due to the detailed information being processed
- Progress tracking is available for both details and shot data downloads to monitor status
- Files are automatically named with the current date for easy organization 