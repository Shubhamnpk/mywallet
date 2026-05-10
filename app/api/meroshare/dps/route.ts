import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type RawDp = {
    id?: string | number;
    name?: string;
    code?: string | number;
};

const normalizeDp = (item: RawDp) => {
    const loginCode = item.code?.toString().trim() || item.id?.toString().trim() || "";
    const internalId = item.id?.toString().trim() || loginCode;

    return {
        id: loginCode,
        name: item.name || loginCode,
        code: internalId
    };
};

const normalizeDpList = (items: RawDp[]) => items
    .map(normalizeDp)
    .filter((item) => item.id && item.name)
    .sort((a, b) => a.name.localeCompare(b.name));

export async function GET() {
    // Prefer the bundled public DPS data so production and extension flows use a stable selector list.
    try {
        const filePath = path.join(process.cwd(), 'public', 'data', 'dps.json');
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            return NextResponse.json(normalizeDpList(JSON.parse(fileData)));
        }
    } catch {
        console.error('Failed to read public/data/dps.json');
    }

    try {
        // Fallback to live MeroShare data if the bundled file is unavailable.
        const response = await fetch('https://meroshare.cdsc.com.np/api/casba/bank/', {
            next: { revalidate: 86400 }
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json(normalizeDpList(data));
        }
    } catch {
        console.warn('Failed to fetch live DPs, falling back to local file');
    }

}
