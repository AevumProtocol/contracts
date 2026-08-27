require('dotenv').config();
const ATLAS_API_KEY = process.env.ATLAS_API_KEY;
const FEED_ID = 626;

async function main() {
  if (!ATLAS_API_KEY) { console.error("No ATLAS_API_KEY"); process.exit(1); }
  
  const endpoints = [
    `https://api.atlasoracle.io/v1/feeds/${FEED_ID}/price`,
    `https://api.atlasoracle.io/feeds/${FEED_ID}/price`,
    `https://api.atlasoracle.io/v1/price?feedId=${FEED_ID}`,
    `https://api.atlasoracle.io/v1/pull/${FEED_ID}`,
  ];

  for (const url of endpoints) {
    try {
      console.log("\nTrying:", url);
      const r = await fetch(url, { headers: { "Authorization": `Bearer ${ATLAS_API_KEY}`, "X-API-Key": ATLAS_API_KEY } });
      console.log("Status:", r.status);
      const t = await r.text();
      console.log("Body:", t.slice(0, 300));
    } catch(e) { console.log("Error:", e.message); }
  }
}
main();
