const { Product } = require("../models/product");
const { generateJobId, gotoFast } = require("../utils");
const { createPage } = require("./browserManager");

async function scrapeWithShein(url) {
    let context;
    try {
        const created = await createPage({ proxy: false });
        context = created.context;
        const page = created.page;

        await gotoFast(page, url, "h1.product-intro__head-name");

        const product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        const extracted = await page.evaluate(() => {
            const text = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent?.trim() : null;
            };
            const joinAll = (sel) =>
                Array.from(document.querySelectorAll(sel), (el) => el.textContent?.trim())
                    .filter(Boolean)
                    .join("\n");
            const xpathText = (xpath) => {
                const node = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
                return node ? node.textContent?.trim() : null;
            };

            const imgEl = document.querySelector(
                "div.product-intro__thumbs-inner div.product-intro__thumbs-item img"
            );
            const model = xpathText(
                '//div[@class="product-intro__head-sku"]//font[contains(text(), "SKU:")]'
            );

            return {
                title: text("h1.product-intro__head-name"),
                brand: text("div.sc-320c5568-17.jvojBZ"),
                image: imgEl ? imgEl.getAttribute("src") : null,
                specifications: joinAll(
                    "div.product-intro__attr-wrap div.product-intro__description-table-item"
                ),
                measurements: joinAll(
                    "div.product-intro__size-choose.fsp-element div.product-intro__size-radio"
                ),
                estimator: xpathText('//p[contains(@class, "product-intro__freeshipping-time")]'),
                model: model ? model.replace("SKU: ", "") : null,
            };
        });

        Object.assign(product, extracted);

        return product;
    } catch (error) {
        console.error("[v0] shein scrape error:", error);
        throw error;
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }
    }
}

module.exports = scrapeWithShein;
