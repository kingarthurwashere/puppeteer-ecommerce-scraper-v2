const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteerExtra.use(StealthPlugin());

let browser = null;

async function getBrowser() {
    if (!browser || !browser.connected || !browser.process()) {
        browser = await puppeteerExtra.launch({
            headless: 'new',
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-features=site-per-process',
            ]
        });
    }
    return browser;
}

async function closeBrowsers() {
    if (browser) {
        await browser.close().catch(() => {});
        browser = null;
    }
}

module.exports = {
    getBrowser,
    closeBrowsers
};
