const fs = require('fs');
const content = fs.readFileSync('C:/Users/King Arthur/.gemini/antigravity-ide/brain/88e223da-f4ba-4427-a2a5-8698f9791940/.system_generated/steps/50/content.md', 'utf8');

const pdpIdx = content.indexOf('pdp-container');
// Get a larger slice of the PDP section
const snippet = content.substring(pdpIdx, pdpIdx + 80000);

// Find sections by keyword patterns
const keywords = ['price', 'Price', 'AED', 'SAR', 'USD', 'currency', 'shipping', 'Shipping', 
                   'brand', 'Brand', 'specification', 'Specification', 'highlight', 'Highlight',
                   'model', 'estimat', 'delivery', 'Delivery'];

// Find data-testid or similar 
const testidMatches = snippet.match(/data-testid="[^"]+"/g) || [];
const uniqueTestids = [...new Set(testidMatches)];
console.log('=== data-testid attributes ===');
uniqueTestids.forEach(m => console.log(m));

// Find data-qa in PDP
const dqMatches = snippet.match(/data-qa="[^"]+"/g) || [];
const uniqueDqs = [...new Set(dqMatches)];
console.log('\n=== data-qa in PDP ===');
uniqueDqs.forEach(m => console.log(m));

// Find any tag containing "Price" or "AED"
const aedIdx = snippet.indexOf('AED');
if (aedIdx > -1) {
  console.log('\n=== AED context (2000 chars) ===');
  console.log(snippet.substring(Math.max(0, aedIdx - 200), aedIdx + 800));
}

// Look for spans/divs that look like price containers
const priceContexts = snippet.match(/<[^>]*[Pp]rice[^>]*>[^<]{0,200}/g) || [];
console.log('\n=== Price-containing elements ===');
priceContexts.slice(0, 20).forEach(p => console.log(p.substring(0, 300)));

// Find img tags in PDP
const imgMatches = snippet.match(/<img[^>]+nooncdn[^>]+>/g) || [];
console.log('\n=== Product Images ===');
imgMatches.slice(0, 5).forEach(m => console.log(m.substring(0, 300)));
