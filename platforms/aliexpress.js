const { Product } = require("../models/product");
const { generateJobId, setupPageFilters } = require("../utils");
const { getBrowser } = require("./browserManager");

async function scrapWithAliexpress(url) {
    let context;
    try {
        const browser = await getBrowser();
        context = await browser.createBrowserContext();
        const page = await context.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await setupPageFilters(page);

        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url);

        // Scroll down
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });

        let product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // Extract title
        try {
            product.title = await page.evaluate(() => {
                const titleElement = document.querySelector(
                    'h1[data-pl="product-title"]'
                );
                return titleElement ? titleElement.textContent.trim() : null;
            });
        } catch (error) {
            console.error("Error occurred while extracting title:", error);
        }

        // Extract image
        try {
            product.image = await page.evaluate(() => {
                const imageElement = document.querySelector(
                    ".image-view--wrap--ewraVkn .slider--wrap--PM2ajTZ img"
                );
                return imageElement ? imageElement.getAttribute("src") : null;
            });
        } catch (error) {
            console.error("Error occurred while extracting image:", error);
        }

        // Extract description
        try {
            product.description = await page.evaluate(() => {
                const descriptionElement = document.querySelector('.specification--list--fiWsSyv');
                return descriptionElement ? descriptionElement.textContent.trim() : 'Not found';
            });
        } catch (error) {
            console.error("Error occurred while extracting description:", error);
        }

        // Extract description images
        try {
            product.description_images = await page.evaluate(() => {
                const imageElements = document.evaluate(
                    '//div[@id="product-description"]//img/@src',
                    document,
                    null,
                    XPathResult.ANY_TYPE,
                    null
                );
                const result = [];
                let node = imageElements.iterateNext();
                while (node) {
                    result.push(node.value);
                    node = imageElements.iterateNext();
                }
                return result;
            });
        } catch (error) {
            console.error("Error occurred while extracting description images:", error);
        }

        // Extract specifications
        try {
            product.specifications = await page.evaluate(() => {
                const specificationsElement = document.querySelector('.description--origin-part--SsZJoGC');
                return specificationsElement ? specificationsElement.textContent.trim() : 'Not found';
            });
        } catch (error) {
            console.error("Error occurred while extracting specifications:", error);
        }

        // Extract price
        try {
            const priceText = await page.evaluate(() => {
                const priceElement = document.querySelector(
                    "div.price--current--H7sGzqb.product-price-current"
                );
                return priceElement ? priceElement.textContent.trim() : null;
            });

            if (priceText) {
                product.price = parseFloat(priceText.replace(/[^\d.]/g, ""));
            }
        } catch (error) {
            console.error("Error occurred while extracting price:", error);
        }

        // Extract currency
        try {
            product.currency = await page.evaluate(() => {
                const currencyElement = document.querySelector(
                    'span[class="es--char--Vcv75ku"]'
                );
                return currencyElement ? currencyElement.textContent.trim() : null;
            });
        } catch (error) {
            console.error("Error occurred while extracting currency:", error);
        }

        // Extract shipping price
        try {
            let shippingPriceText = await page.evaluate(() => {
                const shippingPriceElement = document.querySelector('div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong');
                return shippingPriceElement ? shippingPriceElement.textContent.trim() : "Not found";
            });

            if (shippingPriceText !== "Not found") {
                product.shipping_price = parseFloat(shippingPriceText.replace(/[^\d.]/g, ''));
            } else {
                product.shipping_price = 0.0;
            }
        } catch (error) {
            console.error("Error occurred while extracting Shipping Price:", error);
        }

        return product;
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapWithAliexpress;
