// Format date to YYYY-MM-DD
export function formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Generate filename with current date
export function generateDateStampedFilename(prefix) {
    const now = new Date();
    return `${prefix}_${formatDate(now)}.csv`;
} 