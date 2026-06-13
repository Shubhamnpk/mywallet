import { NextResponse } from "next/server";
import { getMeroShareBrowser } from "../_lib/browser";
import { loginToMeroShare } from "../_lib/transaction-history";

export async function POST(req: Request) {
    let browser: any = null;
    try {
        const { credentials, ipoName, options } = await req.json();

        if (!credentials || !credentials.dpId || !credentials.username || !credentials.password) {
            return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 });
        }

        try {
            browser = await getMeroShareBrowser({
                showBrowser: Boolean(options?.showBrowser),
                browserProvider: options?.browserProvider || credentials?.browserProvider
            });
            const page = await browser.newPage();

            await loginToMeroShare(page, {
                dpId: credentials.dpId,
                username: credentials.username,
                password: credentials.password,
            });

            // 2. Navigate to My ASBA
            await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2' });

            // 3. Click on "Application Report" tab
            let reportTabFound = false;
            try {
                // Wait for the navigation bar or links to appear using a text-based check
                await page.waitForFunction(() => {
                    const elements = Array.from(document.querySelectorAll('.nav-link, .nav-item span, a span'));
                    return elements.some(el => el.textContent?.includes('Application Report'));
                }, { timeout: 20000 });

                reportTabFound = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('.nav-link, .nav-item a'));
                    for (const link of links) {
                        const text = link.textContent?.trim() || "";
                        if (text.includes('Application Report')) {
                            // If it's already active, don't click, just count as found
                            if (link.classList.contains('active')) return true;

                            (link as HTMLElement).click();
                            return true;
                        }
                    }
                    return false;
                });

                if (reportTabFound) {
                    await page.waitForFunction(() => {
                        return document.querySelector('.asba-table, .company-list, .fallback-view') !== null ||
                            document.body.textContent?.includes("Application Report")
                    }, { timeout: 20000 });
                }
            } catch (tabErr) {
                console.error("Tab selection error:", tabErr);
            }

            if (!reportTabFound) {
                await browser.close();
                return NextResponse.json({ error: "Could not find 'Application Report' tab even after searching. Mero Share layout might be unstable." }, { status: 404 });
            }

            // 4. Find the IPO in the report list
            let foundReport = false;
            try {
                // Wait for either the table or the newer company-list cards to appear
                await page.waitForSelector('.asba-table, .company-list', { timeout: 20000 });

                foundReport = await page.evaluate((targetIpo: string) => {
                    // Helper: Normalize name for fuzzy matching
                    const normalize = (name: string) => {
                        return name.toLowerCase()
                            .replace(/\b(limited|ltd|public|private|pvt|co|company|inc)\b/g, '') // Remove suffixes
                            .replace(/[().,-]/g, '') // Remove punctuation
                            .replace(/\s+/g, ' ') // Collapse spaces
                            .trim();
                    };

                    const targetNormalized = normalize(targetIpo);

                    // Helper: Check match (Exact OR Fuzzy)
                    const isMatch = (candidate: string) => {
                        if (!candidate) return false;
                        const candNorm = normalize(candidate);
                        return candNorm.includes(targetNormalized) || targetNormalized.includes(candNorm);
                    };

                    // Try Card-based layout (.company-list)
                    const cards = Array.from(document.querySelectorAll('.company-list'));
                    if (cards.length > 0) {
                        for (const card of cards) {
                            const nameEl = card.querySelector('.company-name span[tooltip="Company Name"]') || card.querySelector('.company-name');
                            const cardText = nameEl?.textContent?.trim() || "";

                            if (isMatch(cardText)) {
                                // Find the specific button that has "report" icon or text inside action-buttons
                                const buttons = Array.from(card.querySelectorAll('.action-buttons button'));
                                const reportBtn = buttons.find(btn => btn.textContent?.toLowerCase().includes('report')) || card.querySelector('.btn-issue');

                                if (reportBtn) {
                                    (reportBtn as HTMLElement).click();
                                    return true;
                                }
                            }
                        }
                    }

                    // Try Table-based layout (.asba-table)
                    const rows = Array.from(document.querySelectorAll('.asba-table tbody tr'));
                    for (const row of rows) {
                        const rowText = row.textContent?.trim() || "";
                        const companyName = rowText.split('\n')[0].trim();

                        if (isMatch(companyName)) {
                            // Find report button/icon
                            const reportBtn = row.querySelector('.btn-report, .ca-report, .ca.report, i.mdi-file-document') ||
                                Array.from(row.querySelectorAll('button')).find(btn => btn.innerHTML.includes('mdi-file-document'));

                            if (reportBtn) {
                                (reportBtn as HTMLElement).click();
                                return true;
                            }
                        }
                    }

                    return false;
                }, ipoName);

            } catch (findErr) {
                console.error("Error finding IPO in list:", findErr);
            }

            if (!foundReport) {
                await browser.close();
                return NextResponse.json({ error: `Application report for "${ipoName}" not found in your Mero Share account.` }, { status: 404 });
            }

            // 5. Check Allotment Status in the Report Detail Page
            await page.waitForSelector('.asba-report-detail, .modal-content, .card-body, .row', { timeout: 15000 });
            await page.waitForFunction(() => {
                return document.querySelectorAll('.form-group').length > 0 &&
                    document.querySelector('.form-group label') !== null
            }, { timeout: 15000 });

            const reportData = await page.evaluate(() => {
                const data: any = {};

                // Mero Share Detail Page has multiple sections with .form-group
                const formGroups = Array.from(document.querySelectorAll('.form-group'));

                formGroups.forEach(group => {
                    const labelEl = group.querySelector('label');
                    const labelText = labelEl?.textContent?.trim() || "";

                    if (labelText) {
                        // Value can be in .form-value span (top section) or .input-group label (bottom section)
                        const valueEl = group.querySelector('.form-value span') || group.querySelector('.input-group label');
                        const valueText = valueEl?.textContent?.trim() || "";

                        if (valueText) {
                            data[labelText] = valueText;
                        }
                    }
                });

                // Specifically look for Allotment Status
                // Labels seen in Mero Share: "Status", "Allotment Status"
                const statusValue = data['Status'] || data['Allotment Status'] || "Unknown";
                const lowerStatus = statusValue.toLowerCase();

                // Determine if allotted
                // "Verified" means application is success but result is not yet published
                const isAllotted = lowerStatus.includes('alloted') && !lowerStatus.includes('not');
                const isVerified = lowerStatus === 'verified';
                const isNotAllotted = lowerStatus.includes('..');

                let finalStatus = statusValue;
                if (isVerified) {
                    finalStatus = "Application Verified (Result Pending)";
                } else if (isNotAllotted) {
                    finalStatus = "Not Allotted";
                }

                // Get allotted quantity if available
                const allottedQuantity = data['Allotted Quantity'] || (isAllotted ? (data['Applied Quantity'] || "0") : "0");

                return {
                    status: finalStatus,
                    isAllotted,
                    allottedQuantity,
                    allDetails: data
                };
            });

            await browser.close();
            return NextResponse.json({ success: true, ...reportData });

        } catch (innerError: any) {
            console.error("Puppeteer Allotment Error:", innerError);
            if (browser) await browser.close();
            return NextResponse.json({ error: innerError.message || "An error occurred during allotment check." }, { status: 500 });
        }

    } catch (_error: any) {
        return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
}
