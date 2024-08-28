const scrapSheinprice = require("./platforms/shein-price");
const scrapWithShein = require("./platforms/shein");

async function scrapeSheinData(url) {
    try {
        // Scraping Aliexpress and Ali-price concurrently
        const [sheinData, priceData] = await Promise.all([scrapWithShein(url), scrapSheinprice(url)]);

        // Constructing combined result
        const sheinResult = {
            jobId: sheinData.jobId,
            url: sheinData.url,
            title: sheinData.title,
            brand: sheinData.brand,
            image: sheinData.image,
            price: priceData.price,
            currency: priceData.currency,
            specifications: sheinData.specifications,
            measurements: sheinData.measurements,
            estimator: sheinData.estimator,
            shipping_price: priceData.shipping_price,
            model: sheinData.model,
            highlights: sheinData.highlights,
            description_images: sheinData.description_images,
            description: sheinData.description
        };

        return sheinResult;
    } catch (error) {
        throw error;
    }
}

module.exports = scrapeSheinData;
