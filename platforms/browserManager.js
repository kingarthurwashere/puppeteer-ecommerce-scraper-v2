const puppeteer = require("puppeteer");

let browser = null;
let proxyBrowser = null;

async function getBrowser() {
    if (!browser || !browser.connected || !browser.process()) {
        browser = await puppeteer.launch({
            headless: true,
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

async function getProxyBrowser() {
    if (!proxyBrowser || !proxyBrowser.connected || !proxyBrowser.process()) {
        const proxy = 'ae-pr.oxylabs.io:40000';
        proxyBrowser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            args: [
                `--proxy-server=${proxy}`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-features=site-per-process',
            ]
        });
    }
    return proxyBrowser;
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
    closeBrowsers
};
