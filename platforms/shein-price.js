const puppeteer = require("puppeteer");
const { Product } = require("../models/product");

async function scrapSheinprice(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setCacheEnabled(false);

        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url);

        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight); // Scrolls down by the height of the viewport
        });

        let product = new Product();
        product.url = url;

        // Extract price
        try
        {
            product.price = await page.evaluate( () =>
            {
                const priceElement = document.querySelector( 'div.product-intro__head-mainprice div.original span' );
                return priceElement ? priceElement.textContent.trim() : 'Not found';
            } );
            product.price = parseFloat( product.price.replace( /[^\d.]/g, '' ) );
        } catch ( error )
        {
            console.error( "Error occurred while extracting price:", error );
        }
        // Extract currency
        try {
            product.currency = await page.evaluate(() => {
                const currencyElement = document.querySelector('div.product-intro__head-mainprice div.original span');
                if (currencyElement) {
                    const currencyText = currencyElement.textContent.trim();
                    // Extract the currency symbol and convert it to uppercase
                    return currencyText.match(/[A-Z]+/) ? currencyText.match(/[A-Z]+/)[0] : "Not found";
                } else {
                    return "Not found";
                }
            });
        } catch (error) {
            console.error("Error occurred while extracting currency symbol:", error);
        }

        // Extract shipping price
        try {
            let shippingPriceText = await page.evaluate(() => {
                const shippingPriceElement = document.evaluate('//div[@class="shipping-price"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = scrapSheinprice;
