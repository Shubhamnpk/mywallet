import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Define extraction logic outside the handler for clarity
async function getBrowser() {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        return await puppeteer.launch({
            args: chromium.args,
            defaultViewport: (chromium as any).defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: (chromium as any).headless,
        });
    } else {
        // Common paths for Chrome/Edge on Windows
        const executablePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            process.env.CHROME_PATH
        ].filter(Boolean) as string[];

        let executablePath = '';
        for (const path of executablePaths) {
            if (require('fs').existsSync(path)) {
                executablePath = path;
                break;
            }
        }

        return await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: false,
            executablePath: executablePath || undefined,
        });
    }
}

export async function POST(req: Request) {
    let browser: any = null;
    try {
        const { credentials, ipoName, kitta = 10 } = await req.json();

        if (!credentials || !credentials.dpId || !credentials.username || !credentials.password) {
            return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 });
        }

        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            // 1. Login
            await page.goto('https://meroshare.cdsc.com.np/#/login', { waitUntil: 'networkidle2' });

            // Search and select DP
            await page.waitForSelector('.select2-selection', { timeout: 15000 });
            await page.click('.select2-selection');
            await page.type('.select2-search__field', credentials.dpId);
            await page.keyboard.press('Enter');

            await page.type('#username', credentials.username);
            await page.type('#password', credentials.password);

            await page.click('button[type="submit"]');

            // Wait for dashboard or error
            await page.waitForFunction(() => {
                return window.location.href.includes('/dashboard') ||
                    document.querySelector('.toast-error') !== null;
            }, { timeout: 30000 });

            if (!page.url().includes('/dashboard')) {
                const errorMsg = await page.evaluate(() => document.querySelector('.toast-error')?.textContent?.trim());
                await browser.close();
                return NextResponse.json({ error: errorMsg || "Login failed during application." }, { status: 401 });
            }

            // 2. Navigate to My ASBA
            await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2' });

            // 3. Find the IPO
            try {
                await page.waitForSelector('.asba-table', { timeout: 20000 });
            } catch (err) {
                // If table doesn't even load, it might be a connectivity issue or layout change
                await browser.close();
                return NextResponse.json({ error: "Could not load the ASBA application list. Mero Share might be slow." }, { status: 504 });
            }

            // Check for "No Record(s) Found"
            const isTableEmpty = await page.evaluate(() => {
                const noRecordsEl = document.querySelector('app-no-records-found');
                const fallbackMessage = document.querySelector('.fallback-title-message');
                // General text check as fallback
                const bodyText = document.body.textContent?.toLowerCase() || "";

                return !!noRecordsEl ||
                    (fallbackMessage && fallbackMessage.textContent?.includes('No Record(s) Found')) ||
                    bodyText.includes('No Record(s) Found') && !bodyText.includes('Application Report');
            });

            if (isTableEmpty) {
                await browser.close();
                return NextResponse.json({
                    error: "No active IPOs found in your Mero Share list today. (Mero Share says: No Record(s) Found)"
                }, { status: 404 });
            }

            const rows = await page.$$('.asba-table tbody tr');
            const discoveredIpos: string[] = [];
            let found = false;

            for (const row of rows) {
                const text = await page.evaluate((el: HTMLElement) => el.textContent, row);
                if (text) {
                    // Extract company name (usually the first part of the text or in a specific span)
                    const companyName = text.split('\n')[0].trim();
                    discoveredIpos.push(companyName);

                    if (text.includes(ipoName) && (text.includes('Apply') || text.includes('Edit'))) {
                        const applyBtn = await row.$('.btn-apply');
                        if (applyBtn) {
                            await applyBtn.click();
                            found = true;
                            break;
                        }
                    }
                }
            }

            if (!found) {
                await browser.close();
                const listMsg = discoveredIpos.length > 0
                    ? ` Available in your list are: ${discoveredIpos.join(', ')}`
                    : " The list is currently empty.";

                return NextResponse.json({
                    error: `IPO "${ipoName}" not found.${listMsg}`
                }, { status: 404 });
            }

            // 4. Fill Application Details
            await page.waitForSelector('#selectBank', { timeout: 15000 });

            // Select first bank if multiple (index 1 because 0 is placeholder)
            await page.waitForFunction(() => (document.querySelector('#selectBank') as HTMLSelectElement).options.length > 1);
            const bankValue = await page.evaluate(() => {
                const select = document.querySelector('#selectBank') as HTMLSelectElement;
                return select.options[1].value;
            });
            await page.select('#selectBank', bankValue);

            await page.type('#appliedKitta', kitta.toString());
            await page.type('#crnNumber', credentials.crn);

            // Agree to terms
            await page.click('#disclaimer');
            await page.click('.btn-apply');

            // 5. Enter PIN
            await page.waitForSelector('#transactionPin', { timeout: 10000 });
            await page.type('#transactionPin', credentials.pin);

            await page.click('.btn-apply'); // Final confirmation

            // 6. Wait for success message
            try {
                await page.waitForFunction(() => {
                    return document.querySelector('.toast-success') !== null ||
                        document.querySelector('.toast-error') !== null;
                }, { timeout: 30000 });

                const successMsg = await page.evaluate(() => document.querySelector('.toast-success')?.textContent?.trim());
                const errorMsg = await page.evaluate(() => document.querySelector('.toast-error')?.textContent?.trim());

                await browser.close();

                if (successMsg) {
                    return NextResponse.json({ success: true, message: successMsg });
                } else {
                    return NextResponse.json({ error: errorMsg || "Application failed at the final step." }, { status: 400 });
                }
            } catch (waitError) {
                await browser.close();
                return NextResponse.json({
                    error: "Application submitted but success message not confirmed. Please check your Mero Share 'Application Report'."
                }, { status: 408 });
            }

        } catch (innerError: any) {
            console.error("Puppeteer Error:", innerError);
            if (browser) await browser.close();
            return NextResponse.json({ error: innerError.message || "An error occurred during automation." }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
}
