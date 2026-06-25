const { Product } = require("../models/product");
const { generateJobId, gotoFast, parsePrice } = require("../utils");
const { createPage } = require("./browserManager");

async function scrapWithNoon(url) {
    let context;
    try {
        const created = await createPage({ proxy: false });
        context = created.context;
        const page = created.page;

        // Fast nav: resolve on DOM ready, then wait only for the price block.
        await gotoFast(page, url, [
            'div.priceNow[data-qa="div-price-now"]',
            '.sc-6562d01f-19.giwmNf',
        ]);

        const product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // Pull every field in a single page.evaluate round-trip (faster + fewer awaits).
        const extracted = await page.evaluate(() => {
            const text = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent.trim() : null;
            };
            const joinAll = (sel) =>
                Array.from(document.querySelectorAll(sel), (el) => el.textContent?.trim())
                    .filter(Boolean)
                    .join("\n");

            const priceRaw = text('div.priceNow[data-qa="div-price-now"]');
            const imgEl = document.querySelector("div.sc-d8caf424-2.fJBKzl img");
            const shipEl = document.querySelector(
                'div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong'
            );

            return {
                title: text(".sc-6562d01f-19.giwmNf"),
                brand: text(".sc-90850211-18.drjWKA"),
                image: imgEl ? imgEl.getAttribute("src") : null,
                priceRaw,
                currency: priceRaw && priceRaw.match(/[A-Z]+/) ? priceRaw.match(/[A-Z]+/)[0] : null,
                specifications: joinAll("div.sc-966c8510-0.jLcJyt"),
                highlights: joinAll("div.sc-97eb4126-1.iMnGaT"),
                estimator: text("div.estimator_first"),
                model: text("div.modelNumber"),
                shippingRaw: shipEl ? shipEl.textContent.trim() : null,
            };
        });

        product.title = extracted.title;
        product.brand = extracted.brand;
        product.image = extracted.image;
        product.price = parsePrice(extracted.priceRaw);
        product.currency = extracted.currency;
        product.specifications = extracted.specifications;
        product.highlights = extracted.highlights;
        product.estimator = extracted.estimator;
        product.model = extracted.model;
        product.shipping_price = parsePrice(extracted.shippingRaw);

        return product;
    } catch (error) {
        console.error("[v0] noon scrape error:", error);
        throw error;
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapWithNoon;
