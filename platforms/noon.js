const { Product } = require("../models/product");
const { generateJobId, setupPageFilters } = require("../utils");
const { getBrowser } = require("./browserManager");

async function scrapWithNoon(url) {
    let context;
    try {
        const browser = await getBrowser();
        context = await browser.createBrowserContext();
        const page = await context.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await setupPageFilters(page);

        // Increase navigation timeout to 120 seconds
        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url);

        let product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // Extract title
        try
        {
            product.title = await page.evaluate( () =>
            {
                const titleElement = document.querySelector( '.sc-6562d01f-19.giwmNf' );
                return titleElement ? titleElement.textContent.trim() : "Not found";
            } );
        } catch ( error )
        {
            console.error( "Error occurred while extracting title:", error );
        }


        // Extract brand
        try
        {
            product.brand = await page.evaluate( () =>
            {
                const brandElement = document.querySelector( '.sc-90850211-18.drjWKA' );
                return brandElement ? brandElement.textContent.trim() : "Not found";
            } );
        } catch ( error )
        {
            console.error( "Error occurred while extracting brand:", error );
        }


        // Extract image
        try {
            product.image = await page.evaluate(() => {
                const imageElement = document.querySelector("div.sc-d8caf424-2.fJBKzl img");
                return imageElement ? imageElement.getAttribute("src") : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting image:", error);
        }

        // Extract price
        try
        {
            product.price = await page.evaluate( () =>
            {
                const priceElement = document.querySelector( 'div.priceNow[data-qa="div-price-now"]' );
                return priceElement ? priceElement.textContent.trim() : 'Not found';
            } );
            product.price = parseFloat( product.price.replace( /[^\d.]/g, '' ) );
        } catch ( error )
        {
            console.error( "Error occurred while extracting price:", error );
        }

        // Extract currency
        try
        {
            product.currency = await page.evaluate( () =>
            {
                const currencyElement = document.querySelector( 'div.priceNow[data-qa="div-price-now"]' );
                if ( currencyElement )
                {
                    const currencyText = currencyElement.textContent.trim();
                    // Extract the currency symbol and convert it to uppercase
                    return currencyText.match( /[A-Z]+/ ) ? currencyText.match( /[A-Z]+/ )[ 0 ] : "Not found";
                } else
                {
                    return "Not found";
                }
            } );
        } catch ( error )
        {
            console.error( "Error occurred while extracting currency symbol:", error );
        }

        // Extract specifications
        try {
            product.specifications = await page.evaluate(() => {
                const specificationsElements = document.querySelectorAll("div.sc-966c8510-0.jLcJyt");
                return Array.from(specificationsElements, (element) => element.textContent?.trim()).join("\n");
            });
        } catch (error) {
            console.error("Error occurred while extracting specifications:", error);
        }

        // Extract highlights
        try {
            product.highlights = await page.evaluate(() => {
                const highlightsElements = document.querySelectorAll("div.sc-97eb4126-1.iMnGaT");
                return Array.from(highlightsElements, (element) => element.textContent?.trim()).join("\n");
            });
        } catch (error) {
            console.error("Error occurred while extracting highlights:", error);
        }

        // Extract estimator
        try {
            product.estimator = await page.evaluate(() => {
                const estimatorElement = document.querySelector("div.estimator_first");
                return estimatorElement ? estimatorElement.textContent?.trim() : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting estimator:", error);
        }

        // Extract model
        try {
            product.model = await page.evaluate(() => {
                const modelElement = document.querySelector("div.modelNumber");
                return modelElement ? modelElement.textContent?.trim() : "Not found";
            });
        } catch (error) {
            console.error("Error occurred while extracting model number:", error);
        }

        // Extract shipping price
        try {
            let shippingPriceText = await page.evaluate(() => {
                const shippingPriceElement = document.querySelector('div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong');
                return shippingPriceElement ? shippingPriceElement.textContent?.trim() : "Not found";
            });

            if (/^\d*\.?\d+$/.test(shippingPriceText)) {
                product.shipping_price = parseFloat(shippingPriceText.replace(/[^\d.]/g, ""));
            } else {
                product.shipping_price = null;
            }
        } catch (error) {
            console.error("Error occurred while extracting shipping price:", error);
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

module.exports = scrapWithNoon;
