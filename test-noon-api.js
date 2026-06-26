const https = require('https');

// Test: try Noon's catalog API directly
function fetchNoonApi(sku) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.noon.com',
            path: `/uae-en/catalog/api/v1/product/${sku}/`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.noon.com/uae-en/',
                'x-country-code': 'AE',
                'x-platform': 'Desktop',
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Data:', data.substring(0, 500));
                resolve(data);
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// SKU from URL: N53339726A
fetchNoonApi('N53339726A').catch(console.error);
