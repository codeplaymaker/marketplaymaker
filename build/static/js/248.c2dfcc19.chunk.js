"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[248],{7248:(e,i,r)=>{r.r(i),r.d(i,{default:()=>Y});var t=r(9950),s=r(4937),l=r(2856),n=r(4414);const o={NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!1,REACT_APP_FIREBASE_API_KEY:"AIzaSyAg9UWRG334AInTD7m4bDkm9u8mJQGtSDc",REACT_APP_FIREBASE_AUTH_DOMAIN:"marketplaymaker-2e4b9.firebaseapp.com",REACT_APP_FIREBASE_PROJECT_ID:"marketplaymaker-2e4b9",REACT_APP_FIREBASE_STORAGE_BUCKET:"marketplaymaker-2e4b9.appspot.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"639311000126",REACT_APP_FIREBASE_APP_ID:"1:639311000126:web:e8cd8664067e4b1f21976f",REACT_APP_FIREBASE_MEASUREMENT_ID:"G-7XNP5PX3WF",REACT_APP_STRIPE_PUBLISHABLE_KEY:"pk_live_51PkTr0BQ5dVVUoajsRhl46KlNpxhd9RYZ2r4rUQXyfnEuA3W9Nr2S4VMGVaXzwJejXVFfxBTEGKhQv100vZXKyur00fBGlG9D7",REACT_APP_STRIPE_BUY_BUTTON_ID:"buy_btn_1PoCswBQ5dVVUoajzSWdKTH7",REACT_APP_SITE_URL:"https://marketplaymaker.com"}.REACT_APP_BOT_URL||"",a="localhost"!==window.location.hostname;async function d(e){let i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const r=o||a?e.replace(/^\/polybot/,"/api"):e,t=o?`${o}${r}`:r,s=await fetch(t,{...i,headers:{"Content-Type":"application/json",...i.headers}});if(!s.ok)throw new Error(`API ${s.status}`);return s.json()}const c=s.i7`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`,h=s.i7`
  0%, 100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.3); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
`,x=s.i7`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`,g=s.Ay.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a14 0%, #0f1a2e 50%, #0a1628 100%);
  color: #e2e8f0;
  padding: 1rem 0.5rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  @media (min-width: 768px) { padding: 2rem; }
`,m=s.Ay.div`
  max-width: 1400px;
  margin: 0 auto;
`,p=s.Ay.header`
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${c} 0.6s ease-out;
`,u=s.Ay.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #34d399, #10b981, #6ee7b7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  @media (min-width: 768px) { font-size: 2.5rem; }
`,j=s.Ay.p`
  color: #94a3b8;
  font-size: 0.9rem;
  max-width: 650px;
  margin: 0 auto;
`,b=s.Ay.div`
  display: flex;
  gap: 0.15rem;
  background: rgba(15, 15, 26, 0.5);
  border-radius: 12px;
  padding: 0.25rem;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`,y=s.Ay.button`
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
  background: ${e=>e.$active?"rgba(16, 185, 129, 0.2)":"transparent"};
  color: ${e=>e.$active?"#6ee7b7":"#64748b"};
  flex-shrink: 0;
  @media (min-width: 768px) { font-size: 0.82rem; padding: 0.5rem 1.1rem; }
  &:hover { color: #6ee7b7; background: rgba(16, 185, 129, 0.1); }
`,f=s.Ay.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 768px) { gap: 1.5rem; grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1200px) { grid-template-columns: repeat(3, 1fr); }
`,v=s.Ay.div`
  grid-column: 1 / -1;
`,S=s.Ay.div`
  background: rgba(30, 30, 50, 0.8);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${c} 0.6s ease-out;
  animation-delay: ${e=>e.$delay||"0s"};
  animation-fill-mode: both;
  overflow: hidden;
  @media (min-width: 768px) { border-radius: 16px; padding: 1.5rem; }
  &:hover { border-color: rgba(16, 185, 129, 0.35); transform: translateY(-2px); }
  ${e=>e.$glow&&s.AH`animation: ${h} 2s ease-in-out infinite;`}
`,w=s.Ay.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: #6ee7b7;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,$=s.Ay.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(${e=>e.$cols||3}, 1fr);
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`,k=s.Ay.div`
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
`,A=s.Ay.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${e=>e.$color||"#6ee7b7"};
  font-variant-numeric: tabular-nums;
`,R=s.Ay.div`
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
`,P=s.Ay.button`
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${e=>"primary"===e.$variant&&s.AH`
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    &:hover:not(:disabled) { box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
  `}
  ${e=>"ghost"===e.$variant&&s.AH`
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.2);
    &:hover:not(:disabled) { background: rgba(16, 185, 129, 0.2); }
  `}
  ${e=>"danger"===e.$variant&&s.AH`
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  `}
`,C=s.Ay.span`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  ${e=>"A"===e.$type&&s.AH`background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);`}
  ${e=>"B"===e.$type&&s.AH`background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);`}
  ${e=>"C"===e.$type&&s.AH`background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);`}
  ${e=>"D"===e.$type&&s.AH`background: rgba(251,146,60,0.15); color: #fb923c; border: 1px solid rgba(251,146,60,0.3);`}
  ${e=>"F"===e.$type&&s.AH`background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);`}
  ${e=>"success"===e.$type&&s.AH`background: rgba(16,185,129,0.15); color: #34d399;`}
  ${e=>"warning"===e.$type&&s.AH`background: rgba(251,191,36,0.15); color: #fbbf24;`}
  ${e=>"danger"===e.$type&&s.AH`background: rgba(239,68,68,0.15); color: #f87171;`}
  ${e=>"info"===e.$type&&s.AH`background: rgba(99,102,241,0.15); color: #a5b4fc;`}
`,E=s.Ay.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: ${x} 0.8s linear infinite;
  display: inline-block;
`,F=s.Ay.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`,T=s.Ay.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(16, 185, 129, 0.08);
    white-space: nowrap;
  }
  th {
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  tr:hover td { background: rgba(16, 185, 129, 0.04); }
`,z=s.Ay.span`
  color: ${e=>e.$value>0?"#34d399":e.$value<0?"#f87171":"#94a3b8"};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`,I=s.Ay.pre`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: #94a3b8;
  overflow-x: auto;
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`,M=s.Ay.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
`,W=s.Ay.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`,O=s.Ay.div`
  background: linear-gradient(135deg, #0f1a2e 0%, #0a1628 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 2rem;
  animation: ${c} 0.3s ease;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 3px; }
`,_=s.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
`,L=s.Ay.button`
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
  flex-shrink: 0;
  &:hover { background: rgba(239, 68, 68, 0.3); }
`,B=s.Ay.div`
  background: rgba(15, 15, 26, 0.6);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`,N=s.Ay.h4`
  color: #6ee7b7;
  font-size: 0.88rem;
  margin: 0 0 0.75rem;
  font-weight: 700;
`,D=s.Ay.div`
  background: rgba(15, 15, 26, 0.4);
  border-left: 3px solid ${e=>"YES"===e.$stance?"#34d399":"NO"===e.$stance?"#f87171":"#fbbf24"};
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.5rem;
  border-radius: 0 8px 8px 0;
  font-size: 0.78rem;
`,H=s.Ay.span`
  color: #a5b4fc;
  font-weight: 700;
  font-size: 0.75rem;
`,G=s.Ay.span`
  display: inline-block;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.72rem;
  color: #6ee7b7;
  margin: 0.2rem;
`,U=s.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
`,V=s.Ay.select`
  background: rgba(15, 15, 26, 0.8);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #e2e8f0;
  font-size: 0.82rem;
  &:focus { outline: none; border-color: #10b981; }
`;function Y(){var e,i,r,s,o,a,c,h,x,Y,K,Q,J,X,Z,ee,ie,re,te,se,le,ne,oe,ae,de,ce,he,xe,ge,me,pe,ue,je,be,ye,fe,ve,Se;const[we,$e]=(0,t.useState)("overview"),[ke,Ae]=(0,t.useState)(null),[Re,Pe]=(0,t.useState)(!0),[Ce,Ee]=(0,t.useState)(null),[Fe,Te]=(0,t.useState)(null),[ze,Ie]=(0,t.useState)(!1),[Me,We]=(0,t.useState)("MOMENTUM"),[Oe,_e]=(0,t.useState)("politics"),[Le,Be]=(0,t.useState)(null),[Ne,De]=(0,t.useState)(null),[He,Ge]=(0,t.useState)(!1),[Ue,Ve]=(0,t.useState)(null),[Ye,qe]=(0,t.useState)(!1),[Ke,Qe]=(0,t.useState)(null),[Je,Xe]=(0,t.useState)(null),[Ze,ei]=(0,t.useState)(!1),[ii,ri]=(0,t.useState)(null),[ti,si]=(0,t.useState)(!1),[li,ni]=(0,t.useState)(null),[oi,ai]=(0,t.useState)(!1),[di,ci]=(0,t.useState)(!1),[hi,xi]=(0,t.useState)(null),[gi,mi]=(0,t.useState)(!1),[pi,ui]=(0,t.useState)(!1),ji=["PROVEN_EDGE","ARBITRAGE","NO_BETS","SPORTS_EDGE","MOMENTUM","CONTRARIAN"],bi=(0,t.useCallback)((async e=>{mi(!0),ui(!0),xi(null);try{const i=await d(`/polybot/mirofish/simulation/${e}/report`);xi(i)}catch(i){xi({error:i.message})}finally{mi(!1)}}),[]),yi=(0,t.useCallback)((async()=>{try{const e=await d("/polybot/mirofish/lab/status");Ae(e),Ee(null)}catch(e){Ee("Bot server not reachable")}finally{Pe(!1)}}),[]);(0,t.useEffect)((()=>{yi(),Si();const e=setInterval(yi,3e4);return()=>clearInterval(e)}),[yi]);const fi=async()=>{try{const e=await d("/polybot/mirofish/suggest/latest");De(e)}catch{}},vi=async()=>{try{const e=await d("/polybot/mirofish/evolve/results");Ve(e)}catch{}},Si=async()=>{try{const e=await d("/polybot/mirofish/params/status");ri(e)}catch{}},wi=async()=>{ai(!0);try{const e=await d("/polybot/mirofish/pipeline");ni(e)}catch{}finally{ai(!1)}};return(0,t.useEffect)((()=>{"test"===we&&(async()=>{try{const e=await d("/polybot/mirofish/test/latest-suite");Be(e)}catch{}})(),"suggest"===we&&fi(),"evolve"===we&&vi(),"params"===we&&Si(),"pipeline"===we&&wi()}),[we]),Re?(0,n.jsx)(g,{children:(0,n.jsx)(m,{children:(0,n.jsxs)(M,{children:[(0,n.jsx)(E,{})," Loading Strategy Lab..."]})})}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)(g,{children:[(0,n.jsx)(l.mg,{children:(0,n.jsx)("title",{children:"MiroFish Strategy Lab | MarketPlayMaker"})}),(0,n.jsxs)(m,{children:[(0,n.jsxs)(p,{children:[(0,n.jsx)(u,{children:"\ud83d\udc1f MiroFish Strategy Lab"}),(0,n.jsx)(j,{children:"Agent-based market simulation \u2022 LLM-powered diagnostics \u2022 Evolutionary parameter optimization"})]}),Ce&&(0,n.jsxs)(S,{style:{borderColor:"rgba(239,68,68,0.3)",marginBottom:"1rem"},children:[(0,n.jsxs)("span",{style:{color:"#f87171"},children:["\u26a0\ufe0f ",Ce]}),(0,n.jsx)(P,{$variant:"ghost",onClick:yi,style:{marginLeft:"1rem",fontSize:"0.75rem"},children:"Retry"})]}),(0,n.jsx)(b,{children:[{id:"overview",icon:"\ud83d\udcca",label:"Overview"},{id:"pipeline",icon:"\ud83d\udd17",label:"Signal Pipeline"},{id:"test",icon:"\ud83e\uddea",label:"Strategy Tester"},{id:"adversarial",icon:"\u2694\ufe0f",label:"Adversarial"},{id:"suggest",icon:"\ud83e\udde0",label:"AI Suggestions"},{id:"evolve",icon:"\ud83e\uddec",label:"Evolution"},{id:"params",icon:"\u2699\ufe0f",label:"Live Params"}].map((e=>(0,n.jsxs)(y,{$active:we===e.id,onClick:()=>$e(e.id),children:[e.icon," ",e.label]},e.id)))}),"overview"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\ud83d\udd2c Lab Status"}),(0,n.jsxs)($,{$cols:4,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:null!==ke&&void 0!==ke&&null!==(e=ke.simulator)&&void 0!==e&&e.loaded?"#34d399":"#f87171",children:null!==ke&&void 0!==ke&&null!==(i=ke.simulator)&&void 0!==i&&i.loaded?"\u25cf":"\u25cb"}),(0,n.jsx)(R,{children:"Simulator"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:null!==ke&&void 0!==ke&&null!==(r=ke.suggester)&&void 0!==r&&r.configured?"#34d399":"#f87171",children:null!==ke&&void 0!==ke&&null!==(s=ke.suggester)&&void 0!==s&&s.configured?"\u25cf":"\u25cb"}),(0,n.jsx)(R,{children:"AI Suggester"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:null!==ke&&void 0!==ke&&null!==(o=ke.evolver)&&void 0!==o&&o.loaded?"#34d399":"#f87171",children:null!==ke&&void 0!==ke&&null!==(a=ke.evolver)&&void 0!==a&&a.loaded?"\u25cf":"\u25cb"}),(0,n.jsx)(R,{children:"Evolver"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:(null===ke||void 0===ke||null===(c=ke.suggester)||void 0===c?void 0:c.model)||"\u2014"}),(0,n.jsx)(R,{children:"LLM Model"})]})]})]})}),(0,n.jsxs)(S,{$delay:"0.2s",children:[(0,n.jsx)(w,{children:"\ud83e\uddea Latest Test Suite"}),null!==ke&&void 0!==ke&&ke.latestTestSuite?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#6ee7b7",children:new Date(ke.latestTestSuite).toLocaleDateString()}),(0,n.jsx)(R,{children:"Last Run"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:q(ke.latestTestSuite)}),(0,n.jsx)(R,{children:"Age"})]})]}),(0,n.jsx)(P,{$variant:"ghost",onClick:()=>$e("test"),style:{marginTop:"0.75rem",width:"100%",justifyContent:"center"},children:"View Results \u2192"})]}):(0,n.jsx)(M,{style:{padding:"1.5rem"},children:"No tests run yet"})]}),(0,n.jsxs)(S,{$delay:"0.3s",children:[(0,n.jsx)(w,{children:"\ud83e\udde0 AI Suggestions"}),null!==ke&&void 0!==ke&&ke.latestSuggestions?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#fbbf24",children:(null===(h=ke.suggester)||void 0===h||null===(x=h.latestSuggestions)||void 0===x?void 0:x.count)||0}),(0,n.jsx)(R,{children:"Suggestions"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:q(ke.latestSuggestions)}),(0,n.jsx)(R,{children:"Age"})]})]}),(0,n.jsx)(P,{$variant:"ghost",onClick:()=>$e("suggest"),style:{marginTop:"0.75rem",width:"100%",justifyContent:"center"},children:"View Suggestions \u2192"})]}):(0,n.jsx)(M,{style:{padding:"1.5rem"},children:"No suggestions yet"})]}),(0,n.jsxs)(S,{$delay:"0.4s",children:[(0,n.jsx)(w,{children:"\ud83e\uddec Evolution"}),null!==ke&&void 0!==ke&&ke.latestEvolution?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#34d399",children:new Date(ke.latestEvolution).toLocaleDateString()}),(0,n.jsx)(R,{children:"Last Evolution"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:q(ke.latestEvolution)}),(0,n.jsx)(R,{children:"Age"})]})]}),(0,n.jsx)(P,{$variant:"ghost",onClick:()=>$e("evolve"),style:{marginTop:"0.75rem",width:"100%",justifyContent:"center"},children:"View Results \u2192"})]}):(0,n.jsx)(M,{style:{padding:"1.5rem"},children:"No evolution yet"})]}),(0,n.jsxs)(S,{$delay:"0.45s",children:[(0,n.jsx)(w,{children:"\u2699\ufe0f Live Params"}),(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#fbbf24",children:null!==(Y=null===ii||void 0===ii||null===(K=ii.results)||void 0===K||null===(Q=K.filter((e=>e.applied)))||void 0===Q?void 0:Q.length)&&void 0!==Y?Y:"\u2014"}),(0,n.jsx)(R,{children:"Strategies Active"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:null!==ii&&void 0!==ii&&ii.appliedAt?q(ii.appliedAt):"\u2014"}),(0,n.jsx)(R,{children:"Last Applied"})]})]}),(0,n.jsx)(P,{$variant:"ghost",onClick:()=>$e("params"),style:{marginTop:"0.75rem",width:"100%",justifyContent:"center"},children:"View Overrides \u2192"})]}),(0,n.jsxs)(S,{$delay:"0.5s",children:[(0,n.jsx)(w,{children:"\ud83d\udd17 Signal Pipeline"}),(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#34d399",children:null!==ke&&void 0!==ke&&ke.configured?"\u25cf":"\u25cb"}),(0,n.jsx)(R,{children:"MiroFish"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:null!==(J=null===ke||void 0===ke?void 0:ke.queueLength)&&void 0!==J?J:"\u2014"}),(0,n.jsx)(R,{children:"Queued"})]})]}),(0,n.jsx)(P,{$variant:"ghost",onClick:()=>$e("pipeline"),style:{marginTop:"0.75rem",width:"100%",justifyContent:"center"},children:"View Pipeline \u2192"})]}),(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.55s",children:[(0,n.jsx)(w,{children:"\ud83c\udfd7\ufe0f How MiroFish Strategy Lab Works"}),(0,n.jsx)("div",{style:{display:"grid",gap:"0.75rem",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))"},children:[{icon:"\ud83d\udd17",title:"Signal Pipeline",desc:"Question \u2192 Scenario \u2192 Knowledge Graph \u2192 Multi-Agent Sim \u2192 Probability Signal \u2192 Ensemble"},{icon:"\ud83d\udcc8",title:"Market Simulator",desc:"Agent-based LOB with 10 agent archetypes, 4 market regimes, and 10 pre-built scenarios"},{icon:"\ud83e\uddea",title:"Strategy Tester",desc:"Tests your real strategies against simulated markets with Monte Carlo runs"},{icon:"\u2694\ufe0f",title:"Adversarial Testing",desc:"Pits strategies against front-runners, whale manipulators, and liquidity crises"},{icon:"\ud83e\udde0",title:"AI Diagnosis",desc:"LLM analyzes test results, identifies failure modes, and suggests improvements"},{icon:"\ud83e\uddec",title:"Evolutionary Optimizer",desc:"Evolves strategy parameters via genetic algorithm \u2014 population, crossover, mutation"},{icon:"\u2699\ufe0f",title:"Live Params",desc:"Auto-applies evolved params at startup with fitness threshold, full before/after visibility"}].map(((e,i)=>(0,n.jsxs)("div",{style:{background:"rgba(16,185,129,0.05)",borderRadius:"10px",padding:"0.75rem"},children:[(0,n.jsx)("div",{style:{fontSize:"1.5rem",marginBottom:"0.25rem"},children:e.icon}),(0,n.jsx)("div",{style:{fontWeight:700,color:"#6ee7b7",fontSize:"0.82rem",marginBottom:"0.25rem"},children:e.title}),(0,n.jsx)("div",{style:{color:"#94a3b8",fontSize:"0.72rem",lineHeight:1.4},children:e.desc})]},i)))})]})})]}),"test"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\ud83e\uddea Strategy Tester"}),(0,n.jsxs)(U,{children:[(0,n.jsx)(V,{value:Me,onChange:e=>We(e.target.value),children:ji.map((e=>(0,n.jsx)("option",{value:e,children:e},e)))}),(0,n.jsx)(V,{value:Oe,onChange:e=>_e(e.target.value),children:["politics","crypto","sports","geopolitics"].map((e=>(0,n.jsx)("option",{value:e,children:e},e)))}),(0,n.jsx)(P,{$variant:"primary",onClick:async()=>{Ie(!0);try{const e=await d("/polybot/mirofish/test/strategy",{method:"POST",body:JSON.stringify({strategyName:Me,category:Oe,runsPerScenario:3})});Te(e)}catch(e){Ee(e.message)}finally{Ie(!1)}},disabled:ze,children:ze?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Running..."]}):"\u25b6 Test Strategy"}),(0,n.jsx)(P,{$variant:"ghost",onClick:async()=>{Ie(!0);try{await d("/polybot/mirofish/test/full-suite",{method:"POST",body:JSON.stringify({category:Oe})}),setTimeout((async()=>{try{const e=await d("/polybot/mirofish/test/latest-suite");Be(e)}catch{}Ie(!1)}),15e3)}catch(e){Ee(e.message),Ie(!1)}},disabled:ze,children:ze?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Running..."]}):"\ud83d\udd2c Full Suite"})]})]})}),Fe&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.2s",children:[(0,n.jsxs)(w,{children:["\ud83d\udcca ",null===(X=Fe.overall)||void 0===X?void 0:X.strategy," \u2014 Test Results"]}),(0,n.jsxs)($,{$cols:5,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{children:(0,n.jsxs)(z,{$value:null===(Z=Fe.overall)||void 0===Z?void 0:Z.overallPnL,children:["$",null===(ee=Fe.overall)||void 0===ee||null===(ie=ee.overallPnL)||void 0===ie?void 0:ie.toFixed(2)]})}),(0,n.jsx)(R,{children:"Total PnL"})]}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:(null===(re=Fe.overall)||void 0===re?void 0:re.overallROI)>0?"#34d399":"#f87171",children:[null===(te=100*(null===(se=Fe.overall)||void 0===se?void 0:se.overallROI))||void 0===te?void 0:te.toFixed(1),"%"]}),(0,n.jsx)(R,{children:"ROI"})]}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:"#fbbf24",children:[null===(le=100*(null===(ne=Fe.overall)||void 0===ne?void 0:ne.overallWinRate))||void 0===le?void 0:le.toFixed(0),"%"]}),(0,n.jsx)(R,{children:"Win Rate"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#34d399",children:null===(oe=Fe.overall)||void 0===oe?void 0:oe.bestScenario}),(0,n.jsx)(R,{children:"Best Scenario"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#f87171",children:null===(ae=Fe.overall)||void 0===ae?void 0:ae.worstScenario}),(0,n.jsx)(R,{children:"Worst Scenario"})]})]}),Fe.scenarios&&(0,n.jsx)(F,{style:{marginTop:"1rem"},children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Scenario"}),(0,n.jsx)("th",{children:"Avg PnL"}),(0,n.jsx)("th",{children:"Win Rate"}),(0,n.jsx)("th",{children:"Trades"}),(0,n.jsx)("th",{children:"Drawdown"}),(0,n.jsx)("th",{children:"Edge Half-Life"})]})}),(0,n.jsx)("tbody",{children:Object.entries(Fe.scenarios).map((e=>{var i,r,t,s,l;let[o,a]=e;return(0,n.jsxs)("tr",{children:[(0,n.jsx)("td",{style:{fontWeight:600},children:o}),(0,n.jsx)("td",{children:(0,n.jsxs)(z,{$value:a.avgPnL,children:["$",null===(i=a.avgPnL)||void 0===i?void 0:i.toFixed(2)]})}),(0,n.jsxs)("td",{children:[null===(r=100*a.avgWinRate)||void 0===r?void 0:r.toFixed(0),"%"]}),(0,n.jsx)("td",{children:null===(t=a.avgTradeCount)||void 0===t?void 0:t.toFixed(1)}),(0,n.jsxs)("td",{style:{color:"#f87171"},children:[null===(s=100*a.avgDrawdown)||void 0===s?void 0:s.toFixed(1),"%"]}),(0,n.jsxs)("td",{children:[null===(l=a.avgEdgeHalfLife)||void 0===l?void 0:l.toFixed(0)," ticks"]})]},o)}))})]})})]})}),Le&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.3s",children:[(0,n.jsx)(w,{children:"\ud83d\udd2c Full Suite \u2014 Strategy Rankings"}),Le.rankings?(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Rank"}),(0,n.jsx)("th",{children:"Strategy"}),(0,n.jsx)("th",{children:"PnL"}),(0,n.jsx)("th",{children:"ROI"}),(0,n.jsx)("th",{children:"Win Rate"}),(0,n.jsx)("th",{children:"Drawdown"}),(0,n.jsx)("th",{children:"Score"})]})}),(0,n.jsx)("tbody",{children:Le.rankings.map(((e,i)=>{var r,t,s,l,o;return(0,n.jsxs)("tr",{children:[(0,n.jsxs)("td",{style:{fontWeight:700,color:0===i?"#fbbf24":"#94a3b8"},children:["#",i+1]}),(0,n.jsx)("td",{style:{fontWeight:600},children:e.strategy}),(0,n.jsx)("td",{children:(0,n.jsxs)(z,{$value:e.totalPnL,children:["$",null===(r=e.totalPnL)||void 0===r?void 0:r.toFixed(2)]})}),(0,n.jsx)("td",{children:(0,n.jsxs)(z,{$value:e.avgROI,children:[null===(t=100*e.avgROI)||void 0===t?void 0:t.toFixed(1),"%"]})}),(0,n.jsxs)("td",{children:[null===(s=100*e.avgWinRate)||void 0===s?void 0:s.toFixed(0),"%"]}),(0,n.jsxs)("td",{style:{color:"#f87171"},children:[null===(l=100*e.avgDrawdown)||void 0===l?void 0:l.toFixed(1),"%"]}),(0,n.jsx)("td",{style:{color:"#6ee7b7"},children:null===(o=e.compositeScore)||void 0===o?void 0:o.toFixed(1)})]},e.strategy)}))})]})}):(0,n.jsx)(I,{children:JSON.stringify(Le,null,2).slice(0,2e3)})]})})]}),"adversarial"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\u2694\ufe0f Adversarial Testing"}),(0,n.jsx)(j,{style:{textAlign:"left",margin:"0 0 1rem 0",maxWidth:"none"},children:"Test strategies against hostile market participants \u2014 front-runners, whale manipulators, and liquidity crises."}),(0,n.jsxs)(U,{children:[(0,n.jsx)(V,{value:Me,onChange:e=>We(e.target.value),children:ji.map((e=>(0,n.jsx)("option",{value:e,children:e},e)))}),(0,n.jsx)(P,{$variant:"danger",onClick:async()=>{ei(!0);try{const e=await d("/polybot/mirofish/test/adversarial",{method:"POST",body:JSON.stringify({strategyName:Me,category:Oe,runs:3})});Xe(e)}catch(e){Ee(e.message)}finally{ei(!1)}},disabled:Ze,children:Ze?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Simulating..."]}):"\u2694\ufe0f Run Adversarial Test"})]})]})}),Je&&(0,n.jsx)(n.Fragment,{children:Object.entries(Je.adversarialResults||{}).map((e=>{var i,r,t,s;let[l,o]=e;return(0,n.jsxs)(S,{$delay:"0.2s",children:[(0,n.jsxs)(w,{children:["front_running"===l?"\ud83c\udfc3":"whale_manipulation"===l?"\ud83d\udc0b":"\ud83d\udca7"," ",l.replace(/_/g," ").replace(/\b\w/g,(e=>e.toUpperCase()))]}),(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{children:(0,n.jsxs)(z,{$value:o.avgPnL,children:["$",null===(i=o.avgPnL)||void 0===i?void 0:i.toFixed(2)]})}),(0,n.jsx)(R,{children:"Avg PnL"})]}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:1===o.survivalRate?"#34d399":"#f87171",children:[null===(r=100*o.survivalRate)||void 0===r?void 0:r.toFixed(0),"%"]}),(0,n.jsx)(R,{children:"Survival Rate"})]})]}),(0,n.jsxs)($,{$cols:2,style:{marginTop:"0.5rem"},children:[(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:"#fbbf24",children:[null===(t=100*o.avgWinRate)||void 0===t?void 0:t.toFixed(0),"%"]}),(0,n.jsx)(R,{children:"Win Rate"})]}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:"#f87171",children:[null===(s=100*o.avgDrawdown)||void 0===s?void 0:s.toFixed(1),"%"]}),(0,n.jsx)(R,{children:"Max Drawdown"})]})]})]},l)}))})]}),"suggest"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\ud83e\udde0 AI Strategy Suggestions"}),(0,n.jsxs)(U,{children:[(0,n.jsx)(P,{$variant:"primary",onClick:async()=>{Ge(!0);try{await d("/polybot/mirofish/suggest",{method:"POST",body:JSON.stringify({validate:!0})}),setTimeout((async()=>{try{const e=await d("/polybot/mirofish/suggest/latest");De(e)}catch{}Ge(!1)}),2e4)}catch(e){Ee(e.message),Ge(!1)}},disabled:He,children:He?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Generating..."]}):"\ud83e\udde0 Generate New Suggestions"}),(0,n.jsx)(P,{$variant:"ghost",onClick:fi,children:"\u21bb Refresh"}),(null===Ne||void 0===Ne?void 0:Ne.stats)&&(0,n.jsxs)("span",{style:{color:"#94a3b8",fontSize:"0.8rem"},children:[Ne.stats.totalSuggestions," suggestions \u2022 ",Ne.stats.validated," validated \u2022 ",Ne.stats.rejected," rejected"]})]})]})}),(null===Ne||void 0===Ne?void 0:Ne.strategyGrades)&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.15s",children:[(0,n.jsx)(w,{children:"\ud83d\udccb Strategy Grades"}),(0,n.jsx)("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.75rem"},children:Object.entries(Ne.strategyGrades).map((e=>{let[i,r]=e;return(0,n.jsxs)("div",{style:{background:"rgba(16,185,129,0.05)",borderRadius:"10px",padding:"0.75rem 1rem",minWidth:"140px",flex:"1 1 140px"},children:[(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.25rem"},children:[(0,n.jsx)(C,{$type:r.grade,children:r.grade}),(0,n.jsx)("span",{style:{fontWeight:700,fontSize:"0.82rem"},children:i})]}),(0,n.jsxs)("div",{style:{color:"#94a3b8",fontSize:"0.72rem"},children:[r.viability," \u2022 ",r.failureModeCount," failure mode",1!==r.failureModeCount?"s":""]})]},i)}))})]})}),null===Ne||void 0===Ne||null===(de=Ne.recommendations)||void 0===de?void 0:de.map(((e,i)=>(0,n.jsxs)(S,{$delay:.2+.05*i+"s",children:[(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"},children:[(0,n.jsxs)("span",{style:{fontWeight:800,color:"#6ee7b7",fontSize:"1.1rem"},children:["#",e.rank]}),(0,n.jsx)(C,{$type:"HIGH"===e.confidence?"success":"MEDIUM"===e.confidence?"warning":"danger",children:e.confidence}),(0,n.jsx)(C,{$type:"info",children:e.type})]}),(0,n.jsx)("div",{style:{fontWeight:700,color:"#e2e8f0",marginBottom:"0.5rem",fontSize:"0.9rem"},children:e.title}),(0,n.jsx)("div",{style:{color:"#94a3b8",fontSize:"0.78rem",lineHeight:1.5,marginBottom:"0.75rem"},children:e.description}),e.expectedImprovement&&(0,n.jsxs)($,{$cols:3,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#34d399",style:{fontSize:"0.9rem"},children:e.expectedImprovement.roiDelta}),(0,n.jsx)(R,{children:"ROI \u0394"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#fbbf24",style:{fontSize:"0.9rem"},children:e.expectedImprovement.winRateDelta}),(0,n.jsx)(R,{children:"Win Rate \u0394"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",style:{fontSize:"0.9rem"},children:e.expectedImprovement.drawdownImprovement}),(0,n.jsx)(R,{children:"Drawdown \u0394"})]})]}),e.strategy&&(0,n.jsxs)("div",{style:{marginTop:"0.5rem",fontSize:"0.72rem",color:"#64748b"},children:["Strategy: ",(0,n.jsx)("span",{style:{color:"#a5b4fc"},children:e.strategy}),e.applicableRegimes&&(0,n.jsxs)(n.Fragment,{children:[" \u2022 Regimes: ",e.applicableRegimes.join(", ")]})]}),null!==e.validated&&void 0!==e.validated&&(0,n.jsxs)("div",{style:{marginTop:"0.25rem",fontSize:"0.72rem",color:e.validated?"#34d399":"#f87171"},children:[e.validated?"\u2713 Validated via simulation":"\u2717 Not validated",e.validationResult&&"string"===typeof e.validationResult&&` \u2014 ${e.validationResult}`]})]},e.id||i))),(null===Ne||void 0===Ne?void 0:Ne.summary)&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.5s",children:[(0,n.jsx)(w,{children:"\ud83d\udcdd Summary"}),(0,n.jsx)("p",{style:{color:"#94a3b8",fontSize:"0.82rem",lineHeight:1.6},children:Ne.summary})]})}),!Ne&&(0,n.jsx)(v,{children:(0,n.jsx)(M,{children:"No suggestions yet. Click \u201cGenerate New Suggestions\u201d to run the LLM analysis pipeline."})})]}),"evolve"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\ud83e\uddec Evolutionary Parameter Optimization"}),(0,n.jsx)(j,{style:{textAlign:"left",margin:"0 0 1rem 0",maxWidth:"none"},children:"Evolves strategy parameters using genetic algorithms \u2014 population breeding, crossover, mutation, and elite selection."}),(0,n.jsxs)(U,{children:[(0,n.jsx)(V,{value:Me,onChange:e=>We(e.target.value),children:ji.map((e=>(0,n.jsx)("option",{value:e,children:e},e)))}),(0,n.jsx)(P,{$variant:"primary",onClick:async()=>{qe(!0);try{await d("/polybot/mirofish/evolve",{method:"POST",body:JSON.stringify({strategyName:Me,category:Oe,generations:6})}),setTimeout((async()=>{try{const e=await d(`/polybot/mirofish/evolve/${Me}`);Qe(e)}catch{}qe(!1)}),15e3)}catch(e){Ee(e.message),qe(!1)}},disabled:Ye,children:Ye?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Evolving..."]}):"\ud83e\uddec Evolve Strategy"}),(0,n.jsx)(P,{$variant:"ghost",onClick:async()=>{qe(!0);try{await d("/polybot/mirofish/evolve/all",{method:"POST",body:JSON.stringify({category:Oe})}),setTimeout((async()=>{try{const e=await d("/polybot/mirofish/evolve/results");Ve(e)}catch{}qe(!1)}),3e4)}catch(e){Ee(e.message),qe(!1)}},disabled:Ye,children:Ye?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Evolving..."]}):"\ud83d\udd04 Evolve All"}),(0,n.jsx)(P,{$variant:"ghost",onClick:vi,children:"\u21bb Refresh"})]})]})}),(null===Ke||void 0===Ke?void 0:Ke.bestGenome)&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.2s",$glow:!0,children:[(0,n.jsxs)(w,{children:["\ud83c\udfc6 Best Evolved Genome \u2014 ",Ke.strategyName]}),(0,n.jsxs)($,{$cols:3,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#fbbf24",children:null===(ce=Ke.bestGenome.fitness)||void 0===ce?void 0:ce.toFixed(1)}),(0,n.jsx)(R,{children:"Fitness Score"})]}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(A,{$color:"#a5b4fc",children:["Gen ",Ke.bestGenome.generation]}),(0,n.jsx)(R,{children:"Generation"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#6ee7b7",children:null===(he=Ke.bestGenome.id)||void 0===he?void 0:he.split("-").pop()}),(0,n.jsx)(R,{children:"Genome ID"})]})]}),(0,n.jsxs)("div",{style:{marginTop:"1rem"},children:[(0,n.jsx)("div",{style:{fontWeight:700,color:"#6ee7b7",fontSize:"0.82rem",marginBottom:"0.5rem"},children:"Optimized Parameters:"}),(0,n.jsx)("div",{style:{display:"grid",gap:"0.5rem",gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))"},children:Object.entries(Ke.bestGenome.params||{}).map((e=>{let[i,r]=e;return(0,n.jsxs)("div",{style:{background:"rgba(16,185,129,0.06)",borderRadius:"8px",padding:"0.5rem 0.75rem",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,n.jsx)("span",{style:{color:"#94a3b8",fontSize:"0.75rem"},children:i}),(0,n.jsx)("span",{style:{color:"#6ee7b7",fontWeight:700,fontSize:"0.85rem",fontVariantNumeric:"tabular-nums"},children:"number"===typeof r?r.toFixed(4).replace(/\.?0+$/,""):String(r)})]},i)}))})]}),Ke.top5&&(0,n.jsxs)("div",{style:{marginTop:"1rem"},children:[(0,n.jsx)("div",{style:{fontWeight:700,color:"#94a3b8",fontSize:"0.78rem",marginBottom:"0.5rem"},children:"Top 5 Genomes:"}),(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Rank"}),(0,n.jsx)("th",{children:"ID"}),(0,n.jsx)("th",{children:"Fitness"}),(0,n.jsx)("th",{children:"Generation"})]})}),(0,n.jsx)("tbody",{children:Ke.top5.map(((e,i)=>{var r;return(0,n.jsxs)("tr",{children:[(0,n.jsxs)("td",{style:{fontWeight:700,color:0===i?"#fbbf24":"#94a3b8"},children:["#",i+1]}),(0,n.jsx)("td",{style:{fontSize:"0.72rem",color:"#a5b4fc"},children:e.id}),(0,n.jsx)("td",{style:{fontWeight:700,color:"#6ee7b7"},children:null===(r=e.fitness)||void 0===r?void 0:r.toFixed(1)}),(0,n.jsx)("td",{children:e.generation})]},e.id)}))})]})})]})]})}),(null===Ue||void 0===Ue||null===(xe=Ue.results)||void 0===xe?void 0:xe.length)>0&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.3s",children:[(0,n.jsxs)(w,{children:["\ud83d\udcc2 Evolution History (",Ue.count," results)"]}),(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"File"}),(0,n.jsx)("th",{children:"Size"}),(0,n.jsx)("th",{children:"Created"})]})}),(0,n.jsx)("tbody",{children:Ue.results.map((e=>(0,n.jsxs)("tr",{style:{cursor:"pointer"},onClick:async()=>{var i;const r=null===(i=e.filename.match(/evolution-(\w+)-/))||void 0===i?void 0:i[1];if(r&&"summary"!==r)try{const e=await d(`/polybot/mirofish/evolve/${r}`);Qe(e)}catch{}},children:[(0,n.jsx)("td",{style:{color:"#a5b4fc",fontWeight:600},children:e.filename.replace(".json","")}),(0,n.jsxs)("td",{children:[(e.size/1024).toFixed(1)," KB"]}),(0,n.jsx)("td",{children:new Date(e.created).toLocaleString()})]},e.filename)))})]})})]})}),!Ke&&!(null!==Ue&&void 0!==Ue&&null!==(ge=Ue.results)&&void 0!==ge&&ge.length)&&(0,n.jsx)(v,{children:(0,n.jsx)(M,{children:"No evolution results yet. Select a strategy and click \u201cEvolve Strategy\u201d to start the genetic algorithm."})})]}),"params"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\u2699\ufe0f Live Evolved Parameters"}),(0,n.jsx)(j,{style:{textAlign:"left",margin:"0 0 1rem 0",maxWidth:"none"},children:"Shows which evolved parameters are currently overriding strategy defaults. These are applied at server startup from the latest evolution results."}),(0,n.jsxs)(U,{children:[(0,n.jsx)(P,{$variant:"primary",onClick:async()=>{si(!0);try{const e=await d("/polybot/mirofish/params/reapply",{method:"POST"});ri((i=>({...i,reapplyResult:e}))),await Si()}catch(e){Ee(e.message)}finally{si(!1)}},disabled:ti,children:ti?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Re-applying..."]}):"\ud83d\udd04 Re-apply Latest"}),(0,n.jsx)(P,{$variant:"ghost",onClick:Si,children:"\u21bb Refresh"})]})]})}),!1===(null===ii||void 0===ii?void 0:ii.available)&&(0,n.jsx)(v,{children:(0,n.jsx)(M,{children:"Param applicator not loaded. Run an evolution first, then restart the server."})}),null===ii||void 0===ii||null===(me=ii.results)||void 0===me?void 0:me.map(((e,i)=>{var r;return(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:.15+.08*i+"s",$glow:e.applied,children:[(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"},children:[(0,n.jsxs)(w,{style:{margin:0},children:[e.applied?"\u2705":"\u23f8\ufe0f"," ",e.strategy]}),(0,n.jsxs)("div",{style:{display:"flex",gap:"0.75rem",alignItems:"center"},children:[e.applied&&(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)("span",{style:{fontSize:"0.72rem",color:"#fbbf24",fontWeight:700},children:["Fitness: ",null===(r=e.fitness)||void 0===r?void 0:r.toFixed(1)]}),(0,n.jsxs)("span",{style:{fontSize:"0.72rem",color:"#94a3b8"},children:["Gen ",e.generation," \u2022 ",e.genomeId]})]}),!e.applied&&(0,n.jsx)("span",{style:{fontSize:"0.72rem",color:"#f87171"},children:e.reason||"Not applied"})]})]}),e.applied&&e.overrides&&Object.keys(e.overrides).length>0&&(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Parameter"}),(0,n.jsx)("th",{children:"Default"}),(0,n.jsx)("th",{children:"\u2192"}),(0,n.jsx)("th",{children:"Evolved"}),(0,n.jsx)("th",{children:"Change"})]})}),(0,n.jsx)("tbody",{children:Object.entries(e.overrides).map((e=>{var i;let[r,t]=e;const s="number"===typeof t.old?t.old:parseFloat(t.old)||0,l="number"===typeof t.new?t.new:parseFloat(t.new)||0,o=0!==s?(l-s)/Math.abs(s)*100:0,a=l>s;return(0,n.jsxs)("tr",{children:[(0,n.jsx)("td",{style:{color:"#a5b4fc",fontWeight:600},children:r}),(0,n.jsx)("td",{style:{color:"#94a3b8",fontVariantNumeric:"tabular-nums"},children:"number"===typeof t.old?t.old.toFixed(4).replace(/\.?0+$/,""):String(null!==(i=t.old)&&void 0!==i?i:"\u2014")}),(0,n.jsx)("td",{style:{color:"#64748b",textAlign:"center"},children:"\u2192"}),(0,n.jsx)("td",{style:{color:"#6ee7b7",fontWeight:700,fontVariantNumeric:"tabular-nums"},children:"number"===typeof t.new?t.new.toFixed(4).replace(/\.?0+$/,""):String(t.new)}),(0,n.jsxs)("td",{style:{color:Math.abs(o)>50?"#f87171":a?"#34d399":"#fb923c",fontWeight:600,fontSize:"0.78rem"},children:[a?"\u25b2":"\u25bc"," ",Math.abs(o).toFixed(0),"%",Math.abs(o)>100&&" \u26a0\ufe0f"]})]},r)}))})]})}),e.applied&&(!e.overrides||0===Object.keys(e.overrides).length)&&(0,n.jsx)("div",{style:{color:"#94a3b8",fontSize:"0.78rem",fontStyle:"italic"},children:"No parameter overrides recorded"})]})},e.strategy)})),(null===ii||void 0===ii?void 0:ii.appliedAt)&&(0,n.jsx)(v,{children:(0,n.jsx)(S,{$delay:"0.6s",children:(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,n.jsxs)("span",{style:{color:"#94a3b8",fontSize:"0.78rem"},children:["Last applied: ",new Date(ii.appliedAt).toLocaleString()]}),(0,n.jsxs)("span",{style:{color:"#64748b",fontSize:"0.72rem"},children:[(null===(pe=ii.results)||void 0===pe||null===(ue=pe.filter((e=>e.applied)))||void 0===ue?void 0:ue.length)||0," / ",(null===(je=ii.results)||void 0===je?void 0:je.length)||0," strategies with active overrides"]})]})})})]}),"pipeline"===we&&(0,n.jsxs)(f,{children:[(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.1s",children:[(0,n.jsx)(w,{children:"\ud83d\udd17 MiroFish Signal Pipeline"}),(0,n.jsx)(j,{style:{textAlign:"left",margin:"0 0 1rem 0",maxWidth:"none"},children:"Polymarket Question \u2192 Scenario Builder \u2192 Knowledge Graph \u2192 Multi-Agent Simulation \u2192 Stance/Sentiment Analysis \u2192 Probability Signal \u2192 Polybot Ensemble"}),(0,n.jsxs)(U,{children:[(0,n.jsx)(P,{$variant:"primary",onClick:async()=>{ci(!0);try{const e=await d("/polybot/mirofish/batch",{method:"POST",body:JSON.stringify({maxSimulations:3})});await wi(),null!==e&&void 0!==e&&e.reason&&Ee(e.reason)}catch(e){Ee(e.message)}finally{ci(!1)}},disabled:di,children:di?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(E,{})," Running Batch..."]}):"\ud83d\ude80 Run Batch Simulation"}),(0,n.jsx)(P,{$variant:"ghost",onClick:wi,disabled:oi,children:oi?(0,n.jsx)(E,{}):"\u21bb Refresh"})]})]})}),li&&!li.miroFishAvailable&&(0,n.jsx)(v,{children:(0,n.jsx)(S,{$delay:"0.12s",style:{borderColor:"rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.05)"},children:(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem"},children:[(0,n.jsx)("span",{style:{fontSize:"1.5rem"},children:"\u26a0\ufe0f"}),(0,n.jsxs)("div",{children:[(0,n.jsx)("div",{style:{fontWeight:700,color:"#fbbf24",fontSize:"0.88rem"},children:"MiroFish Engine Not Connected"}),(0,n.jsxs)("div",{style:{color:"#94a3b8",fontSize:"0.75rem",marginTop:"0.15rem"},children:["Set the ",(0,n.jsx)("code",{style:{color:"#a5b4fc",background:"rgba(165,180,252,0.1)",padding:"0.1rem 0.3rem",borderRadius:"4px"},children:"MIROFISH_URL"})," environment variable to enable the full signal pipeline. Strategy Lab features (testing, evolution, suggestions, live params) work independently."]})]})]})})}),(null===li||void 0===li?void 0:li.pipelineStages)&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.15s",children:[(0,n.jsx)(w,{children:"\ud83d\udcca Pipeline Stages"}),(0,n.jsx)("div",{style:{display:"flex",alignItems:"center",gap:"0.25rem",overflowX:"auto",padding:"0.5rem 0"},children:li.pipelineStages.map(((e,i)=>(0,n.jsxs)(t.Fragment,{children:[(0,n.jsxs)("div",{style:{background:e.count>0?"rgba(16,185,129,0.12)":"rgba(100,116,139,0.1)",border:"1px solid "+(e.count>0?"rgba(16,185,129,0.3)":"rgba(100,116,139,0.2)"),borderRadius:"10px",padding:"0.75rem 1rem",minWidth:"140px",textAlign:"center",flex:"0 0 auto"},children:[(0,n.jsx)("div",{style:{fontSize:"1.5rem",fontWeight:800,color:e.count>0?"#6ee7b7":"#64748b"},children:e.count}),(0,n.jsx)("div",{style:{fontWeight:700,color:"#e2e8f0",fontSize:"0.78rem",marginBottom:"0.15rem"},children:e.name}),(0,n.jsx)("div",{style:{color:"#94a3b8",fontSize:"0.68rem",lineHeight:1.3},children:e.desc})]}),i<li.pipelineStages.length-1&&(0,n.jsx)("div",{style:{color:"#6ee7b7",fontSize:"1.2rem",fontWeight:700,flex:"0 0 auto"},children:"\u2192"})]},e.name)))})]})}),(null===li||void 0===li?void 0:li.status)&&(0,n.jsxs)(S,{$delay:"0.2s",children:[(0,n.jsx)(w,{children:"\ud83d\udce1 MiroFish Status"}),(0,n.jsxs)($,{$cols:2,children:[(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:li.backendReachable?"#34d399":li.miroFishAvailable?"#fbbf24":"#f87171",children:li.backendReachable?"\u25cf Online":li.miroFishAvailable?"\u25d0 Module Only":"\u25cb Offline"}),(0,n.jsx)(R,{children:li.backendReachable?"Backend Connected":li.miroFishAvailable?"Backend Unreachable":"Not Configured"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#a5b4fc",children:li.status.totalSimulations||0}),(0,n.jsx)(R,{children:"Total Sims"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#6ee7b7",children:li.status.completedSimulations||0}),(0,n.jsx)(R,{children:"Completed"})]}),(0,n.jsxs)(k,{children:[(0,n.jsx)(A,{$color:"#fbbf24",children:li.status.queueLength||0}),(0,n.jsx)(R,{children:"Queued"})]})]}),!li.backendReachable&&li.miroFishAvailable&&(0,n.jsxs)("div",{style:{marginTop:"0.75rem",padding:"0.5rem 0.75rem",background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:"6px",fontSize:"0.72rem",color:"#fbbf24",lineHeight:1.5},children:["\u26a0\ufe0f MiroFish module loaded but backend at ",(0,n.jsx)("span",{style:{fontFamily:"monospace",color:"#e2e8f0"},children:li.backendUrl||"localhost:5001"})," is not reachable. Markets can be assessed & queued, but simulations won't run until the backend is online."]}),li.status.lastBatchTime&&(0,n.jsxs)("div",{style:{marginTop:"0.75rem",fontSize:"0.72rem",color:"#94a3b8"},children:["Last batch: ",q(li.status.lastBatchTime)]})]}),(null===li||void 0===li?void 0:li.categoryWeights)&&(0,n.jsxs)(S,{$delay:"0.25s",children:[(0,n.jsx)(w,{children:"\u2696\ufe0f Category Weights"}),(0,n.jsx)("div",{style:{display:"grid",gap:"0.4rem"},children:Object.entries(li.categoryWeights).sort(((e,i)=>{let[,r]=e,[,t]=i;return t-r})).map((e=>{let[i,r]=e;return(0,n.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[(0,n.jsx)("span",{style:{color:"#94a3b8",fontSize:"0.78rem",width:"80px",textTransform:"capitalize"},children:i}),(0,n.jsx)("div",{style:{flex:1,background:"rgba(100,116,139,0.15)",borderRadius:"4px",height:"18px",overflow:"hidden"},children:(0,n.jsx)("div",{style:{width:100*r/.35+"%",height:"100%",background:r>=.3?"#10b981":r>=.2?"#fbbf24":"#64748b",borderRadius:"4px",transition:"width 0.5s ease"}})}),(0,n.jsxs)("span",{style:{color:"#6ee7b7",fontWeight:700,fontSize:"0.78rem",width:"35px",textAlign:"right"},children:[(100*r).toFixed(0),"%"]})]},i)}))}),(0,n.jsx)("div",{style:{marginTop:"0.75rem",fontSize:"0.68rem",color:"#64748b",lineHeight:1.4},children:"Weight determines how much MiroFish signal influences the final ensemble probability for each market category."})]}),(null===li||void 0===li||null===(be=li.queue)||void 0===be?void 0:be.length)>0&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.3s",children:[(0,n.jsxs)(w,{children:["\ud83d\udccb Simulation Queue (",li.queue.length," pending)"]}),(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Market Question"}),(0,n.jsx)("th",{children:"Category"}),(0,n.jsx)("th",{children:"Priority"}),(0,n.jsx)("th",{children:"Queued"})]})}),(0,n.jsx)("tbody",{children:li.queue.map((e=>(0,n.jsxs)("tr",{children:[(0,n.jsx)("td",{style:{maxWidth:"400px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.question}),(0,n.jsx)("td",{children:(0,n.jsx)("span",{style:{background:"rgba(16,185,129,0.1)",padding:"0.15rem 0.5rem",borderRadius:"6px",fontSize:"0.72rem",color:"#6ee7b7",textTransform:"capitalize"},children:e.category})}),(0,n.jsx)("td",{style:{fontWeight:700,color:e.priority>=80?"#fbbf24":"#94a3b8"},children:e.priority}),(0,n.jsx)("td",{style:{color:"#94a3b8",fontSize:"0.75rem"},children:q(e.queuedAt)})]},e.conditionId)))})]})})]})}),(null===li||void 0===li||null===(ye=li.simulations)||void 0===ye?void 0:ye.length)>0&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.35s",children:[(0,n.jsxs)(w,{children:["\ud83d\udc1f Completed Simulations (",li.simulations.filter((e=>"completed"===e.status)).length,")"]}),(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Market"}),(0,n.jsx)("th",{children:"Status"}),(0,n.jsx)("th",{children:"Market Price"}),(0,n.jsx)("th",{children:"MiroFish Signal"}),(0,n.jsx)("th",{children:"Divergence"}),(0,n.jsx)("th",{children:"Confidence"}),(0,n.jsx)("th",{children:"Methods"}),(0,n.jsx)("th",{children:"Report"})]})}),(0,n.jsx)("tbody",{children:li.simulations.map((e=>{var i;const r=null!=e.prob&&null!=e.yesPrice?(100*(e.prob-e.yesPrice)).toFixed(1):null,t=(e.confidence||"").toUpperCase();return(0,n.jsxs)("tr",{onClick:()=>"completed"===e.status&&bi(e.conditionId),style:{cursor:"completed"===e.status?"pointer":"default"},title:"completed"===e.status?"Click to view full report":"",children:[(0,n.jsx)("td",{style:{maxWidth:"220px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.question||(null===(i=e.conditionId)||void 0===i?void 0:i.slice(0,12))}),(0,n.jsx)("td",{children:(0,n.jsxs)("span",{style:{color:"completed"===e.status?"#34d399":"failed"===e.status?"#f87171":"#fbbf24",fontWeight:600},children:["completed"===e.status?"\u2713":"failed"===e.status?"\u2717":"\u25cc"," ",e.status]})}),(0,n.jsx)("td",{style:{color:"#a5b4fc",fontWeight:600},children:null!=e.yesPrice?`${(100*e.yesPrice).toFixed(0)}\xa2`:"\u2014"}),(0,n.jsx)("td",{style:{fontWeight:700,color:"#6ee7b7",fontSize:"1rem"},children:null!=e.prob?`${(100*e.prob).toFixed(1)}%`:"\u2014"}),(0,n.jsx)("td",{style:{fontWeight:700,color:null==r?"#64748b":Math.abs(r)>=10?"#f59e0b":"#94a3b8"},children:null!=r?`${r>0?"+":""}${r}pp`:"\u2014"}),(0,n.jsx)("td",{children:(0,n.jsx)("span",{style:{color:"HIGH"===t?"#34d399":"MEDIUM"===t?"#fbbf24":"#f87171",fontWeight:600},children:t||"\u2014"})}),(0,n.jsx)("td",{style:{color:"#a5b4fc"},children:e.methodCount||"\u2014"}),(0,n.jsx)("td",{style:{color:"#a5b4fc",fontSize:"0.72rem",textAlign:"center"},children:"completed"===e.status?"\ud83d\udcc4 View":"\u2014"})]},e.conditionId)}))})]})})]})}),(null===li||void 0===li||null===(fe=li.assessedMarkets)||void 0===fe?void 0:fe.length)>0&&(0,n.jsx)(v,{children:(0,n.jsxs)(S,{$delay:"0.4s",children:[(0,n.jsxs)(w,{children:["\ud83c\udfaf Assessed Markets (",li.assessedMarkets.length," candidates)"]}),(0,n.jsx)(j,{style:{textAlign:"left",margin:"0 0 0.75rem 0",maxWidth:"none"},children:"Markets the Scenario Builder has ranked for MiroFish simulation based on category, suitability, and priority."}),(0,n.jsx)(F,{children:(0,n.jsxs)(T,{children:[(0,n.jsx)("thead",{children:(0,n.jsxs)("tr",{children:[(0,n.jsx)("th",{children:"Question"}),(0,n.jsx)("th",{children:"Category"}),(0,n.jsx)("th",{children:"Price"}),(0,n.jsx)("th",{children:"Priority"}),(0,n.jsx)("th",{children:"Reason"})]})}),(0,n.jsx)("tbody",{children:li.assessedMarkets.map((e=>(0,n.jsxs)("tr",{children:[(0,n.jsx)("td",{style:{maxWidth:"300px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.question}),(0,n.jsx)("td",{children:(0,n.jsx)("span",{style:{background:"rgba(16,185,129,0.1)",padding:"0.15rem 0.5rem",borderRadius:"6px",fontSize:"0.72rem",color:"#6ee7b7",textTransform:"capitalize"},children:e.category})}),(0,n.jsx)("td",{style:{fontWeight:700,color:"#a5b4fc"},children:e.yesPrice?`${(100*parseFloat(e.yesPrice)).toFixed(0)}\xa2`:"\u2014"}),(0,n.jsx)("td",{children:(0,n.jsx)("span",{style:{fontWeight:700,color:e.priority>=80?"#fbbf24":e.priority>=50?"#fb923c":"#94a3b8"},children:e.priority})}),(0,n.jsx)("td",{style:{color:"#94a3b8",fontSize:"0.72rem",maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.reason||"\u2014"})]},e.conditionId)))})]})})]})}),!li&&!oi&&(0,n.jsx)(v,{children:(0,n.jsx)(M,{children:"Loading pipeline data... Click Refresh if this persists."})})]})]})]}),pi&&(0,n.jsx)(W,{onClick:()=>ui(!1),children:(0,n.jsx)(O,{onClick:e=>e.stopPropagation(),children:gi?(0,n.jsxs)("div",{style:{textAlign:"center",padding:"3rem"},children:[(0,n.jsx)(E,{}),(0,n.jsx)("p",{style:{color:"#94a3b8",marginTop:"1rem"},children:"Loading full report..."})]}):null!==hi&&void 0!==hi&&hi.error?(0,n.jsxs)("div",{style:{textAlign:"center",padding:"2rem",color:"#f87171"},children:["Error: ",hi.error]}):hi?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)(_,{children:[(0,n.jsxs)("div",{children:[(0,n.jsx)("h3",{style:{color:"#e2e8f0",margin:"0 0 0.5rem",fontSize:"1rem",lineHeight:1.4},children:hi.question}),(0,n.jsxs)("div",{style:{display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"},children:[null!=hi.prob&&(0,n.jsxs)("span",{style:{color:"#6ee7b7",fontWeight:700,fontSize:"1.1rem"},children:["MiroFish: ",(100*hi.prob).toFixed(1),"% YES"]}),null!=hi.yesPrice&&(0,n.jsxs)("span",{style:{color:"#a5b4fc",fontSize:"0.85rem"},children:["Market: ",(100*hi.yesPrice).toFixed(0),"\xa2"]}),hi.confidence&&(0,n.jsxs)("span",{style:{background:"HIGH"===hi.confidence?"rgba(52,211,153,0.15)":"MEDIUM"===hi.confidence?"rgba(251,191,36,0.15)":"rgba(248,113,113,0.15)",color:"HIGH"===hi.confidence?"#34d399":"MEDIUM"===hi.confidence?"#fbbf24":"#f87171",padding:"0.15rem 0.5rem",borderRadius:"6px",fontSize:"0.75rem",fontWeight:600},children:[hi.confidence," confidence"]})]})]}),(0,n.jsx)(L,{onClick:()=>ui(!1),children:"\u2715 Close"})]}),hi.reportMarkdown&&(0,n.jsxs)(B,{children:[(0,n.jsx)(N,{children:"\ud83d\udcdc Scenario Analysis Report"}),(0,n.jsx)("pre",{style:{color:"#cbd5e1",fontSize:"0.78rem",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0,fontFamily:"inherit"},children:hi.reportMarkdown})]}),hi.reasoning&&(0,n.jsxs)(B,{children:[(0,n.jsx)(N,{children:"\ud83e\udde0 Probability Reasoning"}),(0,n.jsx)("p",{style:{color:"#94a3b8",fontSize:"0.82rem",margin:0,lineHeight:1.6},children:hi.reasoning})]}),(null===(ve=hi.methods)||void 0===ve?void 0:ve.length)>0&&(0,n.jsxs)(B,{children:[(0,n.jsxs)(N,{children:["\ud83d\udcca Analysis Methods (",hi.methodCount||hi.methods.length,")"]}),hi.methods.map(((e,i)=>(0,n.jsxs)("div",{style:{background:"rgba(15,15,26,0.4)",borderRadius:"8px",padding:"0.75rem 1rem",marginBottom:"0.5rem"},children:[(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.35rem"},children:[(0,n.jsx)(G,{children:e.name||e.method||`Method ${i+1}`}),(0,n.jsx)("span",{style:{color:"#6ee7b7",fontWeight:700,fontSize:"0.9rem"},children:null!=e.prob?`${(100*e.prob).toFixed(1)}%`:"\u2014"})]}),(0,n.jsxs)("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.75rem",fontSize:"0.72rem",color:"#94a3b8"},children:[null!=e.yesCount&&(0,n.jsxs)("span",{children:["YES: ",(0,n.jsx)("b",{style:{color:"#34d399"},children:e.yesCount})," \xb7 NO: ",(0,n.jsx)("b",{style:{color:"#f87171"},children:e.noCount})," \xb7 Neutral: ",e.neutralCount||0]}),null!=e.avgSentiment&&(0,n.jsxs)("span",{children:["Avg Sentiment: ",(0,n.jsx)("b",{style:{color:e.avgSentiment>=0?"#34d399":"#f87171"},children:e.avgSentiment.toFixed(3)})]}),null!=e.totalInfluence&&(0,n.jsxs)("span",{children:["Influence Score: ",(0,n.jsx)("b",{style:{color:"#a5b4fc"},children:e.totalInfluence.toLocaleString()})]}),null!=e.shift&&(0,n.jsxs)("span",{children:["Shift: ",(0,n.jsxs)("b",{style:{color:e.shift>0?"#34d399":e.shift<0?"#f87171":"#94a3b8"},children:[e.shift>0?"+":"",(100*e.shift).toFixed(1),"pp"]})," ",e.isConverging?"(converging \u2713)":"(diverging)"]}),null!=e.firstHalfProb&&(0,n.jsxs)("span",{children:["Early: ",(100*e.firstHalfProb).toFixed(0),"% \u2192 Late: ",(100*e.secondHalfProb).toFixed(0),"%"]}),null!=(e.postCount||e.totalPosts)&&(0,n.jsxs)("span",{children:[e.postCount||e.totalPosts," posts analyzed"]}),null!=e.weight&&(0,n.jsxs)("span",{style:{color:"#475569"},children:["weight: ",e.weight.toFixed(2)]})]})]},i)))]}),(null===(Se=hi.agentPosts)||void 0===Se?void 0:Se.length)>0&&(0,n.jsxs)(B,{children:[(0,n.jsxs)(N,{children:["\ud83d\udc65 Agent Debate Posts (",hi.agentPosts.length,")"]}),(0,n.jsx)("div",{style:{display:"flex",gap:"0.5rem",marginBottom:"0.75rem",flexWrap:"wrap"},children:["YES","NO","NEUTRAL"].map((e=>{const i=hi.agentPosts.filter((i=>(i.stance||"").toUpperCase()===e)).length;return i>0&&(0,n.jsxs)("span",{style:{fontSize:"0.72rem",padding:"0.15rem 0.5rem",borderRadius:"6px",background:"YES"===e?"rgba(52,211,153,0.12)":"NO"===e?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)",color:"YES"===e?"#34d399":"NO"===e?"#f87171":"#fbbf24"},children:[e,": ",i]},e)}))}),hi.agentPosts.map(((e,i)=>{var r;return(0,n.jsxs)(D,{$stance:(e.stance||"").toUpperCase(),children:[(0,n.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"0.25rem"},children:[(0,n.jsx)(H,{children:e.agent}),(0,n.jsxs)("span",{style:{fontSize:"0.68rem",color:"#64748b"},children:["Round ",e.round," \xb7 ",null===(r=e.followers)||void 0===r?void 0:r.toLocaleString()," followers"]})]}),(0,n.jsx)("p",{style:{color:"#cbd5e1",margin:0,fontSize:"0.78rem",lineHeight:1.5},children:e.content})]},i)}))]}),(0,n.jsxs)("div",{style:{display:"flex",gap:"1rem",justifyContent:"flex-end",color:"#475569",fontSize:"0.7rem",marginTop:"0.5rem"},children:[hi.startedAt&&(0,n.jsxs)("span",{children:["Started: ",new Date(hi.startedAt).toLocaleString()]}),hi.completedAt&&(0,n.jsxs)("span",{children:["Completed: ",new Date(hi.completedAt).toLocaleString()]})]})]}):null})})]})}function q(e){const i=Math.floor((Date.now()-new Date(e).getTime())/1e3);return i<60?`${i}s ago`:i<3600?`${Math.floor(i/60)}m ago`:i<86400?`${Math.floor(i/3600)}h ago`:`${Math.floor(i/86400)}d ago`}}}]);