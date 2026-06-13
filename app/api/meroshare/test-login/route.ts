import { NextResponse } from 'next/server';
import { getMeroShareBrowser } from "../_lib/browser";
import { loginToMeroShare } from "../_lib/transaction-history";

export async function POST(req: Request) {
    let browser: any = null;
    try {
        const { credentials, options } = await req.json();

        if (!credentials || !credentials.dpId || !credentials.username || !credentials.password) {
            return NextResponse.json({ error: "Missing Mero Share credentials" }, { status: 400 });
        }

        try {
            browser = await getMeroShareBrowser({
                showBrowser: Boolean(options?.showBrowser),
                browserProvider: options?.browserProvider || credentials?.browserProvider,
            });
            const page = await browser.newPage();

            await loginToMeroShare(page, {
                dpId: credentials.dpId,
                username: credentials.username,
                password: credentials.password,
            });

            const name = await page.evaluate(() => document.querySelector('.user-name')?.textContent?.trim() || "User");
            await browser.close();
            return NextResponse.json({
                success: true,
                message: `Login Successful! Welcome, ${name}.`,
            });

        } catch (innerError: any) {
            console.error("Browser Error:", innerError);
            if (browser) await browser.close();
            return NextResponse.json({
                error: `Automation Error: ${innerError.message}. Make sure Chrome is installed locally.`
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Request Parsing Error:", error);
        return NextResponse.json({ error: `Request Error: ${error.message}` }, { status: 400 });
    }
}
