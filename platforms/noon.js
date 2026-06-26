const { Product } = require("../models/product");
const { generateJobId } = require("../utils");
const { getBrowser } = require("./browserManager");

async function scrapWithNoon(url) {
    let context;
    try {
        const browser = await getBrowser();
        context = await browser.createBrowserContext();
        const page = await context.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });

        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for JS hydration
        await new Promise(r => setTimeout(r, 2000));


        let product = new Product();
        product.jobId = generateJobId();
        product.url = url;

        // ────────────────────────────────────────────────
        // Strategy 1: Extract from embedded JSON-LD schema
        // (most reliable – won't break when CSS classes change)
        // ────────────────────────────────────────────────
        let schemaData = null;
        try {
            schemaData = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const json = JSON.parse(script.textContent);
                        if (json['@type'] === 'Product') return json;
                        // Handle array form
                        if (Array.isArray(json)) {
                            const prod = json.find(j => j['@type'] === 'Product');
                            if (prod) return prod;
                        }
                    } catch (e) {}
                }
                // Also try __next_s inline scripts
                const allScripts = document.querySelectorAll('script:not([src])');
                for (const script of allScripts) {
                    const txt = script.textContent;
                    if (txt && txt.includes('"@type":"Product"')) {
                        // Extract JSON block manually
                        const start = txt.indexOf('{"@context');
                        if (start === -1) continue;
                        try {
                            // Find matching closing brace
                            let depth = 0, end = -1;
                            for (let i = start; i < txt.length; i++) {
                                if (txt[i] === '{') depth++;
                                else if (txt[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
                            }
                            if (end !== -1) {
                                const parsed = JSON.parse(txt.substring(start, end + 1));
                                if (parsed['@type'] === 'Product') return parsed;
                            }
                        } catch (e) {}
                    }
                }
                return null;
            });
        } catch (error) {
            console.error("Error extracting JSON-LD schema:", error);
        }

        if (schemaData) {
            // Title from schema
            if (schemaData.name && !product.title) {
                product.title = schemaData.name;
            }
            // Brand from schema
            if (schemaData.brand && schemaData.brand.name && !product.brand) {
                product.brand = schemaData.brand.name;
            }
            // Image from schema
            if (schemaData.image && !product.image) {
                product.image = Array.isArray(schemaData.image) ? schemaData.image[0] : schemaData.image;
            }
            // Price from schema offers
            if (schemaData.offers && !product.price) {
                const offer = Array.isArray(schemaData.offers) ? schemaData.offers[0] : schemaData.offers;
                if (offer && offer.price) {
                    product.price = parseFloat(offer.price);
                    product.currency = offer.priceCurrency || null;
                }
            }
        }

        // ────────────────────────────────────────────────
        // Strategy 2: DOM fallbacks (hash-agnostic selectors)
        // ────────────────────────────────────────────────

        // Extract title – use h1 as stable semantic selector
        if (!product.title) {
            try {
                product.title = await page.evaluate(() => {
                    // Primary: first h1 inside pdp-container
                    const pdp = document.querySelector('[data-qa="pdp-container"]');
                    const h1 = pdp ? pdp.querySelector('h1') : document.querySelector('h1');
                    return h1 ? h1.textContent.trim() : null;
                });
            } catch (error) {
                console.error("Error extracting title:", error);
            }
        }

        // Extract brand – look for a link inside pdp whose class contains "Brand"
        if (!product.brand) {
            try {
                product.brand = await page.evaluate(() => {
                    const pdp = document.querySelector('[data-qa="pdp-container"]');
                    if (!pdp) return null;
                    // Brand is typically an anchor with class containing "Brand"
                    const brandEl = pdp.querySelector('[class*="Brand"] a, [class*="brand"] a, a[class*="Brand"]');
                    if (brandEl) return brandEl.textContent.trim() || null;
                    // Fallback: look for an element with class containing "brandName"
                    const brandName = pdp.querySelector('[class*="brandName"], [class*="BrandName"]');
                    return brandName ? brandName.textContent.trim() : null;
                });
            } catch (error) {
                console.error("Error extracting brand:", error);
            }
        }

        // Extract image – first product image from nooncdn.com/p/
        if (!product.image) {
            try {
                product.image = await page.evaluate(() => {
                    // Product images come from nooncdn.com/p/ (not /s/ which is icons/assets)
                    const imgs = document.querySelectorAll('img[src*="nooncdn.com/p/"]');
                    return imgs.length > 0 ? imgs[0].getAttribute('src') : null;
                });
            } catch (error) {
                console.error("Error extracting image:", error);
            }
        }

        // Extract price – partial class match for "priceNow" or "Price" elements
        if (!product.price) {
            try {
                const priceText = await page.evaluate(() => {
                    // Try known partial class name patterns (hash-agnostic)
                    const selectors = [
                        '[class*="priceNow"]',
                        '[class*="PriceNow"]',
                        '[class*="currentPrice"]',
                        '[class*="CurrentPrice"]',
                        '[class*="salePrice"]',
                        '[class*="SalePrice"]',
                        '[data-qa*="price"]',
                    ];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el) {
                            const text = el.textContent.trim();
                            if (text && text.match(/\d/)) return text;
                        }
                    }
                    // Last resort: search innerText for AED pattern
                    const match = document.body.innerText.match(/AED\s*([\d,]+\.?\d*)/);
                    return match ? match[0] : null;
                });

                if (priceText) {
                    product.price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                }
            } catch (error) {
                console.error("Error extracting price:", error);
            }
        }

        // Extract currency from page body text
        if (!product.currency) {
            try {
                product.currency = await page.evaluate(() => {
                    // Noon UAE typically shows "AED" – check body text
                    const match = document.body.innerText.match(/\b(AED|SAR|USD|EUR|GBP)\b/);
                    return match ? match[1] : null;
                });
            } catch (error) {
                console.error("Error extracting currency:", error);
            }
        }

        // Extract specifications – look for any table or spec-list in PDP
        try {
            product.specifications = await page.evaluate(() => {
                const pdp = document.querySelector('[data-qa="pdp-container"]');
                if (!pdp) return null;
                // Try class-based partial match
                const specEl = pdp.querySelector('[class*="specification" i], [class*="Specification" i], [class*="spec-" i], table');
                if (specEl) return specEl.textContent.trim() || null;
                return null;
            });
        } catch (error) {
            console.error("Error extracting specifications:", error);
        }

        // Extract highlights – look for ul/li lists in the PDP description area
        try {
            product.highlights = await page.evaluate(() => {
                const pdp = document.querySelector('[data-qa="pdp-container"]');
                if (!pdp) return null;
                const highlightEl = pdp.querySelector('[class*="highlight" i], [class*="Highlight" i], [class*="feature" i], [class*="Feature" i]');
                if (highlightEl) return highlightEl.textContent.trim() || null;
                return null;
            });
        } catch (error) {
            console.error("Error extracting highlights:", error);
        }

        // Extract estimator (delivery date)
        try {
            product.estimator = await page.evaluate(() => {
                const pdp = document.querySelector('[data-qa="pdp-container"]');
                if (!pdp) return null;
                const estimEl = pdp.querySelector('[class*="estimat" i], [class*="Estimat" i], [class*="delivery" i], [class*="Delivery" i]');
                if (estimEl) return estimEl.textContent.trim() || null;
                return null;
            });
        } catch (error) {
            console.error("Error extracting estimator:", error);
        }

        // Extract model number
        try {
            product.model = await page.evaluate(() => {
                const pdp = document.querySelector('[data-qa="pdp-container"]');
                if (!pdp) return null;
                // Look for text containing "Model" or "SKU"
                const walker = document.createTreeWalker(pdp, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                    const text = node.nodeValue;
                    if (text && text.match(/Model\s*[:#]/i)) {
                        return text.trim();
                    }
                }
                return null;
            });
        } catch (error) {
            console.error("Error extracting model:", error);
        }

        // Extract shipping price
        try {
            let shippingText = await page.evaluate(() => {
                const pdp = document.querySelector('[data-qa="pdp-container"]');
                if (!pdp) return null;
                const shippingEl = pdp.querySelector('[class*="shipping" i], [class*="Shipping" i]');
                if (shippingEl) return shippingEl.textContent.trim() || null;
                return null;
            });

            if (shippingText) {
                const numMatch = shippingText.match(/[\d.]+/);
                product.shipping_price = numMatch ? parseFloat(numMatch[0]) : null;
            }
        } catch (error) {
            console.error("Error extracting shipping price:", error);
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
