function generateJobId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `job_${timestamp}_${random}`;
}

async function setupPageFilters(page) {
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) return;

        const resourceType = req.resourceType();
        const url = req.url().toLowerCase();

        // Block non-essential resource types. We never need the pixels to render,
        // only the DOM (img/src attributes survive even when the image is blocked).
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
            return;
        }

        // Block analytics, tracking, ads, and social pixels
        if (
            url.includes('google-analytics') ||
            url.includes('googletagmanager') ||
            url.includes('doubleclick') ||
            url.includes('facebook.com') ||
            url.includes('connect.facebook.net') ||
            url.includes('analytics') ||
            url.includes('tracking') ||
            url.includes('pixel') ||
            url.includes('stats') ||
            url.includes('adsystem') ||
            url.includes('adroll') ||
            url.includes('criteo') ||
            url.includes('hotjar') ||
            url.includes('sentry')
        ) {
            req.abort();
            return;
        }

        req.continue();
    });
}

/**
 * Fast navigation: resolves as soon as the DOM is parsed instead of waiting for
 * the full `load` event, then waits only for the selector we actually care about.
 * This is dramatically faster than the default `goto` behaviour on heavy pages.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} url
 * @param {string|string[]} [waitForSelector] selector(s) to wait for; resolves on first match
 * @param {{ selectorTimeout?: number }} [options]
 */
async function gotoFast(page, url, waitForSelector, { selectorTimeout = 15000 } = {}) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (waitForSelector) {
        const selectors = Array.isArray(waitForSelector) ? waitForSelector : [waitForSelector];
        // Resolve as soon as ANY of the key selectors appears; don't fail the
        // whole scrape if it never shows (we still try to extract what we can).
        await Promise.race(
            selectors.map((sel) =>
                page.waitForSelector(sel, { timeout: selectorTimeout }).catch(() => null)
            )
        );
    }
}

/**
 * Retries an async scrape function a few times before giving up. Helps with
 * flaky proxy/network errors without slowing down the happy path.
 */
async function withRetry(fn, { retries = 2, label = 'scrape' } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.error(`[v0] ${label} attempt ${attempt + 1} failed:`, error.message);
        }
    }
    throw lastError;
}

/** Parses a numeric price out of arbitrary text. Returns null when not parseable. */
function parsePrice(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
}

module.exports = {
    generateJobId,
    setupPageFilters,
    gotoFast,
    withRetry,
    parsePrice,
};
