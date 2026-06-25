const puppeteer = require("puppeteer");
const { setupPageFilters } = require("../utils");

// Proxy config (override via env vars for security; falls back to existing values)
const PROXY = process.env.PROXY_SERVER || "ae-pr.oxylabs.io:40000";
const PROXY_AUTH = {
    username: process.env.PROXY_USERNAME || "Dxbrunners",
    password: process.env.PROXY_PASSWORD || "Mikhman_2024",
};

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BASE_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--disable-features=site-per-process",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
];

let browser = null;
let proxyBrowser = null;

// Guard so concurrent requests don't each launch a browser during the cold start window
let browserLaunch = null;
let proxyBrowserLaunch = null;

function isAlive(b) {
    return b && b.connected && b.process();
}

async function getBrowser() {
    if (isAlive(browser)) return browser;
    if (!browserLaunch) {
        browserLaunch = puppeteer
            .launch({ headless: true, defaultViewport: null, args: BASE_ARGS })
            .then((b) => {
                browser = b;
                browserLaunch = null;
                return b;
            })
            .catch((err) => {
                browserLaunch = null;
                throw err;
            });
    }
    return browserLaunch;
}

async function getProxyBrowser() {
    if (isAlive(proxyBrowser)) return proxyBrowser;
    if (!proxyBrowserLaunch) {
        proxyBrowserLaunch = puppeteer
            .launch({
                headless: true,
                defaultViewport: null,
                args: [`--proxy-server=${PROXY}`, ...BASE_ARGS],
            })
            .then((b) => {
                proxyBrowser = b;
                proxyBrowserLaunch = null;
                return b;
            })
            .catch((err) => {
                proxyBrowserLaunch = null;
                throw err;
            });
    }
    return proxyBrowserLaunch;
}

/**
 * Creates a fully configured, isolated page (own browser context) on a pooled
 * browser. Reusing the pooled browser avoids a cold Chromium launch per request,
 * which is the biggest speed win.
 *
 * @param {{ proxy?: boolean, navigationTimeout?: number }} options
 * @returns {Promise<{ context: import('puppeteer').BrowserContext, page: import('puppeteer').Page }>}
 */
async function createPage({ proxy = false, navigationTimeout = 45000 } = {}) {
    const b = proxy ? await getProxyBrowser() : await getBrowser();
    const context = await b.createBrowserContext();
    const page = await context.newPage();

    if (proxy) {
        await page.authenticate(PROXY_AUTH);
    }

    await page.setUserAgent(USER_AGENT);
    await setupPageFilters(page);
    page.setDefaultNavigationTimeout(navigationTimeout);

    return { context, page };
}

async function closeBrowsers() {
    const promises = [];
    if (browser) {
        promises.push(browser.close().catch(() => {}));
        browser = null;
    }
    if (proxyBrowser) {
        promises.push(proxyBrowser.close().catch(() => {}));
        proxyBrowser = null;
    }
    await Promise.all(promises);
}

module.exports = {
    getBrowser,
    getProxyBrowser,
    createPage,
    closeBrowsers,
};
