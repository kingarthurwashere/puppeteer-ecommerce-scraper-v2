const scrapWithAliexpress = require("./platforms/aliexpress");

async function scrapeAliexpressData(url) {
    try {
        const aliexpressData = await scrapWithAliexpress(url);
        return aliexpressData;
    } catch (error) {
        throw error;
    }
}

module.exports = scrapeAliexpressData;
