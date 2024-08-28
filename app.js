const express = require("express");
const cors = require('cors');
const scrapWithNoon = require("./platforms/noon");
const scrapeAliexpressData = require("./scrapeAliexpressData");
const scrapeSheinData = require("./scrapeSheinData");

const app = express();
app.use(express.json());
app.use(cors());

const allowedPlatforms = ["noon", "aliexpress", "shein"];

app.post("/", async (req, res) => {
    // get platform from body
    const { url, platform } = req.body;

    // check if platform is allowed
    if (!allowedPlatforms.includes(platform)) {
        res.status(400).json({
            message: "Platform not allowed",
        });
        return;
    }

    if (!url) {
        res.status(400).json({
            message: "URL is required",
        });
        return;
    }

    // call the platform function
    if (platform === "noon") {
        let data = await scrapWithNoon(url);
        return res.json(data);
    } else if (platform === "aliexpress") {
        try {
            const combinedResult = await scrapeAliexpressData(url);
            return res.json(combinedResult);
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ message: "Internal server error" });
        }

    } else if (platform === "shein") {
        try {
            const sheinResult = await scrapeSheinData(url);
            return res.json(sheinResult);
        } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(400).json({
            message: "Platform not found",
        });
    }
});

app.listen(3001, () => {
    console.log("Server is running on port 3001");
});
