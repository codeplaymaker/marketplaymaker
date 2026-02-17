// Test crypto signal for Solana
const cryptoData = require('./data/cryptoData');

async function test() {
  // Test parser
  const parsed = cryptoData.parseCryptoQuestion('Solana Up or Down on February 18?', '2026-02-18T17:00:00Z');
  console.log('Parser result:', JSON.stringify(parsed, null, 2));
  
  if (!parsed) {
    console.log('PARSER RETURNED NULL — bug in parser');
    return;
  }
  
  // Test full signal
  const signal = await cryptoData.getCryptoSignal({
    question: 'Solana Up or Down on February 18?',
    endDate: '2026-02-18T17:00:00Z',
    yesPrice: 0.5,
    conditionId: 'test',
  });
  
  console.log('Signal result:', JSON.stringify(signal, null, 2));
}
test().catch(e => console.error('ERROR:', e.message));
