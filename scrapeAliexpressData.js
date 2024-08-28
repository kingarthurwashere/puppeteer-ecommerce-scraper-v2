const scrapWithAliexpress = require("./platforms/aliexpress");
const scrapAliprice = require("./platforms/ali-price");

async function scrapeAliexpressData(url) {
    try {
        // Scraping Aliexpress and Ali-price concurrently
        const [aliexpressData, priceData] = await Promise.all([scrapWithAliexpress(url), scrapAliprice(url)]);

        // Constructing combined result
        const combinedResult = {
            jobId: aliexpressData.jobId,
            url: aliexpressData.url,
            title: aliexpressData.title,
            brand: aliexpressData.brand,
            image: aliexpressData.image,
            price: priceData.price,
            currency: priceData.currency,
            specifications: aliexpressData.specifications,
            measurements: aliexpressData.measurements,
            estimator: aliexpressData.estimator,
            shipping_price: priceData.shipping_price,
            model: aliexpressData.model,
            highlights: aliexpressData.highlights,
            description_images: aliexpressData.description_images,
            description: aliexpressData.description
        };

        return combinedResult;
    } catch (error) {
        throw error;
    }
}

module.exports = scrapeAliexpressData;
