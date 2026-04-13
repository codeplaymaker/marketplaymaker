/**
 * One-time script to derive existing Polymarket CLOB API credentials.
 * Run: fly ssh console --command "node /app/bot/gen-api-key.mjs"
 */
import { ethers } from '/app/bot/node_modules/ethers/lib.esm/index.js';
import { ClobClient } from '/app/bot/node_modules/@polymarket/clob-client/dist/index.js';

const privKey = process.env.POLYGON_PRIVATE_KEY;
if (!privKey) { console.error('POLYGON_PRIVATE_KEY not set'); process.exit(1); }

const wallet = new ethers.Wallet(privKey);
Object.defineProperty(wallet, '_signTypedData', { value: (d,t,v) => wallet.signTypedData(d,t,v), writable:true, configurable:true });
console.log('Wallet:', wallet.address);

const geoToken = process.env.GEO_BLOCK_TOKEN;
const client = new ClobClient('https://clob.polymarket.com', 137, wallet, undefined, 0, wallet.address, geoToken || undefined);

const creds = await client.deriveApiKey(0);
console.log('Raw:', JSON.stringify(creds));
console.log('\nPOLY_API_KEY=' + creds?.key);
console.log('POLY_API_SECRET=' + creds?.secret);
console.log('POLY_PASSPHRASE=' + creds?.passphrase);
if (creds?.key) {
  console.log('\nfly secrets set POLY_API_KEY="' + creds.key + '" POLY_API_SECRET="' + creds.secret + '" POLY_PASSPHRASE="' + creds.passphrase + '"');
}
