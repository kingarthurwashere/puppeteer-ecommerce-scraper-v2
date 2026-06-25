const { Product } = require("../models/product");
const { generateJobId, gotoFast, parsePrice } = require("../utils");
const { createPage } = require("./browserManager");

async function scrapWithAliexpress(url) {
    let context;
    try {
        const created = await createPage({ proxy: true });
        context = created.context;
        const page = created.page;

        // Fast nav: resolve on DOM ready, then wait only for the product title.
        await gotoFast(page, url, 'h1[data-pl="product-title"]');

        // Trigger lazy-loaded description content.
        await page.evaluate(() => window.scrollBy(0, window.innerHeight)).catch(() => {});

        const product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        const extracted = await page.evaluate(() => {
            const text = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent.trim() : null;
            };

            const imgEl = document.querySelector(
                ".image-view--wrap--ewraVkn .slider--wrap--PM2ajTZ img"
            );
            const shipEl = document.querySelector(
                'div[data-pl="product-shipping"] div.dynamic-shipping div.dynamic-shipping-line.dynamic-shipping-titleLayout span strong'
            );

            const descImages = [];
            const it = document.evaluate(
                '//div[@id="product-description"]//img/@src',
                document,
                null,
                XPathResult.ANY_TYPE,
                null
            );
            let node = it.iterateNext();
            while (node) {
                descImages.push(node.value);
                node = it.iterateNext();
            }

            return {
                title: text('h1[data-pl="product-title"]'),
                image: imgEl ? imgEl.getAttribute("src") : null,
                description: text(".specification--list--fiWsSyv"),
                specifications: text(".description--origin-part--SsZJoGC"),
                priceRaw: text("div.price--current--H7sGzqb.product-price-current"),
                currency: text('span[class="es--char--Vcv75ku"]'),
                shippingRaw: shipEl ? shipEl.textContent.trim() : null,
                description_images: descImages,
            };
        });

        product.title = extracted.title;
        product.image = extracted.image;
        product.description = extracted.description;
        product.specifications = extracted.specifications;
        product.price = parsePrice(extracted.priceRaw);
        product.currency = extracted.currency;
        product.shipping_price = parsePrice(extracted.shippingRaw) ?? 0.0;
        product.description_images = extracted.description_images;

        return product;
    } catch (error) {
        console.error("[v0] aliexpress scrape error:", error);
        throw error;
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapWithAliexpress;
