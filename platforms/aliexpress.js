const puppeteer = require("puppeteer");
const { Product } = require("../models/product");
const generateJobId = require("../utils");

async function scrapWithAliexpress(url) {
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
        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url);

        await page.evaluate( () =>
        {
            window.scrollBy( 0, window.innerHeight ); // Scrolls down by the height of the viewport
        } );

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
        try
        {
            product.description = await page.evaluate( () =>
            {
                const descriptionElement = document.querySelector( '.specification--list--fiWsSyv' );
                return descriptionElement ? descriptionElement.textContent.trim() : 'Not found';
            } );
        } catch ( error )
        {
            console.error( "Error occurred while extracting description:", error );
        }

        try
        {
            product.description_images = await page.evaluate( () =>
            {
                const imageElements = document.evaluate(
                    '//div[@id="product-description"]//img/@src',
                    document,
                    null,
                    XPathResult.ANY_TYPE,
                    null
                );
                const result = [];
                let node = imageElements.iterateNext();
                while ( node )
                {
                    result.push( node.value );
                    node = imageElements.iterateNext();
                }
                return result;
            } );
        } catch ( error )
        {
            console.error(
                "Error occurred while extracting description images:",
                error
            );
        }
        // Extract specifictions
        try
        {
            product.specifications = await page.evaluate( () =>
            {
                const specificationsElement = document.querySelector( '.description--origin-part--SsZJoGC' );
                return specificationsElement ? specificationsElement.textContent.trim() : 'Not found';
            } );
        } catch ( error )
        {
            console.error( "Error occurred while extracting specifications:", error );
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

module.exports = scrapWithAliexpress;
