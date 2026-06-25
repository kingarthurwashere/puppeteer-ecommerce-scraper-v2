const express = require("express");
const cors = require("cors");
const scrapWithNoon = require("./platforms/noon");
const scrapeAliexpressData = require("./scrapeAliexpressData");
const scrapeSheinData = require("./scrapeSheinData");
const { withRetry } = require("./utils");
const { closeBrowsers } = require("./platforms/browserManager");

const app = express();
app.use(express.json());
app.use(cors());

const scrapers = {
    noon: scrapWithNoon,
    aliexpress: scrapeAliexpressData,
    shein: scrapeSheinData,
};

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/", async (req, res) => {
    const { url, platform } = req.body || {};

    const scraper = scrapers[platform];
    if (!scraper) {
        return res.status(400).json({ message: "Platform not allowed" });
    }
    if (!url) {
        return res.status(400).json({ message: "URL is required" });
    }

    try {
        const data = await withRetry(() => scraper(url), { retries: 2, label: platform });
        return res.json(data);
    } catch (error) {
        console.error(`[v0] ${platform} request failed:`, error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

const server = app.listen(3001, () => {
    console.log("Server is running on port 3001");
});

// Gracefully tear down the pooled browsers on shutdown.
async function shutdown() {
    await closeBrowsers().catch(() => {});
    server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
