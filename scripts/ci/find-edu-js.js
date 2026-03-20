/**
 * Downloads the latest PICO-8 Education Edition player JS from pico-8-edu.com.
 * Run with: node scripts/ci/find-edu-js.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const INDEX_URL = 'https://www.pico-8-edu.com/';
const PUBLIC_DIR = path.join(__dirname, '../../public');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching index to find current edu player version...');
  const html = await fetchText(INDEX_URL);

  const match = html.match(/['"]\/play\/(pico8_edu[^'"]+\.js)['"]/);
  if (!match) {
    console.error('Could not find edu player JS path in page HTML.');
    process.exit(1);
  }

  const jsPath = match[1];
  const jsUrl = `https://www.pico-8-edu.com/play/${jsPath}`;
  const outFile = path.join(PUBLIC_DIR, 'pico8_edu.js');

  console.log(`Found: ${jsPath}`);
  console.log(`Downloading from ${jsUrl}...`);

  const buf = await fetchBinary(jsUrl);
  fs.writeFileSync(outFile, buf);
  console.log(`Saved to public/pico8_edu.js (${buf.length} bytes)`);
}

main().catch(e => { console.error(e); process.exit(1); });

