"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[553],{4508:(e,r,t)=>{t.d(r,{A:()=>i});var n=t(9950);const i=(e,r)=>{(0,n.useEffect)((()=>{if(e){const e=document.body.style.overflow;return document.body.style.overflow="hidden",()=>{document.body.style.overflow=e}}}),[e]);const t=(0,n.useCallback)((t=>{"Escape"===t.key&&e&&r()}),[e,r]);(0,n.useEffect)((()=>(document.addEventListener("keydown",t),()=>document.removeEventListener("keydown",t))),[t])}},7828:(e,r,t)=>{t.r(r),t.d(r,{default:()=>fe});var n=t(9950),i=t(4937),o=t(5105),a=(t(9159),t(6220)),l=t(5042),d=t(3507),s=t(4508),c=t(1095),m=t(8354),h=t(3245),g=t(158),p=t(4813),x=t(6335),u=t(734),j=t(7360),y=t(4203),f=t(2528),b=t(4414);const v={bg:"#0a0a12",card:"rgba(22, 22, 38, 0.85)",border:"rgba(99, 102, 241, 0.12)",borderHi:"rgba(99, 102, 241, 0.35)",text:"#e2e8f0",muted:"#94a3b8",dim:"#64748b",indigo:"#6366f1",purple:"#818cf8",lavender:"#a5b4fc",green:"#34d399",greenBg:"rgba(52, 211, 153, 0.12)",red:"#f87171",redBg:"rgba(248, 113, 113, 0.12)",amber:"#fbbf24",radius:"14px"},$=i.i7`
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
`,k=i.i7`
  from { opacity: 0; }
  to   { opacity: 1; }
`,w=i.Ay.div`
  min-height: 100vh;
  background: linear-gradient(160deg, #0a0a14 0%, #12122a 50%, #14203a 100%);
  color: ${v.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 1rem 0.75rem 3rem;
  @media (min-width: 768px) { padding: 2rem 2rem 4rem; }
`,S=i.Ay.div`
  max-width: 1280px;
  margin: 0 auto;
`,C=i.Ay.header`
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${$} 0.5s ease-out;
`,A=i.Ay.h1`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, ${v.lavender}, ${v.purple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.35rem;
  @media (min-width: 768px) { font-size: 2.75rem; }
`,T=i.Ay.p`
  color: ${v.muted};
  font-size: 0.9rem;
  margin: 0;
`,z=i.Ay.nav`
  display: flex;
  gap: 0.25rem;
  background: rgba(15, 15, 28, 0.6);
  border: 1px solid ${v.border};
  border-radius: 12px;
  padding: 4px;
  margin: 0 auto 1.5rem;
  max-width: 460px;
  animation: ${$} 0.5s ease-out 0.1s both;
`,F=i.Ay.button`
  flex: 1;
  padding: 0.55rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  background: ${e=>e.$active?`linear-gradient(135deg, ${v.indigo}, ${v.purple})`:"transparent"};
  color: ${e=>e.$active?"#fff":v.muted};
  &:hover { color: #fff; }
  @media (min-width: 768px) { font-size: 0.85rem; padding: 0.6rem 1rem; }
`,W=i.Ay.div`
  background: ${v.card};
  border: 1px solid ${v.border};
  border-radius: ${v.radius};
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: border-color 0.3s, transform 0.3s;
  animation: ${$} 0.5s ease-out ${e=>e.$delay||"0s"} both;
  &:hover { border-color: ${v.borderHi}; }
  @media (min-width: 768px) { padding: 1.25rem; }
`,L=i.Ay.h2`
  font-size: 0.95rem;
  font-weight: 700;
  color: #c7d2fe;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,D=i.Ay.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
  animation: ${$} 0.5s ease-out 0.15s both;

  @media (min-width: 768px) {
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
  }
`,B=i.Ay.div`
  background: ${v.card};
  border: 1px solid ${v.border};
  border-radius: 12px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  transition: border-color 0.3s, transform 0.3s;
  &:hover { border-color: ${v.borderHi}; transform: translateY(-2px); }
`,P=i.Ay.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${v.dim};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  @media (min-width: 768px) { font-size: 0.7rem; }
`,M=i.Ay.div`
  font-size: 1.15rem;
  font-weight: 800;
  color: ${e=>e.$color||v.text};
  @media (min-width: 768px) { font-size: 1.35rem; }
`,R=i.Ay.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
`,H=i.Ay.div`
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid ${v.border};
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(99, 102, 241, 0.06); }
  &:last-child { border-bottom: none; }

  @media (min-width: 768px) {
    grid-template-columns: 100px 1fr auto auto auto auto;
  }
`,E=(0,i.Ay)(H)`
  font-size: 0.7rem;
  font-weight: 700;
  color: ${v.dim};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: default;
  &:hover { background: none; }
  border-bottom: 1px solid ${v.borderHi};
`,_=i.Ay.span`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  ${e=>"win"===e.$variant&&i.AH`background: ${v.greenBg}; color: ${v.green};`}
  ${e=>"loss"===e.$variant&&i.AH`background: ${v.redBg}; color: ${v.red};`}
  ${e=>"be"===e.$variant&&i.AH`background: rgba(251, 191, 36, 0.12); color: ${v.amber};`}
  ${e=>"long"===e.$variant&&i.AH`background: ${v.greenBg}; color: ${v.green};`}
  ${e=>"short"===e.$variant&&i.AH`background: ${v.redBg}; color: ${v.red};`}
`,I=i.Ay.span`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${e=>e.$val>0?v.green:e.$val<0?v.red:v.muted};
`,N=i.Ay.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
  @media (min-width: 600px) { grid-template-columns: 1fr 1fr; }
`,O=i.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  ${e=>e.$full&&i.AH`
    @media (min-width: 600px) { grid-column: 1 / -1; }
  `}
`,q=i.Ay.label`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${v.dim};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`,G=i.Ay.input`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${v.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${v.text};
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus {
    border-color: ${v.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  &::placeholder { color: ${v.dim}; }
`,J=i.Ay.select`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${v.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${v.text};
  cursor: pointer;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${v.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  option { background: #12122a; color: ${v.text}; }
`,U=i.Ay.textarea`
  padding: 0.6rem 0.75rem;
  font-size: 15px;
  border: 1px solid ${v.border};
  border-radius: 10px;
  background: rgba(10, 10, 18, 0.6);
  color: ${v.text};
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${v.indigo};
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }
  &::placeholder { color: ${v.dim}; }
`,Y=i.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  ${e=>e.$full&&i.AH`
    @media (min-width: 600px) { grid-column: 1 / -1; }
  `}
`,K=i.Ay.button`
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  &:hover { opacity: 0.9; }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${e=>e.$primary&&i.AH`
    background: linear-gradient(135deg, ${v.indigo}, ${v.purple});
    color: #fff;
  `}
  ${e=>e.$ghost&&i.AH`
    background: rgba(99, 102, 241, 0.1);
    color: ${v.lavender};
    border: 1px solid ${v.border};
  `}
  ${e=>e.$danger&&i.AH`
    background: ${v.redBg};
    color: ${v.red};
    border: 1px solid rgba(248, 113, 113, 0.2);
  `}
`,Q=i.Ay.div`
  .react-calendar {
    width: 100%;
    background: transparent;
    border: none;
    font-family: inherit;
    color: ${v.text};
  }
  .react-calendar__navigation { margin-bottom: 0.25rem; }
  .react-calendar__navigation button {
    color: ${v.text};
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 8px;
    &:hover, &:focus { background: rgba(99, 102, 241, 0.1); }
    &:disabled { color: ${v.dim}; }
  }
  .react-calendar__month-view__weekdays {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: ${v.dim};
    font-weight: 700;
    abbr { text-decoration: none; }
  }
  .react-calendar__tile {
    padding: 0.5rem 0.15rem;
    border-radius: 8px;
    color: ${v.text};
    font-size: 0.75rem;
    position: relative;
    transition: background 0.2s;
    &:hover { background: rgba(99, 102, 241, 0.08); }
  }
  .react-calendar__tile--now {
    background: rgba(99, 102, 241, 0.1);
    font-weight: 700;
  }
  .react-calendar__tile--active {
    background: linear-gradient(135deg, ${v.indigo}, ${v.purple}) !important;
    color: #fff;
    border-radius: 8px;
  }
  .react-calendar__month-view__days__day--neighboringMonth { color: ${v.dim}; opacity: 0.4; }
`,V=i.Ay.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 2px auto 0;
  background: ${e=>e.$color};
`,X=i.Ay.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${k} 0.2s ease-out;
  padding: 1rem;
`,Z=i.Ay.div`
  background: #12122a;
  border: 1px solid ${v.borderHi};
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  animation: ${$} 0.3s ease-out;
`,ee=i.Ay.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid ${v.border};
  color: ${v.muted};
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: #fff; border-color: ${v.borderHi}; }
`,re=i.Ay.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
`,te=i.Ay.div`
  background: rgba(10, 10, 20, 0.5);
  border: 1px solid ${v.border};
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  ${e=>e.$full&&i.AH`grid-column: 1 / -1;`}
`,ne=i.Ay.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${v.dim};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
`,ie=i.Ay.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${e=>e.$color||v.text};
`,oe=i.Ay.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: ${v.muted};
  animation: ${k} 0.5s ease-out;
`,ae=i.Ay.div`
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
`,le=e=>String(e||"").replace(/[^0-9.\x2D]+/g,""),de=e=>{const r=parseFloat(le(e));return isNaN(r)?"$0.00":`${r>=0?"+":""}$${r.toFixed(2)}`},se=e=>{const r=parseFloat(le(e));return isNaN(r)?"0%":`${r>=0?"+":""}${r.toFixed(1)}%`},ce=e=>{const r=new Date(e);return isNaN(r)?(new Date).toISOString().split("T")[0]:r.toISOString().split("T")[0]},me=e=>{const r=new Date(e),t=String(r.getMonth()+1).padStart(2,"0"),n=String(r.getDate()).padStart(2,"0");return`${r.getFullYear()}-${t}-${n}`},he=["Long","Short"],ge=["Win","Loss","Break Even"],pe=["London Open","NY Open","London Close","Asian","Overlap","Other"],xe=["ICT OTE","FVG","Breaker Block","Order Block","Liquidity Sweep","SMT Divergence","Turtle Soup","Silver Bullet","Other"],ue=[v.green,v.red,v.amber],je={pair:"",direction:"",date:"",outcome:"",pnl:"",gain:"",risk:"",rrr:"",entryTf:"",entryWindow:"",day:"",model:"",killzone:"",timeInTrade:"",notes:""},ye=e=>{let{data:r,width:t=200,height:n=50,color:i=v.indigo}=e;if(!r||r.length<2)return null;const o=Math.min(...r),a=Math.max(...r)-o||1,l=r.map(((e,i)=>`${i/(r.length-1)*t},${n-(e-o)/a*(n-4)-2}`)).join(" "),d=`sp-${i.replace("#","")}`;return(0,b.jsxs)("svg",{width:t,height:n,style:{display:"block"},children:[(0,b.jsx)("defs",{children:(0,b.jsxs)("linearGradient",{id:d,x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,b.jsx)("stop",{offset:"0%",stopColor:i,stopOpacity:.3}),(0,b.jsx)("stop",{offset:"100%",stopColor:i,stopOpacity:0})]})}),(0,b.jsx)("polygon",{points:`0,${n} ${l} ${t},${n}`,fill:`url(#${d})`}),(0,b.jsx)("polyline",{points:l,fill:"none",stroke:i,strokeWidth:2,strokeLinejoin:"round"})]})},fe=()=>{const{user:e}=(0,d.A)(),[r,t]=(0,n.useState)([]),[i,$]=(0,n.useState)("dashboard"),[k,fe]=(0,n.useState)(new Date),[be,ve]=(0,n.useState)({...je}),[$e,ke]=(0,n.useState)(!1),[we,Se]=(0,n.useState)(null),[Ce,Ae]=(0,n.useState)(null),[Te,ze]=(0,n.useState)(null),[Fe,We]=(0,n.useState)(!1),[Le,De]=(0,n.useState)("date"),[Be,Pe]=(0,n.useState)(!1),[Me,Re]=(0,n.useState)("all"),He=(0,n.useCallback)((async()=>{if(e)try{ze(null);const r=(0,a.P)((0,a.rJ)(l.db,"tradingJournal"),(0,a._M)("userId","==",e.uid)),n=await(0,a.GG)(r);t(n.docs.map((e=>({id:e.id,...e.data()}))))}catch{ze("Failed to load journal. Please refresh.")}}),[e]);(0,n.useEffect)((()=>{He()}),[He]);const Ee=(0,n.useMemo)((()=>{let e=0,t=0,n=0,i=0,o=0,a=-1/0,l=1/0,d=0,s=0,c=null;const m={};[...r].sort(((e,r)=>new Date(e.date)-new Date(r.date))).forEach((r=>{const h=parseFloat(le(r.pnl));if(isNaN(h))return;e+=h,h>0?(t++,i+=h,a=Math.max(a,h)):h<0&&(n++,o+=h,l=Math.min(l,h));const g=h>0?"w":h<0?"l":null;g&&g===c?d++:g&&(d=1,c=g),s=Math.max(s,d);const p=me(r.date);m[p]=(m[p]||0)+h}));const h=t+n,g=h?t/h*100:0,p=0===o?i>0?1/0:0:i/Math.abs(o),x=t?i/t:0,u=n?o/n:0,j=Object.keys(m).sort();let y=0;const f=j.map((e=>(y+=m[e],{date:e,pnl:m[e],cumPnl:y}))),b=f.map((e=>e.cumPnl));return{totalPnl:e,wins:t,losses:n,total:h,winRate:g,pf:p,avgWin:x,avgLoss:u,best:a===-1/0?0:a,worst:l===1/0?0:l,streak:d,streakType:c,maxStreak:s,equity:f,sparkData:b,daily:m}}),[r]),_e=(0,n.useMemo)((()=>{let e=[...r];return"all"!==Me&&(e=e.filter((e=>{const r=(e.outcome||"").toLowerCase();return"win"===Me?"win"===r:"loss"===Me?"loss"===r:"break even"===r||"be"===r}))),e.sort(((e,r)=>{let t=e[Le]||"",n=r[Le]||"";return"pnl"===Le&&(t=parseFloat(le(t))||0,n=parseFloat(le(n))||0),"date"===Le&&(t=new Date(t),n=new Date(n)),t<n?Be?-1:1:t>n?Be?1:-1:0})),e}),[r,Me,Le,Be]),Ie=(0,n.useMemo)((()=>{const e=me(k);return r.filter((r=>me(r.date)===e))}),[r,k]),Ne=e=>{Le===e?Pe(!Be):(De(e),Pe("date"!==e))},Oe=e=>{const{name:r,value:t}=e.target;ve((e=>({...e,[r]:t})))},qe=()=>{ve({...je}),ke(!1)},Ge=e=>{ve(e),ke(!0),$("add")},Je=(0,n.useCallback)((()=>Se(null)),[]);(0,s.A)(!!we,Je);const Ue=(0,n.useMemo)((()=>[{name:"Wins",value:Ee.wins},{name:"Losses",value:Ee.losses},{name:"B/E",value:Math.max(0,Ee.total>0?r.length-Ee.wins-Ee.losses:0)}].filter((e=>e.value>0))),[Ee,r.length]);return(0,b.jsx)(w,{children:(0,b.jsxs)(S,{children:[(0,b.jsxs)(C,{children:[(0,b.jsx)(A,{children:"Trading Journal"}),(0,b.jsx)(T,{children:"Track every trade. Measure every edge. Improve every day."})]}),(0,b.jsxs)(z,{children:[(0,b.jsx)(F,{$active:"dashboard"===i,onClick:()=>$("dashboard"),children:"\ud83d\udcca Dashboard"}),(0,b.jsx)(F,{$active:"trades"===i,onClick:()=>$("trades"),children:"\ud83d\udccb Trades"}),(0,b.jsx)(F,{$active:"calendar"===i,onClick:()=>$("calendar"),children:"\ud83d\udcc5 Calendar"}),(0,b.jsxs)(F,{$active:"add"===i,onClick:()=>{$("add"),$e||qe()},children:["\u270f\ufe0f ",$e?"Edit":"Log Trade"]})]}),Te&&(0,b.jsx)("div",{style:{textAlign:"center",color:v.red,fontSize:"0.85rem",marginBottom:"1rem"},children:Te}),"dashboard"===i&&(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)(D,{children:[(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Total P&L"}),(0,b.jsx)(M,{$color:Ee.totalPnl>=0?v.green:v.red,children:de(String(Ee.totalPnl))})]}),(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Win Rate"}),(0,b.jsxs)(M,{$color:Ee.winRate>=50?v.green:Ee.winRate>0?v.amber:v.muted,children:[Ee.winRate.toFixed(1),"%"]})]}),(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Profit Factor"}),(0,b.jsx)(M,{$color:Ee.pf>=1.5?v.green:Ee.pf>=1?v.amber:v.red,children:Ee.pf===1/0?"\u221e":Ee.pf.toFixed(2)})]}),(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Total Trades"}),(0,b.jsx)(M,{children:r.length})]}),(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Best Trade"}),(0,b.jsx)(M,{$color:v.green,children:de(String(Ee.best))})]}),(0,b.jsxs)(B,{children:[(0,b.jsx)(P,{children:"Worst Trade"}),(0,b.jsx)(M,{$color:v.red,children:de(String(Ee.worst))})]})]}),0===r.length?(0,b.jsxs)(oe,{children:[(0,b.jsx)(ae,{children:"\ud83d\udcd3"}),(0,b.jsx)("div",{style:{fontSize:"1.1rem",fontWeight:700,color:v.text,marginBottom:"0.5rem"},children:"Your journal is empty"}),(0,b.jsx)("div",{style:{marginBottom:"1rem"},children:"Log your first trade to unlock analytics, equity curves, and win-rate tracking."}),(0,b.jsx)(K,{$primary:!0,onClick:()=>$("add"),children:"Log First Trade \u2192"})]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)(W,{$delay:"0.2s",style:{marginBottom:"1rem"},children:[(0,b.jsx)(L,{children:"\ud83d\udcc8 Equity Curve"}),(0,b.jsx)(c.u,{width:"100%",height:220,children:(0,b.jsxs)(m.Q,{data:Ee.equity,margin:{top:5,right:10,bottom:5,left:0},children:[(0,b.jsx)("defs",{children:(0,b.jsxs)("linearGradient",{id:"eqGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,b.jsx)("stop",{offset:"0%",stopColor:Ee.totalPnl>=0?v.green:v.red,stopOpacity:.3}),(0,b.jsx)("stop",{offset:"100%",stopColor:Ee.totalPnl>=0?v.green:v.red,stopOpacity:0})]})}),(0,b.jsx)(h.d,{strokeDasharray:"3 3",stroke:"rgba(99,102,241,0.08)"}),(0,b.jsx)(g.W,{dataKey:"date",stroke:v.dim,tick:{fill:v.dim,fontSize:11},tickFormatter:e=>e.slice(5)}),(0,b.jsx)(p.h,{stroke:v.dim,tick:{fill:v.dim,fontSize:11},tickFormatter:e=>`$${e}`}),(0,b.jsx)(x.m,{contentStyle:{background:"#12122a",border:`1px solid ${v.borderHi}`,borderRadius:"10px",fontSize:"0.8rem",color:v.text},formatter:e=>[`$${e.toFixed(2)}`,"Cumulative P&L"],labelFormatter:e=>`Date: ${e}`}),(0,b.jsx)(u.G,{type:"monotone",dataKey:"cumPnl",stroke:Ee.totalPnl>=0?v.green:v.red,strokeWidth:2.5,fill:"url(#eqGrad)",dot:!1})]})})]}),(0,b.jsxs)(R,{children:[(0,b.jsxs)(W,{$delay:"0.3s",children:[(0,b.jsx)(L,{children:"\ud83c\udfaf Win / Loss Distribution"}),(0,b.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:"1.5rem"},children:[(0,b.jsx)(j.r,{width:130,height:130,children:(0,b.jsx)(y.F,{data:Ue,cx:65,cy:65,innerRadius:38,outerRadius:58,paddingAngle:3,dataKey:"value",strokeWidth:0,children:Ue.map(((e,r)=>(0,b.jsx)(f.f,{fill:ue[r%ue.length]},r)))})}),(0,b.jsxs)("div",{style:{fontSize:"0.8rem"},children:[(0,b.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,b.jsx)("span",{style:{color:v.green,fontWeight:700},children:"\u25cf "}),"Wins: ",(0,b.jsx)("strong",{children:Ee.wins}),(0,b.jsxs)("span",{style:{color:v.dim,marginLeft:"0.5rem"},children:["avg ",de(String(Ee.avgWin))]})]}),(0,b.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,b.jsx)("span",{style:{color:v.red,fontWeight:700},children:"\u25cf "}),"Losses: ",(0,b.jsx)("strong",{children:Ee.losses}),(0,b.jsxs)("span",{style:{color:v.dim,marginLeft:"0.5rem"},children:["avg ",de(String(Ee.avgLoss))]})]}),Ee.streak>1&&(0,b.jsxs)("div",{style:{marginTop:"0.75rem",color:"w"===Ee.streakType?v.green:v.red,fontWeight:600,fontSize:"0.85rem"},children:["\ud83d\udd25 ",Ee.streak,"-","w"===Ee.streakType?"win":"loss"," streak"]})]})]})]}),(0,b.jsxs)(W,{$delay:"0.35s",children:[(0,b.jsx)(L,{children:"\u26a1 Performance Snapshot"}),(0,b.jsx)("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"},children:[{label:"Avg Win",val:de(String(Ee.avgWin)),color:v.green},{label:"Avg Loss",val:de(String(Ee.avgLoss)),color:v.red},{label:"W / L",val:`${Ee.wins} / ${Ee.losses}`,color:v.text},{label:"Max Streak",val:String(Ee.maxStreak),color:v.amber}].map((e=>(0,b.jsxs)("div",{style:{background:"rgba(10,10,20,0.5)",border:`1px solid ${v.border}`,borderRadius:"10px",padding:"0.6rem",textAlign:"center"},children:[(0,b.jsx)("div",{style:{fontSize:"0.65rem",color:v.dim,fontWeight:600,textTransform:"uppercase",marginBottom:"0.15rem"},children:e.label}),(0,b.jsx)("div",{style:{fontSize:"1.05rem",fontWeight:800,color:e.color},children:e.val})]},e.label)))}),Ee.sparkData.length>2&&(0,b.jsxs)("div",{style:{marginTop:"0.75rem"},children:[(0,b.jsx)("div",{style:{fontSize:"0.65rem",color:v.dim,fontWeight:600,textTransform:"uppercase",marginBottom:"0.25rem"},children:"P&L Trend"}),(0,b.jsx)(ye,{data:Ee.sparkData,width:280,height:40,color:Ee.totalPnl>=0?v.green:v.red})]})]})]})]})]}),"trades"===i&&(0,b.jsxs)(W,{$delay:"0.1s",children:[(0,b.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.75rem"},children:[(0,b.jsxs)(L,{style:{margin:0},children:["\ud83d\udccb Trade Log (",_e.length,")"]}),(0,b.jsx)("div",{style:{display:"flex",gap:"0.25rem"},children:["all","win","loss","be"].map((e=>(0,b.jsx)(K,{$ghost:Me!==e,$primary:Me===e,onClick:()=>Re(e),style:{padding:"0.3rem 0.6rem",fontSize:"0.7rem"},children:"all"===e?"All":"be"===e?"B/E":e.charAt(0).toUpperCase()+e.slice(1)},e)))})]}),0===_e.length?(0,b.jsxs)(oe,{children:[(0,b.jsx)(ae,{children:"\ud83d\udcdd"}),(0,b.jsx)("div",{children:"No trades yet. Log your first one!"}),(0,b.jsx)(K,{$primary:!0,onClick:()=>$("add"),style:{marginTop:"0.75rem"},children:"Log Trade"})]}):(0,b.jsxs)("div",{style:{overflowX:"auto"},children:[(0,b.jsxs)(E,{children:[(0,b.jsxs)("div",{style:{display:"none","@media (min-width: 768px)":{display:"block"}},onClick:()=>Ne("date"),children:["Date ","date"===Le?Be?"\u2191":"\u2193":""]}),(0,b.jsxs)("div",{onClick:()=>Ne("pair"),style:{cursor:"pointer"},children:["Pair ","pair"===Le?Be?"\u2191":"\u2193":""]}),(0,b.jsx)("div",{children:"Direction"}),(0,b.jsxs)("div",{onClick:()=>Ne("pnl"),style:{cursor:"pointer"},children:["P&L ","pnl"===Le?Be?"\u2191":"\u2193":""]}),(0,b.jsx)("div",{style:{display:"none"},children:"RRR"}),(0,b.jsx)("div",{style:{display:"none"},children:"Actions"})]}),_e.map((e=>{const r=parseFloat(le(e.pnl))||0,t=(e.direction||"").toLowerCase();return(0,b.jsxs)(H,{onClick:()=>Se(e),children:[(0,b.jsx)("div",{style:{display:"none","@media (min-width: 768px)":{display:"block"},fontSize:"0.8rem",color:v.muted},children:e.date?ce(e.date).slice(5):"\u2014"}),(0,b.jsxs)("div",{children:[(0,b.jsx)("div",{style:{fontWeight:700,fontSize:"0.85rem"},children:e.pair||"\u2014"}),(0,b.jsxs)("div",{style:{fontSize:"0.7rem",color:v.dim},children:[e.date?ce(e.date):""," ",e.killzone?`\xb7 ${e.killzone}`:""]})]}),(0,b.jsx)(_,{$variant:"long"===t?"long":"short"===t?"short":void 0,children:e.direction||"\u2014"}),(0,b.jsx)(I,{$val:r,children:de(e.pnl)}),(0,b.jsx)("div",{style:{fontSize:"0.8rem",color:v.muted,display:"none"},children:e.rrr||"\u2014"}),(0,b.jsx)("div",{style:{display:"none"},children:(0,b.jsx)(K,{$ghost:!0,onClick:r=>{r.stopPropagation(),Ge(e)},style:{padding:"0.2rem 0.4rem",fontSize:"0.7rem"},children:"Edit"})})]},e.id)}))]})]}),"calendar"===i&&(0,b.jsxs)(R,{children:[(0,b.jsxs)(W,{$delay:"0.1s",children:[(0,b.jsx)(L,{children:"\ud83d\udcc5 Trade Calendar"}),(0,b.jsx)(Q,{children:(0,b.jsx)(o.Ay,{onChange:fe,value:k,tileContent:e=>{let{date:r}=e;const t=me(r),n=Ee.daily[t];return void 0===n?null:(0,b.jsx)(V,{$color:n>0?v.green:n<0?v.red:v.amber})}})}),(0,b.jsxs)("div",{style:{marginTop:"0.75rem",textAlign:"center",fontSize:"0.75rem",color:v.dim},children:[(0,b.jsxs)("span",{style:{marginRight:"1rem"},children:[(0,b.jsx)("span",{style:{color:v.green},children:"\u25cf"})," Profit day"]}),(0,b.jsxs)("span",{style:{marginRight:"1rem"},children:[(0,b.jsx)("span",{style:{color:v.red},children:"\u25cf"})," Loss day"]}),(0,b.jsxs)("span",{children:[(0,b.jsx)("span",{style:{color:v.amber},children:"\u25cf"})," Break even"]})]})]}),(0,b.jsxs)(W,{$delay:"0.15s",children:[(0,b.jsxs)(L,{children:["Trades on ",k.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})]}),0===Ie.length?(0,b.jsxs)(oe,{style:{padding:"1.5rem"},children:[(0,b.jsx)(ae,{children:"\ud83d\ude34"}),(0,b.jsx)("div",{children:"No trades on this day"})]}):Ie.map(((e,r)=>{const t=parseFloat(le(e.pnl))||0;return(0,b.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.6rem 0.75rem",borderBottom:r<Ie.length-1?`1px solid ${v.border}`:"none",cursor:"pointer",borderRadius:"8px",transition:"background 0.2s"},onClick:()=>Se(e),onMouseEnter:e=>e.currentTarget.style.background="rgba(99,102,241,0.06)",onMouseLeave:e=>e.currentTarget.style.background="transparent",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("div",{style:{fontWeight:700,fontSize:"0.85rem"},children:e.pair||"Untitled"}),(0,b.jsxs)("div",{style:{fontSize:"0.7rem",color:v.dim},children:[e.direction||""," ",e.model?`\xb7 ${e.model}`:""]})]}),(0,b.jsx)(I,{$val:t,children:de(e.pnl)})]},e.id)})),Ie.length>0&&(0,b.jsxs)("div",{style:{marginTop:"0.75rem",padding:"0.5rem 0.75rem",background:"rgba(10,10,20,0.5)",borderRadius:"10px",display:"flex",justifyContent:"space-between",fontSize:"0.8rem"},children:[(0,b.jsx)("span",{style:{color:v.dim},children:"Day total"}),(0,b.jsx)(I,{$val:Ie.reduce(((e,r)=>e+(parseFloat(le(r.pnl))||0)),0),children:de(String(Ie.reduce(((e,r)=>e+(parseFloat(le(r.pnl))||0)),0)))})]})]})]}),"add"===i&&(0,b.jsxs)(W,{$delay:"0.1s",style:{maxWidth:"700px",margin:"0 auto"},children:[(0,b.jsx)(L,{children:$e?"\u270f\ufe0f Edit Trade":"\ud83d\udcdd Log New Trade"}),(0,b.jsx)("form",{onSubmit:async r=>{r.preventDefault(),We(!0),ze(null);try{const r={...be};if(r.pnl&&!r.pnl.startsWith("$")&&!r.pnl.startsWith("-$")){const e=parseFloat(le(r.pnl));isNaN(e)||(r.pnl=`$${e.toFixed(2)}`)}if($e){const e=(0,a.H9)(l.db,"tradingJournal",be.id),{id:t,...n}=r;await(0,a.mZ)(e,n),ke(!1)}else await(0,a.gS)((0,a.rJ)(l.db,"tradingJournal"),{...r,userId:e.uid});qe(),He()}catch{ze("Failed to save. Please try again.")}finally{We(!1)}},children:(0,b.jsxs)(N,{children:[(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-pair",children:"Pair / Market"}),(0,b.jsx)(G,{id:"j-pair",name:"pair",placeholder:"e.g. EUR/USD, NQ, BTC",value:be.pair,onChange:Oe,required:!0})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-direction",children:"Direction"}),(0,b.jsxs)(J,{id:"j-direction",name:"direction",value:be.direction,onChange:Oe,required:!0,children:[(0,b.jsx)("option",{value:"",children:"Select..."}),he.map((e=>(0,b.jsx)("option",{value:e,children:e},e)))]})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-date",children:"Date"}),(0,b.jsx)(G,{id:"j-date",type:"date",name:"date",value:be.date,onChange:Oe,required:!0})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-outcome",children:"Outcome"}),(0,b.jsxs)(J,{id:"j-outcome",name:"outcome",value:be.outcome,onChange:Oe,required:!0,children:[(0,b.jsx)("option",{value:"",children:"Select..."}),ge.map((e=>(0,b.jsx)("option",{value:e,children:e},e)))]})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-pnl",children:"P&L ($)"}),(0,b.jsx)(G,{id:"j-pnl",name:"pnl",placeholder:"e.g. 150 or -50",value:be.pnl,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-gain",children:"Gain (%)"}),(0,b.jsx)(G,{id:"j-gain",name:"gain",placeholder:"e.g. 2.5",value:be.gain,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-risk",children:"Risk ($)"}),(0,b.jsx)(G,{id:"j-risk",name:"risk",placeholder:"e.g. 100",value:be.risk,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-rrr",children:"R:R Ratio"}),(0,b.jsx)(G,{id:"j-rrr",name:"rrr",placeholder:"e.g. 3:1",value:be.rrr,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-entryTf",children:"Entry Timeframe"}),(0,b.jsx)(G,{id:"j-entryTf",name:"entryTf",placeholder:"e.g. 15m, 1H, 4H",value:be.entryTf,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-entryWindow",children:"Entry Window"}),(0,b.jsx)(G,{id:"j-entryWindow",name:"entryWindow",placeholder:"e.g. 10:30-11:00",value:be.entryWindow,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-day",children:"Day of Week"}),(0,b.jsxs)(J,{id:"j-day",name:"day",value:be.day,onChange:Oe,children:[(0,b.jsx)("option",{value:"",children:"Select..."}),["Monday","Tuesday","Wednesday","Thursday","Friday"].map((e=>(0,b.jsx)("option",{value:e,children:e},e)))]})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-timeInTrade",children:"Time in Trade"}),(0,b.jsx)(G,{id:"j-timeInTrade",name:"timeInTrade",placeholder:"e.g. 45m, 2h",value:be.timeInTrade,onChange:Oe})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-model",children:"Model / Setup"}),(0,b.jsxs)(J,{id:"j-model",name:"model",value:be.model,onChange:Oe,children:[(0,b.jsx)("option",{value:"",children:"Select..."}),xe.map((e=>(0,b.jsx)("option",{value:e,children:e},e)))]})]}),(0,b.jsxs)(O,{children:[(0,b.jsx)(q,{htmlFor:"j-killzone",children:"Killzone"}),(0,b.jsxs)(J,{id:"j-killzone",name:"killzone",value:be.killzone,onChange:Oe,children:[(0,b.jsx)("option",{value:"",children:"Select..."}),pe.map((e=>(0,b.jsx)("option",{value:e,children:e},e)))]})]}),(0,b.jsxs)(O,{$full:!0,children:[(0,b.jsx)(q,{htmlFor:"j-notes",children:"Notes"}),(0,b.jsx)(U,{id:"j-notes",name:"notes",placeholder:"What went right? What could improve? Market context, emotions, lessons...",value:be.notes||"",onChange:Oe,rows:3})]}),(0,b.jsxs)(Y,{$full:!0,children:[(0,b.jsx)(K,{$primary:!0,type:"submit",disabled:Fe,children:Fe?"Saving...":$e?"\ud83d\udcbe Update Trade":"\u2705 Log Trade"}),$e&&(0,b.jsx)(K,{$ghost:!0,type:"button",onClick:qe,children:"Cancel"})]})]})})]}),we&&(0,b.jsx)(X,{onClick:Je,role:"dialog","aria-modal":"true",children:(0,b.jsxs)(Z,{onClick:e=>e.stopPropagation(),children:[(0,b.jsx)(ee,{onClick:Je,"aria-label":"Close",children:"\xd7"}),(0,b.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.25rem"},children:[(0,b.jsx)("div",{style:{fontSize:"1.3rem",fontWeight:800,color:v.text},children:we.pair||"Trade Details"}),we.direction&&(0,b.jsx)(_,{$variant:"long"===(we.direction||"").toLowerCase()?"long":"short",children:we.direction}),we.outcome&&(0,b.jsx)(_,{$variant:"win"===(we.outcome||"").toLowerCase()?"win":"loss"===(we.outcome||"").toLowerCase()?"loss":"be",children:we.outcome})]}),(0,b.jsxs)("div",{style:{fontSize:"0.8rem",color:v.dim,marginBottom:"0.5rem"},children:[we.date?ce(we.date):""," ",we.killzone?`\xb7 ${we.killzone}`:"",we.model?` \xb7 ${we.model}`:""]}),(0,b.jsxs)(re,{children:[[{label:"P&L",val:de(we.pnl),color:(parseFloat(le(we.pnl))||0)>=0?v.green:v.red},{label:"Gain",val:we.gain?se(we.gain):"\u2014"},{label:"Risk",val:we.risk?`$${le(we.risk)}`:"\u2014"},{label:"R:R",val:we.rrr||"\u2014"},{label:"Entry TF",val:we.entryTf||"\u2014"},{label:"Entry Window",val:we.entryWindow||"\u2014"},{label:"Day",val:we.day||"\u2014"},{label:"Time in Trade",val:we.timeInTrade||"\u2014"}].map((e=>(0,b.jsxs)(te,{children:[(0,b.jsx)(ne,{children:e.label}),(0,b.jsx)(ie,{$color:e.color,children:e.val})]},e.label))),we.notes&&(0,b.jsxs)(te,{$full:!0,children:[(0,b.jsx)(ne,{children:"Notes"}),(0,b.jsx)(ie,{style:{fontSize:"0.8rem",fontWeight:400,lineHeight:1.5,whiteSpace:"pre-wrap"},children:we.notes})]})]}),(0,b.jsxs)("div",{style:{display:"flex",gap:"0.5rem",marginTop:"1rem"},children:[(0,b.jsx)(K,{$ghost:!0,onClick:()=>{Ge(we),Je()},children:"\u270f\ufe0f Edit"}),Ce===we.id?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(K,{$danger:!0,onClick:()=>(async e=>{try{await(0,a.kd)((0,a.H9)(l.db,"tradingJournal",e)),Ae(null),Se(null),He()}catch{ze("Failed to delete.")}})(we.id),children:"Confirm Delete"}),(0,b.jsx)(K,{$ghost:!0,onClick:()=>Ae(null),children:"Cancel"})]}):(0,b.jsx)(K,{$danger:!0,onClick:()=>Ae(we.id),children:"\ud83d\uddd1 Delete"})]})]})})]})})}}}]);