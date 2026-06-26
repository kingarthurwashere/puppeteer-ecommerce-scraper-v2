const scrapeAliexpressData = require("./scrapeAliexpressData");
const scrapeSheinData = require("./scrapeSheinData");
const scrapWithNoon = require("./platforms/noon");
const { closeBrowsers } = require("./platforms/browserManager");

const platform = process.argv[2];
const url = process.argv[3];

if (!platform || !url) {
    console.error("Usage: node test-scraper.js <noon|aliexpress|shein> <product_url>");
    process.exit(1);
}

async function run() {
    console.log(`Starting scraping for platform: ${platform} with URL: ${url}`);
    let result;
    try {
        if (platform === "noon") {
            result = await scrapWithNoon(url);
        } else if (platform === "aliexpress") {
            result = await scrapeAliexpressData(url);
        } else if (platform === "shein") {
            result = await scrapeSheinData(url);
        } else {
            console.error(`Unknown platform: ${platform}`);
            process.exit(1);
        }
        console.log("Scraping completed successfully!");
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Scraping failed with error:", err);
    } finally {
        // Clean up browsers
        await closeBrowsers();
    }
}

run();
