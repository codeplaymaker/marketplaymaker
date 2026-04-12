"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[652],{4652:(e,r,i)=>{i.r(r),i.d(r,{default:()=>X});var t=i(9950),n=i(8429),o=i(4937),s=i(2856),d=i(1095),a=i(8354),l=i(158),c=i(4813),x=i(6335),m=i(734),h=i(4414);const g=o.i7`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`,p=o.i7`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`,f=o.i7`
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.1); }
  50%      { box-shadow: 0 0 40px rgba(99,102,241,0.25); }
`,b=o.Ay.div`
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`,j=o.Ay.section`
  padding: 2.5rem 1rem 2rem;
  text-align: center;
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(99,102,241,0.1);
  @media (min-width: 768px) { padding: 4rem 2rem 3rem; }
`,u=o.Ay.h1`
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.5rem;
  animation: ${g} 0.6s ease-out;
`,v=o.Ay.p`
  color: #94a3b8;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  max-width: 640px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  animation: ${g} 0.6s ease-out 0.1s backwards;
`,y=o.Ay.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.3);
  color: #22c55e;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  animation: ${g} 0.6s ease-out 0.2s backwards;
  &::before {
    content: '';
    width: 8px; height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: ${p} 2s infinite;
  }
`,k=o.Ay.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0.75rem;
  @media (min-width: 768px) { padding: 2rem; }
`,w=o.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 2rem;
  animation: ${g} 0.6s ease-out 0.3s backwards;
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
`,$=o.Ay.div`
  background: rgba(15,15,25,0.8);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s;
  animation: ${f} 4s infinite;
  &:hover { border-color: rgba(99,102,241,0.4); transform: translateY(-2px); }
`,A=o.Ay.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.$color||"#fff"};
  margin-bottom: 0.25rem;
`,S=o.Ay.div`
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,z=o.Ay.section`
  margin-bottom: 2.5rem;
  animation: ${g} 0.6s ease-out ${e=>e.$delay||"0.4s"} backwards;
`,W=o.Ay.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,P=o.Ay.div`
  background: rgba(15,15,25,0.8);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 12px;
  padding: 1rem;
  overflow: hidden;
  @media (min-width: 768px) { padding: 1.5rem; }
`,R=o.Ay.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`,M=o.Ay.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`,C=o.Ay.th`
  text-align: left;
  padding: 0.75rem;
  color: #64748b;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
`,L=o.Ay.td`
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #cbd5e1;
  max-width: 300px;
  &:first-child {
    max-width: 350px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`,T=o.Ay.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  ${e=>"BUY_YES"===e.$dir?o.AH`background: rgba(34,197,94,0.12); color: #22c55e;`:o.AH`background: rgba(239,68,68,0.12); color: #ef4444;`}
`,B=o.Ay.span`
  font-weight: 600;
  color: ${e=>e.$val>0?"#22c55e":e.$val<0?"#ef4444":"#64748b"};
`,F=o.Ay.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  ${e=>"A+"===e.$grade||"A"===e.$grade?o.AH`background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3);`:"B+"===e.$grade||"B"===e.$grade?o.AH`background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);`:"C+"===e.$grade||"C"===e.$grade?o.AH`background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);`:o.AH`background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3);`}
`,E=o.Ay.div`
  display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`,D=o.Ay.div`
  flex: 1; height: 8px; border-radius: 4px;
  background: rgba(255,255,255,0.05);
`,I=o.Ay.div`
  height: 8px; border-radius: 4px;
  background: ${e=>e.$color||"#6366f1"};
  width: ${e=>e.$width||"0%"};
  transition: width 1s ease-out;
`,G=o.Ay.div`
  display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
`,O=o.Ay.button`
  background: ${e=>e.$active?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)"};
  color: ${e=>e.$active?"#a5b4fc":"#64748b"};
  border: 1px solid ${e=>e.$active?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.08)"};
  padding: 0.5rem 1.25rem; border-radius: 8px;
  font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(99,102,241,0.15); color: #a5b4fc; }
`,_=o.Ay.details`
  margin-bottom: 2.5rem;
  animation: ${g} 0.6s ease-out ${e=>e.$delay||"0.4s"} backwards;
  & > summary {
    cursor: pointer;
    font-size: 1.4rem;
    font-weight: 700;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    list-style: none;
    &::-webkit-details-marker { display: none; }
    &::after {
      content: '\\25B8';
      transition: transform 0.2s;
      font-size: 1rem;
      color: #64748b;
      margin-left: auto;
    }
  }
  &[open] > summary::after { transform: rotate(90deg); }
`,H=o.Ay.section`
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.06) 100%);
  border-top: 1px solid rgba(99,102,241,0.1);
`,Y=o.Ay.button`
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white; border: none;
  padding: 0.9rem 2.5rem; border-radius: 10px;
  font-size: 1.1rem; font-weight: 600; cursor: pointer;
  transition: all 0.3s; margin-top: 1rem;
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.4); }
`,U=o.Ay.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh; color: #64748b; font-size: 1.1rem;
  &::after {
    content: ''; width: 24px; height: 24px;
    border: 3px solid rgba(99,102,241,0.3);
    border-top-color: #6366f1; border-radius: 50%;
    margin-left: 1rem; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`,N=o.Ay.div`
  text-align: center; padding: 3rem; color: #64748b;
  font-size: 0.95rem; line-height: 1.6;
`,q=o.Ay.footer`
  text-align: center; padding: 2rem; color: #475569;
  font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05);
`,K=o.Ay.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.4rem 0; font-size: 0.85rem;
`,V=o.Ay.span`
  color: #64748b; min-width: 90px;
  font-family: 'SF Mono', monospace; font-size: 0.8rem;
`,Q=o.Ay.div`
  flex: 1; height: 6px; border-radius: 3px;
  background: rgba(99,102,241,0.3);
  width: ${e=>e.$width||"0%"};
  max-width: ${e=>e.$width||"0%"};
  transition: width 1s ease-out;
`,Z=o.Ay.span`
  color: #a5b4fc; font-weight: 600;
  min-width: 30px; text-align: right;
`;function J(e){var r;let{active:i,payload:t}=e;if(!i||null===t||void 0===t||!t[0])return null;const n=t[0].payload;return(0,h.jsxs)("div",{style:{background:"#1a1a2e",border:"1px solid rgba(99,102,241,0.3)",borderRadius:8,padding:"0.6rem 0.85rem",fontSize:"0.8rem"},children:[(0,h.jsx)("div",{style:{color:"#94a3b8",marginBottom:2},children:n.date}),(0,h.jsxs)("div",{style:{color:n.cumPnL>=0?"#22c55e":"#ef4444",fontWeight:700},children:[n.cumPnL>=0?"+":"","$",null===(r=n.cumPnL)||void 0===r?void 0:r.toFixed(2)]}),n.strategy&&(0,h.jsxs)("div",{style:{color:"#64748b",fontSize:"0.7rem",marginTop:2},children:[n.won?"\u2705":"\u274c"," ",n.strategy]})]})}function X(){var e,r,i,o,g,p,f;const X=(0,n.Zp)(),[re,ie]=(0,t.useState)(null),[te,ne]=(0,t.useState)(!0),[oe,se]=(0,t.useState)(null),[de,ae]=(0,t.useState)("active"),le=(0,t.useMemo)((()=>"/api"),[]);if((0,t.useEffect)((()=>{fetch(`${le}/public/track-record`).then((e=>{if(!e.ok)throw new Error("Failed to load");return e.json()})).then((e=>{ie(e),ne(!1)})).catch((e=>{se(e.message),ne(!1)}))}),[le]),te)return(0,h.jsx)(b,{children:(0,h.jsx)(U,{children:"Loading track record"})});if(oe)return(0,h.jsx)(b,{children:(0,h.jsx)(N,{children:"Unable to load track record. Try again later."})});const{summary:ce,gradeDistribution:xe,activeEdges:me,resolvedEdges:he,timeline:ge,strategyPerformance:pe,paperPerformance:fe}=re,be=(null===ce||void 0===ce?void 0:ce.totalEdges)||0,je=(null===ce||void 0===ce?void 0:ce.resolvedEdges)||(null===he||void 0===he?void 0:he.length)||0,ue=(null===ce||void 0===ce?void 0:ce.pending)||(null===me||void 0===me?void 0:me.length)||0,ve=(null===ce||void 0===ce?void 0:ce.winRate)||0,ye=(null===ce||void 0===ce?void 0:ce.totalPnLpp)||0,ke=(null===ce||void 0===ce?void 0:ce.betterRate)||0,we=fe,$e=!!we,Ae=pe,Se=(null===Ae||void 0===Ae||null===(e=Ae.patterns)||void 0===e?void 0:e.length)>0,ze=["A+","A","B+","B","C+","C","D"].filter((e=>null===xe||void 0===xe?void 0:xe[e])),We=Math.max(...Object.values(xe||{}),1),Pe=Object.entries(ge||{}).sort(((e,r)=>r[0].localeCompare(e[0]))).slice(0,14),Re=Math.max(...Pe.map((e=>{let[,r]=e;return r.recorded})),1),Me=(null===we||void 0===we?void 0:we.resolvedCount)||(null===Ae||void 0===Ae?void 0:Ae.totalTrades)||je||0,Ce=(null===we||void 0===we?void 0:we.winRate)||(null===Ae||void 0===Ae?void 0:Ae.overallWinRate)||ve||0,Le=null!==(r=null!==(i=null===we||void 0===we?void 0:we.totalPnL)&&void 0!==i?i:null===Ae||void 0===Ae?void 0:Ae.totalPnL)&&void 0!==r?r:0,Te=null!==(o=null===we||void 0===we?void 0:we.roi)&&void 0!==o?o:0;return(0,h.jsxs)(b,{children:[(0,h.jsxs)(s.mg,{children:[(0,h.jsx)("title",{children:"AI Trading Performance | MarketPlayMaker"}),(0,h.jsx)("meta",{name:"description",content:`MarketPlayMaker AI: ${Me} trades, ${Ce.toFixed(1)}% win rate, ${Le>=0?"+":""}$${Le.toFixed(2)} P&L. Live, verified performance across Polymarket and Kalshi.`}),(0,h.jsx)("meta",{property:"og:title",content:"AI Trading Performance | MarketPlayMaker"}),(0,h.jsx)("meta",{property:"og:description",content:`${Me} trades | ${Ce.toFixed(1)}% win rate | ${Le>=0?"+":""}$${Le.toFixed(2)} P&L - Self-learning AI trading on prediction markets.`}),(0,h.jsx)("meta",{property:"og:type",content:"website"}),(0,h.jsx)("meta",{property:"og:url",content:"https://marketplaymaker.com/track-record"}),(0,h.jsx)("meta",{name:"twitter:card",content:"summary_large_image"}),(0,h.jsx)("meta",{name:"twitter:title",content:"AI Trading Performance | MarketPlayMaker"}),(0,h.jsx)("meta",{name:"twitter:description",content:`${Me} trades | ${Ce.toFixed(1)}% WR | ${Le>=0?"+":""}$${Le.toFixed(2)} - Live AI performance`})]}),(0,h.jsxs)(j,{children:[(0,h.jsx)(u,{children:"Live AI Performance"}),(0,h.jsx)(v,{children:"Our self-learning AI trades prediction markets in real-time \u2014 adapting strategies, blocking losers, and compounding winners automatically."}),(0,h.jsxs)(y,{children:["LIVE \u2014 ",Me," trades resolved"]})]}),(0,h.jsxs)(k,{children:[$e&&(0,h.jsxs)(w,{children:[(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:Le>=0?"#22c55e":"#ef4444",children:[Le>=0?"+":"","$",Le.toFixed(2)]}),(0,h.jsx)(S,{children:"Total P&L"})]}),(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:Ce>=55?"#22c55e":Ce>=45?"#fbbf24":"#ef4444",children:[Ce.toFixed(1),"%"]}),(0,h.jsxs)(S,{children:["Win Rate (",we.wins,"W / ",we.losses,"L)"]})]}),(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:Te>=0?"#22c55e":"#ef4444",children:[Te>=0?"+":"",Te,"%"]}),(0,h.jsx)(S,{children:"ROI"})]}),(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:"#a5b4fc",children:["$",null===(g=we.simBankroll)||void 0===g?void 0:g.toFixed(2)]}),(0,h.jsxs)(S,{children:["Bankroll ($",we.startingBankroll," start)"]})]}),null!=we.sharpeRatio&&(0,h.jsxs)($,{children:[(0,h.jsx)(A,{$color:we.sharpeRatio>=1?"#22c55e":we.sharpeRatio>=.5?"#fbbf24":"#94a3b8",children:we.sharpeRatio}),(0,h.jsx)(S,{children:"Sharpe Ratio"})]}),null!=we.maxDrawdown&&(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:we.maxDrawdown<20?"#22c55e":"#fbbf24",children:["$",we.maxDrawdown.toFixed(2)]}),(0,h.jsx)(S,{children:"Max Drawdown"})]})]}),!$e&&(0,h.jsxs)(w,{children:[(0,h.jsxs)($,{children:[(0,h.jsx)(A,{$color:"#a5b4fc",children:be}),(0,h.jsx)(S,{children:"Edges Tracked"})]}),(0,h.jsxs)($,{children:[(0,h.jsx)(A,{$color:"#22c55e",children:ue}),(0,h.jsx)(S,{children:"Active"})]}),(0,h.jsxs)($,{children:[(0,h.jsx)(A,{$color:"#f59e0b",children:je}),(0,h.jsx)(S,{children:"Resolved"})]}),je>0&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:ve>=50?"#22c55e":"#ef4444",children:[ve,"%"]}),(0,h.jsx)(S,{children:"Win Rate"})]}),(0,h.jsxs)($,{children:[(0,h.jsxs)(A,{$color:ye>=0?"#22c55e":"#ef4444",children:[ye>=0?"+":"",ye,"pp"]}),(0,h.jsx)(S,{children:"Edge P&L"})]})]})]}),(null===we||void 0===we||null===(p=we.pnlCurve)||void 0===p?void 0:p.length)>2&&(0,h.jsxs)(z,{$delay:"0.3s",children:[(0,h.jsxs)(W,{children:["\ud83d\udcc8"," Equity Curve"]}),(0,h.jsxs)(P,{style:{padding:"1rem 0.5rem 0.5rem"},children:[(0,h.jsx)(d.u,{width:"100%",height:280,children:(0,h.jsxs)(a.Q,{data:we.pnlCurve,margin:{top:5,right:20,left:0,bottom:5},children:[(0,h.jsx)("defs",{children:(0,h.jsxs)("linearGradient",{id:"pnlGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,h.jsx)("stop",{offset:"5%",stopColor:"#22c55e",stopOpacity:.3}),(0,h.jsx)("stop",{offset:"95%",stopColor:"#22c55e",stopOpacity:0})]})}),(0,h.jsx)(l.W,{dataKey:"date",tick:{fill:"#475569",fontSize:11},axisLine:{stroke:"rgba(255,255,255,0.06)"},tickLine:!1,interval:"preserveStartEnd"}),(0,h.jsx)(c.h,{tick:{fill:"#475569",fontSize:11},axisLine:!1,tickLine:!1,tickFormatter:e=>`$${e}`,width:50}),(0,h.jsx)(x.m,{content:(0,h.jsx)(J,{})}),(0,h.jsx)(m.G,{type:"monotone",dataKey:"cumPnL",stroke:"#22c55e",strokeWidth:2,fill:"url(#pnlGrad)",dot:!1,activeDot:{r:4,fill:"#22c55e",stroke:"#0a0a0f",strokeWidth:2}})]})}),(0,h.jsxs)("div",{style:{textAlign:"center",fontSize:"0.75rem",color:"#475569",marginTop:"0.5rem"},children:["Cumulative P&L from ",we.pnlCurve.length," resolved trades"]})]})]}),$e&&0!==we.bankrollReturn&&(0,h.jsx)(z,{$delay:"0.35s",children:(0,h.jsxs)(P,{style:{background:"linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))",borderColor:"rgba(99,102,241,0.25)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"},children:[(0,h.jsxs)("div",{children:[(0,h.jsx)("div",{style:{fontSize:"0.85rem",color:"#94a3b8",marginBottom:"0.25rem"},children:"Bankroll Growth"}),(0,h.jsxs)("div",{style:{fontSize:"1.6rem",fontWeight:700,color:"#e2e8f0"},children:["$",we.startingBankroll," \u2192 $",null===(f=we.simBankroll)||void 0===f?void 0:f.toFixed(2)]})]}),(0,h.jsxs)("div",{style:{textAlign:"right"},children:[(0,h.jsx)("div",{style:{fontSize:"0.85rem",color:"#94a3b8"},children:"Return"}),(0,h.jsxs)("div",{style:{fontSize:"1.8rem",fontWeight:700,color:we.bankrollReturn>=0?"#22c55e":"#ef4444"},children:[we.bankrollReturn>=0?"+":"",we.bankrollReturn,"%"]})]}),we.profitFactor>0&&we.profitFactor<999&&(0,h.jsxs)("div",{style:{textAlign:"right"},children:[(0,h.jsx)("div",{style:{fontSize:"0.85rem",color:"#94a3b8"},children:"Profit Factor"}),(0,h.jsxs)("div",{style:{fontSize:"1.8rem",fontWeight:700,color:we.profitFactor>=1.5?"#22c55e":we.profitFactor>=1?"#fbbf24":"#ef4444"},children:[we.profitFactor,"x"]})]})]})}),Se&&(0,h.jsxs)(z,{$delay:"0.4s",children:[(0,h.jsxs)(W,{children:["\ud83e\udde0"," AI Strategy Performance"]}),(0,h.jsxs)(P,{children:[(0,h.jsx)(R,{children:(0,h.jsxs)(M,{children:[(0,h.jsx)("thead",{children:(0,h.jsxs)("tr",{children:[(0,h.jsx)(C,{children:"Strategy"}),(0,h.jsx)(C,{children:"Side"}),(0,h.jsx)(C,{children:"W"}),(0,h.jsx)(C,{children:"L"}),(0,h.jsx)(C,{children:"Win Rate"}),(0,h.jsx)(C,{children:"P&L"}),(0,h.jsx)(C,{children:"Streak"}),(0,h.jsx)(C,{children:"Status"})]})}),(0,h.jsx)("tbody",{children:Ae.patterns.map(((e,r)=>{var i,t;const[n,o]=e.pattern.includes(":")?e.pattern.split(":"):[e.pattern.split("_").slice(0,-1).join("_"),e.pattern.split("_").pop()],s={autoScan:"Auto Scanner",WHALE_DETECTION:"Whale Detection",MOMENTUM:"Momentum",ARBITRAGE:"Arbitrage",BTC_BOT:"BTC Bot",PROVEN_EDGE:"Proven Edge",NO_BETS:"No Bets"}[n]||n.replace(/_/g," "),d=e.blocked?"#ef4444":e.winRate>=60?"#22c55e":"#fbbf24",a=e.blocked?"Blocked":e.winRate>=60?"Active":"Watch";return(0,h.jsxs)("tr",{style:{opacity:e.blocked?.5:1},children:[(0,h.jsx)(L,{style:{fontWeight:600,color:"#e2e8f0"},children:s}),(0,h.jsx)(L,{children:(0,h.jsx)(T,{$dir:"YES"===o?"BUY_YES":"BUY_NO",children:o})}),(0,h.jsx)(L,{style:{color:"#22c55e",fontWeight:600},children:e.wins}),(0,h.jsx)(L,{style:{color:e.losses>0?"#ef4444":"#64748b",fontWeight:600},children:e.losses}),(0,h.jsx)(L,{children:(0,h.jsxs)("span",{style:{color:e.winRate>=70?"#22c55e":e.winRate>=50?"#fbbf24":"#ef4444",fontWeight:700,fontSize:"0.9rem"},children:[null===(i=e.winRate)||void 0===i?void 0:i.toFixed(0),"%"]})}),(0,h.jsx)(L,{children:(0,h.jsxs)(B,{$val:e.totalPnL,children:[e.totalPnL>=0?"+":"","$",null===(t=e.totalPnL)||void 0===t?void 0:t.toFixed(2)]})}),(0,h.jsx)(L,{style:{fontFamily:"'SF Mono', monospace",color:e.streak>=3?"#22c55e":e.streak<=-2?"#ef4444":"#94a3b8"},children:e.streak>0?`${e.streak}W`:e.streak<0?`${Math.abs(e.streak)}L`:"\u2014"}),(0,h.jsx)(L,{children:(0,h.jsx)("span",{style:{display:"inline-block",padding:"0.15rem 0.5rem",borderRadius:"4px",fontSize:"0.7rem",fontWeight:600,background:d+"18",color:d,border:`1px solid ${d}40`},children:a})})]},r)}))})]})}),(0,h.jsx)("div",{style:{marginTop:"0.75rem",padding:"0.5rem 0.75rem",fontSize:"0.75rem",color:"#475569",borderTop:"1px solid rgba(255,255,255,0.05)"},children:"The AI learns from every trade \u2014 automatically boosting winning strategies and blocking losing patterns in real-time."})]})]}),(null===we||void 0===we?void 0:we.byConfidence)&&Object.keys(we.byConfidence).length>0&&(0,h.jsxs)(z,{$delay:"0.45s",children:[(0,h.jsxs)(W,{children:["\ud83c\udfaf"," Performance by Confidence"]}),(0,h.jsx)("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:"0.75rem"},children:["HIGH","MEDIUM","LOW"].filter((e=>we.byConfidence[e])).map((e=>{var r;const i=we.byConfidence[e],t="HIGH"===e?"#22c55e":"MEDIUM"===e?"#fbbf24":"#94a3b8";return(0,h.jsxs)(P,{style:{borderColor:t+"30"},children:[(0,h.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"},children:[(0,h.jsx)("span",{style:{padding:"0.15rem 0.6rem",borderRadius:4,fontSize:"0.75rem",fontWeight:700,background:t+"18",color:t,border:`1px solid ${t}40`},children:e}),(0,h.jsxs)("span",{style:{color:"#64748b",fontSize:"0.8rem"},children:[i.trades," trades"]})]}),(0,h.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",gap:"1rem"},children:[(0,h.jsxs)("div",{children:[(0,h.jsxs)("div",{style:{fontSize:"1.4rem",fontWeight:700,color:i.winRate>=55?"#22c55e":"#fbbf24"},children:[i.winRate,"%"]}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Win Rate"})]}),(0,h.jsxs)("div",{style:{textAlign:"right"},children:[(0,h.jsxs)("div",{style:{fontSize:"1.4rem",fontWeight:700,color:i.pnl>=0?"#22c55e":"#ef4444"},children:[i.pnl>=0?"+":"","$",null===(r=i.pnl)||void 0===r?void 0:r.toFixed(2)]}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"P&L"})]})]})]},e)}))})]}),(0,h.jsxs)(_,{$delay:"0.5s",children:[(0,h.jsxs)("summary",{children:["\ud83d\udcca"," Edge Detection System (",be," edges tracked)"]}),be>0&&(0,h.jsxs)("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:"0.5rem",marginBottom:"1.5rem"},children:[(0,h.jsxs)("div",{style:{background:"rgba(15,15,25,0.6)",borderRadius:8,padding:"0.75rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsx)("div",{style:{fontSize:"1.3rem",fontWeight:700,color:"#a5b4fc"},children:be}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Tracked"})]}),(0,h.jsxs)("div",{style:{background:"rgba(15,15,25,0.6)",borderRadius:8,padding:"0.75rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsx)("div",{style:{fontSize:"1.3rem",fontWeight:700,color:"#22c55e"},children:ue}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Active"})]}),(0,h.jsxs)("div",{style:{background:"rgba(15,15,25,0.6)",borderRadius:8,padding:"0.75rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsx)("div",{style:{fontSize:"1.3rem",fontWeight:700,color:"#f59e0b"},children:je}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Resolved"})]}),je>0&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)("div",{style:{background:"rgba(15,15,25,0.6)",borderRadius:8,padding:"0.75rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsxs)("div",{style:{fontSize:"1.3rem",fontWeight:700,color:ve>=50?"#22c55e":"#ef4444"},children:[ve,"%"]}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Edge WR"})]}),(0,h.jsxs)("div",{style:{background:"rgba(15,15,25,0.6)",borderRadius:8,padding:"0.75rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsxs)("div",{style:{fontSize:"1.3rem",fontWeight:700,color:ke>=50?"#22c55e":"#fbbf24"},children:[ke,"%"]}),(0,h.jsx)("div",{style:{fontSize:"0.7rem",color:"#64748b",textTransform:"uppercase"},children:"Beat Market"})]})]})]}),ze.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"1.5rem"},children:[(0,h.jsx)("h3",{style:{fontSize:"1rem",fontWeight:600,color:"#94a3b8",marginBottom:"0.75rem"},children:"Grade Distribution"}),(0,h.jsx)(P,{children:ze.map((e=>(0,h.jsxs)(E,{children:[(0,h.jsx)(F,{$grade:e,children:e}),(0,h.jsx)(D,{children:(0,h.jsx)(I,{$width:xe[e]/We*100+"%",$color:e.startsWith("A")?"#22c55e":e.startsWith("B")?"#6366f1":e.startsWith("C")?"#fbbf24":"#64748b"})}),(0,h.jsx)("span",{style:{color:"#94a3b8",minWidth:"30px",textAlign:"right",fontWeight:600},children:xe[e]})]},e)))})]}),Pe.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"1.5rem"},children:[(0,h.jsx)("h3",{style:{fontSize:"1rem",fontWeight:600,color:"#94a3b8",marginBottom:"0.75rem"},children:"Activity Timeline"}),(0,h.jsx)(P,{children:Pe.map((e=>{let[r,i]=e;return(0,h.jsxs)(K,{children:[(0,h.jsx)(V,{children:r}),(0,h.jsx)(Q,{$width:i.recorded/Re*100+"%"}),(0,h.jsx)(Z,{children:i.recorded})]},r)}))})]}),(0,h.jsxs)(G,{children:[(0,h.jsxs)(O,{$active:"active"===de,onClick:()=>ae("active"),children:["Active (",(null===me||void 0===me?void 0:me.length)||0,")"]}),(0,h.jsxs)(O,{$active:"resolved"===de,onClick:()=>ae("resolved"),children:["Resolved (",(null===he||void 0===he?void 0:he.length)||0,")"]})]}),(0,h.jsxs)(P,{children:["active"===de&&(0,h.jsx)(R,{children:me&&0!==me.length?(0,h.jsxs)(M,{children:[(0,h.jsx)("thead",{children:(0,h.jsxs)("tr",{children:[(0,h.jsx)(C,{children:"Market"}),(0,h.jsx)(C,{children:"Grade"}),(0,h.jsx)(C,{children:"Direction"}),(0,h.jsx)(C,{children:"Our Prob"}),(0,h.jsx)(C,{children:"Market"}),(0,h.jsx)(C,{children:"Divergence"}),(0,h.jsx)(C,{children:"Tracked"})]})}),(0,h.jsx)("tbody",{children:me.slice(0,50).map(((e,r)=>{var i,t,n,o;return(0,h.jsxs)("tr",{children:[(0,h.jsxs)(L,{title:e.question,children:[null===(i=e.question)||void 0===i?void 0:i.slice(0,55),(null===(t=e.question)||void 0===t?void 0:t.length)>55?"\u2026":""]}),(0,h.jsx)(L,{children:(0,h.jsx)(F,{$grade:e.edgeGrade,children:e.edgeGrade})}),(0,h.jsx)(L,{children:(0,h.jsx)(T,{$dir:e.edgeDirection,children:null===(n=e.edgeDirection)||void 0===n?void 0:n.replace("BUY_","")})}),(0,h.jsxs)(L,{children:[(100*e.ourProb).toFixed(0),"%"]}),(0,h.jsxs)(L,{children:[(100*e.marketPrice).toFixed(0),"\xa2"]}),(0,h.jsxs)(L,{style:{color:Math.abs(e.divergence)>15?"#22c55e":"#94a3b8"},children:[e.divergence>0?"+":"",null===(o=e.divergence)||void 0===o?void 0:o.toFixed(1),"pp"]}),(0,h.jsx)(L,{style:{fontSize:"0.8rem",color:"#64748b"},children:ee(e.recordedAt)})]},r)}))})]}):(0,h.jsx)(N,{children:"No active edges currently being tracked"})}),"resolved"===de&&(0,h.jsx)(R,{children:he&&0!==he.length?(0,h.jsxs)(M,{children:[(0,h.jsx)("thead",{children:(0,h.jsxs)("tr",{children:[(0,h.jsx)(C,{children:"Market"}),(0,h.jsx)(C,{children:"Grade"}),(0,h.jsx)(C,{children:"Direction"}),(0,h.jsx)(C,{children:"Result"}),(0,h.jsx)(C,{children:"P&L"}),(0,h.jsx)(C,{children:"Beat Market?"}),(0,h.jsx)(C,{children:"Resolved"})]})}),(0,h.jsx)("tbody",{children:he.map(((e,r)=>{var i,t,n;return(0,h.jsxs)("tr",{children:[(0,h.jsxs)(L,{title:e.question,children:[null===(i=e.question)||void 0===i?void 0:i.slice(0,55),(null===(t=e.question)||void 0===t?void 0:t.length)>55?"\u2026":""]}),(0,h.jsx)(L,{children:(0,h.jsx)(F,{$grade:e.edgeGrade,children:e.edgeGrade})}),(0,h.jsx)(L,{children:(0,h.jsx)(T,{$dir:e.edgeDirection,children:null===(n=e.edgeDirection)||void 0===n?void 0:n.replace("BUY_","")})}),(0,h.jsx)(L,{children:e.outcome}),(0,h.jsx)(L,{children:(0,h.jsxs)(B,{$val:e.pnlPp,children:[e.pnlPp>0?"+":"",e.pnlPp,"pp"]})}),(0,h.jsx)(L,{children:e.weWereBetter?"\u2705":"\u274c"}),(0,h.jsx)(L,{style:{fontSize:"0.8rem",color:"#64748b"},children:ee(e.resolvedAt)})]},r)}))})]}):(0,h.jsx)(N,{children:"No markets have resolved yet."})})]})]}),(0,h.jsxs)(z,{$delay:"0.55s",children:[(0,h.jsxs)(W,{children:["\ud83d\udd2c"," How It Works"]}),(0,h.jsx)(P,{children:(0,h.jsx)("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(250px, 1fr))",gap:"1rem"},children:[{icon:"\ud83c\udfc8",name:"ESPN Live Odds",desc:"Real-time sports probabilities from game lines and spreads"},{icon:"\ud83d\udcca",name:"Bookmaker Consensus",desc:"Aggregated odds from 15+ sportsbooks via The Odds API"},{icon:"\u20bf",name:"Crypto Market Data",desc:"On-chain signals, whale movements, and price momentum"},{icon:"\ud83d\udcc8",name:"Stock Correlations",desc:"Yahoo Finance data for policy & economic event markets"},{icon:"\ud83d\uddf3\ufe0f",name:"Polling Aggregation",desc:"Metaculus forecasts and Wikipedia current events"},{icon:"\ud83e\udde0",name:"Expert Consensus",desc:"Manifold Markets crowd wisdom and academic forecasts"},{icon:"\ud83c\udfdb\ufe0f",name:"Kalshi Exchange",desc:"Regulated prediction exchange for cross-platform arbitrage"},{icon:"\ud83e\udd16",name:"GPT-4o Intelligence",desc:"LLM analysis combining all signals into calibrated probabilities"}].map(((e,r)=>(0,h.jsxs)("div",{style:{display:"flex",gap:"0.75rem",padding:"0.75rem",borderRadius:"8px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"},children:[(0,h.jsx)("span",{style:{fontSize:"1.5rem"},children:e.icon}),(0,h.jsxs)("div",{children:[(0,h.jsx)("div",{style:{fontWeight:600,fontSize:"0.9rem",color:"#e2e8f0"},children:e.name}),(0,h.jsx)("div",{style:{fontSize:"0.8rem",color:"#64748b",lineHeight:1.4},children:e.desc})]})]},r)))})})]})]}),(0,h.jsxs)(H,{children:[(0,h.jsx)("h2",{style:{fontSize:"1.8rem",fontWeight:700,color:"#e2e8f0",margin:"0 0 0.5rem"},children:"Want Access to Live Signals?"}),(0,h.jsx)("p",{style:{color:"#94a3b8",maxWidth:"500px",margin:"0 auto",lineHeight:1.6},children:"Get real-time AI edge signals, strategy alerts, and automated scanning delivered to your dashboard."}),(0,h.jsx)(Y,{onClick:()=>X("/signup"),children:"Get Started \u2192"})]}),(0,h.jsxs)(q,{children:[(0,h.jsx)("div",{children:"MarketPlayMaker \u2014 AI-Powered Prediction Market Intelligence"}),(0,h.jsxs)("div",{style:{marginTop:"0.5rem"},children:["Last updated: ",null!==re&&void 0!==re&&re.lastUpdated?new Date(re.lastUpdated).toLocaleString():"\u2014"]}),(0,h.jsx)("div",{style:{marginTop:"0.5rem",fontSize:"0.7rem",color:"#334155"},children:"Past performance does not guarantee future results. Track record reflects paper trading, not real money."})]})]})}function ee(e){if(!e)return"\u2014";const r=Date.now()-new Date(e).getTime(),i=Math.floor(r/6e4);if(i<60)return`${i}m ago`;const t=Math.floor(i/60);if(t<24)return`${t}h ago`;const n=Math.floor(t/24);return n<7?`${n}d ago`:new Date(e).toLocaleDateString()}}}]);