const { Product } = require("../models/product");
const { gotoFast, parsePrice } = require("../utils");
const { createPage } = require("./browserManager");

async function scrapAliprice(url) {
    let context;
    try {
        const created = await createPage({ proxy: true });
        context = created.context;
        const page = created.page;

        await gotoFast(page, url, "div.price--current--H7sGzqb.product-price-current");

        await page.evaluate(() => window.scrollBy(0, window.innerHeight)).catch(() => {});

        const product = new Product();
        product.url = url;

        const extracted = await page.evaluate(() => {
            const text = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent.trim() : null;
            };
            const shipEl = document.querySelector(
                'div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong'
            );
            return {
                priceRaw: text("div.price--current--H7sGzqb.product-price-current"),
                currency: text('span[class="es--char--Vcv75ku"]'),
                shippingRaw: shipEl ? shipEl.textContent.trim() : null,
            };
        });

        product.price = parsePrice(extracted.priceRaw);
        product.currency = extracted.currency;
        product.shipping_price = parsePrice(extracted.shippingRaw) ?? 0.0;

        return product;
    } catch (error) {
        console.error("[v0] ali-price scrape error:", error);
        throw error;
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapAliprice;
