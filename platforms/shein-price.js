const { Product } = require("../models/product");
const { gotoFast, parsePrice } = require("../utils");
const { createPage } = require("./browserManager");

async function scrapSheinprice(url) {
    let context;
    try {
        const created = await createPage({ proxy: true });
        context = created.context;
        const page = created.page;

        await gotoFast(page, url, "div.product-intro__head-mainprice div.original span");

        const product = new Product();
        product.url = url;

        const extracted = await page.evaluate(() => {
            const priceEl = document.querySelector(
                "div.product-intro__head-mainprice div.original span"
            );
            const priceRaw = priceEl ? priceEl.textContent.trim() : null;

            const shipNode = document.evaluate(
                '//div[@class="shipping-price"]',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            return {
                priceRaw,
                currency: priceRaw && priceRaw.match(/[A-Z]+/) ? priceRaw.match(/[A-Z]+/)[0] : null,
                shippingRaw: shipNode ? shipNode.textContent?.trim() : null,
            };
        });

        product.price = parsePrice(extracted.priceRaw);
        product.currency = extracted.currency;
        product.shipping_price = parsePrice(extracted.shippingRaw);

        return product;
    } catch (error) {
        console.error("[v0] shein-price scrape error:", error);
        throw error;
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapSheinprice;
