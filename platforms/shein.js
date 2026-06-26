const puppeteer = require("puppeteer");
const { Product } = require("../models/product");
const { generateJobId } = require("../utils");

async function scrapeWithShein(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            userDataDir: "./tmp",
            args: ['--no-sandbox']
        });

        const page = await browser.newPage();

        await page.setCacheEnabled(false);

        // Increase navigation timeout to 60 seconds
        await page.setDefaultNavigationTimeout(120000);
        await page.goto(url);

        let product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // Extract title
        try {
            product.title = await page.evaluate(() => {
                const titleElement = document.querySelector("h1.product-intro__head-name");
                return titleElement ? titleElement.textContent?.trim() : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting title:", error);
        }

        // Extract brand
        try {
            product.brand = await page.evaluate(() => {
                const brandElement = document.querySelector("div.sc-320c5568-17.jvojBZ");
                return brandElement ? brandElement.textContent?.trim() : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting brand:", error);
        }

        // Extract image
        try {
            product.image = await page.evaluate(() => {
                const imageElement = document.querySelector("div.product-intro__thumbs-inner div.product-intro__thumbs-item img");
                return imageElement ? imageElement.getAttribute("src") : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting image:", error);
        }

        // Extract specifications
        try {
            product.specifications = await page.evaluate(() => {
                const specificationsElements = document.querySelectorAll("div.product-intro__attr-wrap div.product-intro__description-table-item");
                return Array.from(specificationsElements, (element) => element.textContent?.trim()).join("\n");
            });
        } catch (error) {
            console.error("Error occurred while extracting specifications:", error);
        }

        // Extract measurements
        try {
            product.measurements = await page.evaluate(() => {
                const measurementsElements = document.querySelectorAll("div.product-intro__size-choose.fsp-element div.product-intro__size-radio");
                return Array.from(measurementsElements, (element) => element.textContent?.trim()).join("\n");
            });
        } catch (error) {
            console.error("Error occurred while extracting measurements:", error);
        }

        // Extract estimator
        try {
            product.estimator = await page.evaluate(() => {
                const estimatorElement = document.evaluate('//p[contains(@class, "product-intro__freeshipping-time")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return estimatorElement ? estimatorElement.textContent?.trim() : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting estimator:", error);
        }

        // Extract model
        try {
            product.model = await page.evaluate(() => {
                const modelElement = document.evaluate('//div[@class="product-intro__head-sku"]//font[contains(text(), "SKU:")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return modelElement ? modelElement.textContent?.trim().replace("SKU: ", "") : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting model number:", error);
        }

        return product;
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = scrapeWithShein;
