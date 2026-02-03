import NepaliDate from 'nepali-date-converter';

const MONTHS_MAP: Record<string, number> = {
    'baisakh': 0, 'baishakh': 0,
    'jestha': 1, 'jeth': 1,
    'ashad': 2, 'asar': 2, 'ashadh': 2,
    'shrawan': 3, 'saun': 3,
    'bhadra': 4, 'bhadu': 4,
    'ashwin': 5, 'asoj': 5,
    'kartik': 6,
    'mangsir': 7, 'mansir': 7,
    'poush': 8, 'pus': 8,
    'magh': 9, 'mgh': 9, 'math': 9,
    'falgun': 10, 'phagun': 10,
    'chaitra': 11, 'chait': 11
};

const MONTH_NAMES = [
    'Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

/**
 * Parses a date range string like "22nd - 26th Magh, 2082" or "28th Magh - 4th Falgun, 2082"
 * and returns the start and end dates as JS Date objects.
 */
export function parseNepaliDateRange(rangeStr: string): { start: Date; end: Date } | null {
    try {
        // Basic cleanup
        const cleanRange = rangeStr.toLowerCase().replace(/,/g, '').trim();
        const parts = cleanRange.split(/\s+/);

        let year = NaN;
        let rangePart = cleanRange;

        // Check if the last part is a year (usually 4 digits)
        const lastPart = parts[parts.length - 1];
        if (/^\d{4}$/.test(lastPart)) {
            year = parseInt(lastPart);
            rangePart = cleanRange.replace(lastPart, '').trim();
        } else {
            // Fallback to current Nepali year
            year = new (NepaliDate as any)().getYear();
        }

        // Split by dash, "to", or "till"
        const splitParts = rangePart.split(/\s*(?:-|to|till)\s*/);
        if (splitParts.length !== 2) return null;

        const startPart = splitParts[0].trim();
        const endPart = splitParts[1].trim();

        // Helper to extract day and month from a part like "22nd magh" or "26th"
        const parsePart = (part: string, fallbackMonth?: number) => {
            const dayMatch = part.match(/(\d+)/);
            if (!dayMatch) return null;
            const day = parseInt(dayMatch[1]);

            let month = fallbackMonth;
            for (const [mName, mIndex] of Object.entries(MONTHS_MAP)) {
                if (part.includes(mName)) {
                    month = mIndex;
                    break;
                }
            }

            if (month === undefined) return null;
            return { day, month };
        };

        // Note: If endPart has a month but startPart doesn't (e.g. "22nd - 26th Magh"), 
        // the endPart month should be used for startPart too.

        const endInfo = parsePart(endPart);
        if (!endInfo) return null;

        const startInfo = parsePart(startPart, endInfo.month);
        if (!startInfo) return null;

        const startDateBS = new (NepaliDate as any)(year, startInfo.month, startInfo.day);
        const endDateBS = new (NepaliDate as any)(year, endInfo.month, endInfo.day);

        return {
            start: startDateBS.toJsDate(),
            end: endDateBS.toJsDate()
        };
    } catch (error) {
        console.error('Error parsing Nepali date range:', rangeStr, error);
        return null;
    }
}

export function getIPOStatus(startDate: Date, endDate: Date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openingDay = DAYS[startDate.getDay()];
    const closingDay = DAYS[endDate.getDay()];

    if (today < start) {
        const diffTime = start.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            status: 'upcoming' as const,
            daysRemaining: diffDays,
            openingDay,
            closingDay
        };
    } else if (today <= end) {
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            status: 'open' as const,
            daysRemaining: diffDays,
            openingDay,
            closingDay
        };
    } else {
        return {
            status: 'closed' as const,
            daysRemaining: 0,
            openingDay,
            closingDay
        };
    }
}
