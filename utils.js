function generateJobId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `job_${timestamp}_${random}`;
}

async function setupPageFilters(page) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url().toLowerCase();
        
        // Block non-essential resource types
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
            return;
        }
        
        // Block analytics, tracking, ads, and social pixels
        if (
            url.includes('google-analytics') ||
            url.includes('doubleclick') ||
            url.includes('facebook.com') ||
            url.includes('connect.facebook.net') ||
            url.includes('analytics') ||
            url.includes('tracking') ||
            url.includes('pixel') ||
            url.includes('stats') ||
            url.includes('adsystem') ||
            url.includes('adroll') ||
            url.includes('criteo')
        ) {
            req.abort();
            return;
        }
        
        req.continue();
    });
}

module.exports = {
    generateJobId,
    setupPageFilters
};

