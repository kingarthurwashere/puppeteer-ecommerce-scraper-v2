const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

async function test() {
    const browser = await puppeteerExtra.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setDefaultNavigationTimeout(60000);

    const response = await page.goto('https://www.noon.com/uae-en/iphone-15-128gb-blue-5g-with-facetime-international-version/N53339726A/p/', { waitUntil: 'domcontentloaded' });

    console.log('HTTP Status:', response.status());
    const title = await page.title();
    console.log('Page title:', title);

    const h1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => 'no h1');
    console.log('h1 text:', h1);

    // Dump first 3000 chars of body text
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('Body text:', bodyText);

    await browser.close();
}

test().catch(console.error);
