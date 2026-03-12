const http = require('http');

function fetch(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:4000${path}`, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('=== FETCHING ALL SIGNALS ===\n');

  // 1. Status
  try {
    const status = await fetch('/api/status');
    console.log(`📊 Markets loaded: ${status.markets}`);
    console.log(`🔍 Scanner edges found: ${status.scannerState?.edgesFound || 0}`);
    
    const edges = status.scannerState?.lastEdges || [];
    if (edges.length) {
      console.log('\n🏆 TOP SCANNER EDGES (sorted by edge size):');
      console.log('─'.repeat(80));
      edges
        .sort((a,b) => Math.abs(b.edge) - Math.abs(a.edge))
        .forEach((e, i) => {
          const dir = e.edge > 0 ? 'BUY YES' : 'BUY NO ';
          console.log(`  ${i+1}. ${dir} | Edge: ${e.edge > 0 ? '+' : ''}${e.edge?.toFixed(1)}pp | Quality: ${e.quality}/100`);
          console.log(`     Market: ${e.question?.slice(0, 70)}`);
          console.log(`     Fair: ${(e.fairProb * 100)?.toFixed(0)}% vs Market: ${(e.marketProb * 100)?.toFixed(0)}% | Sources: ${e.sources}`);
          console.log('');
        });
    }
  } catch(e) { console.log('Status error:', e.message); }

  // 2. YouTube trending
  try {
    console.log('\n🎬 YOUTUBE TRENDING MARKETS:');
    console.log('─'.repeat(80));
    const yt = await fetch('/api/intel/youtube/trending');
    if (yt.markets?.length) {
      yt.markets.forEach((m, i) => {
        const edge = m.edge ? `${m.edge > 0 ? '+' : ''}${(m.edge * 100).toFixed(1)}%` : 'N/A';
        console.log(`  ${i+1}. ${m.question?.slice(0, 70)}`);
        console.log(`     Probability: ${(m.probability * 100)?.toFixed(0)}% | Market Price: ${(m.marketPrice * 100)?.toFixed(0)}¢ | Edge: ${edge}`);
        console.log(`     Signal: ${m.signal || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No YouTube markets found');
    }
  } catch(e) { console.log('YouTube error:', e.message); }

  // 3. Twitter trending
  try {
    console.log('\n🐦 TWITTER TRENDING MARKETS:');
    console.log('─'.repeat(80));
    const tw = await fetch('/api/intel/twitter/trending');
    if (tw.markets?.length) {
      tw.markets.forEach((m, i) => {
        const edge = m.edge ? `${m.edge > 0 ? '+' : ''}${(m.edge * 100).toFixed(1)}%` : 'N/A';
        console.log(`  ${i+1}. ${m.question?.slice(0, 70)}`);
        console.log(`     Probability: ${(m.probability * 100)?.toFixed(0)}% | Market Price: ${(m.marketPrice * 100)?.toFixed(0)}¢ | Edge: ${edge}`);
        console.log(`     Signal: ${m.signal || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('  No Twitter markets found');
    }
  } catch(e) { console.log('Twitter error:', e.message); }

  // 4. Paper trades
  try {
    console.log('\n📋 RECENT PAPER TRADES:');
    console.log('─'.repeat(80));
    const pt = await fetch('/api/paper/trades');
    const recent = (pt.trades || pt || []).slice(-5);
    recent.forEach(t => {
      console.log(`  ${t.side} ${t.outcome} @ ${t.price} | Edge: ${t.edge?.toFixed(1)}pp | ${t.question?.slice(0, 50)}`);
    });
    if (!recent.length) console.log('  No paper trades yet');
  } catch(e) { console.log('Paper trades error:', e.message); }

  // 5. Independent signal edges  
  try {
    console.log('\n🧠 INDEPENDENT SIGNAL EDGES:');
    console.log('─'.repeat(80));
    const intel = await fetch('/api/intel/independent/edges');
    const intelEdges = intel.edges || intel || [];
    if (Array.isArray(intelEdges)) {
      intelEdges.slice(0, 10).forEach((e, i) => {
        console.log(`  ${i+1}. Edge: ${e.edge > 0 ? '+' : ''}${e.edge?.toFixed(1)}pp | ${e.question?.slice(0, 60)}`);
      });
    }
    if (!intelEdges.length) console.log('  No independent edges found');
  } catch(e) { console.log('Independent edges error:', e.message); }

  console.log('\n' + '='.repeat(80));
  console.log('💰 SUMMARY: Check the top edges above for the best opportunities today!');
  console.log('='.repeat(80));
}

main().catch(console.error);
