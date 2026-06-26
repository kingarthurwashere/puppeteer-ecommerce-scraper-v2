const puppeteer = require("puppeteer");
const { Product } = require("../models/product");


async function scrapAliprice(url) {
    let browser;
    try
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
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
        product.url = url;


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
        try
        {
            product.shipping_price = await page.evaluate( () =>
            {
                const shippingPriceElement = document.querySelector( 'div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong' );
                return shippingPriceElement ? shippingPriceElement.textContent.trim() : "Not found";
            } );

            if ( product.shipping_price !== "Not found" )
            {
                product.shipping_price = parseFloat( product.shipping_price.replace( /[^\d.]/g, '' ) );
            } else
            {
                // Handle case where shipping price is not found
                // For example, you can assign a default value
                product.shipping_price = 0.0;
            }
        } catch ( error )
        {
            console.error( "Error occurred while extracting Shipping Price:", error );
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

module.exports = scrapAliprice;
