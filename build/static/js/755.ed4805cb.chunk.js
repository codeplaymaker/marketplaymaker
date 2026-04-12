"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[755],{1755:(e,s,l)=>{l.r(s),l.d(s,{default:()=>K});var r=l(9950),t=l(4937),i=l(1095),o=l(3137),a=l(3245),d=l(158),n=l(4813),c=l(6335),x=l(5400),h=l(734),p=l(5706),u=l(2528),j=l(8354),v=l(6473),y=l(294),f=l(4951),m=l(4281),b=l(4414);const g={NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!1,REACT_APP_FIREBASE_API_KEY:"AIzaSyAg9UWRG334AInTD7m4bDkm9u8mJQGtSDc",REACT_APP_FIREBASE_AUTH_DOMAIN:"marketplaymaker-2e4b9.firebaseapp.com",REACT_APP_FIREBASE_PROJECT_ID:"marketplaymaker-2e4b9",REACT_APP_FIREBASE_STORAGE_BUCKET:"marketplaymaker-2e4b9.appspot.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"639311000126",REACT_APP_FIREBASE_APP_ID:"1:639311000126:web:e8cd8664067e4b1f21976f",REACT_APP_FIREBASE_MEASUREMENT_ID:"G-7XNP5PX3WF",REACT_APP_STRIPE_PUBLISHABLE_KEY:"pk_live_51PkTr0BQ5dVVUoajsRhl46KlNpxhd9RYZ2r4rUQXyfnEuA3W9Nr2S4VMGVaXzwJejXVFfxBTEGKhQv100vZXKyur00fBGlG9D7",REACT_APP_STRIPE_BUY_BUTTON_ID:"buy_btn_1PoCswBQ5dVVUoajzSWdKTH7",REACT_APP_SITE_URL:"https://marketplaymaker.com"}.REACT_APP_BOT_API||"/polybot",$=async e=>{const s=await fetch(`${g}${e}`);if(!s.ok)throw new Error(`API ${s.status}`);return s.json()},k=t.Ay.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`,S=t.Ay.div`
  background: rgba(30, 30, 40, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 16px;
  ${e=>e.$full&&"grid-column: 1 / -1;"}
`,P=t.Ay.h3`
  color: #e5e5e5;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
`,E=t.Ay.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`,_=t.Ay.div`
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  flex: 1;
  min-width: 100px;
`,A=t.Ay.div`
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
`,R=t.Ay.div`
  font-size: 18px;
  font-weight: 700;
  color: ${e=>e.$color||"#e5e5e5"};
`,T=t.Ay.div`
  color: #64748b;
  text-align: center;
  padding: 32px;
  font-size: 13px;
`,w=t.Ay.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`,C=t.Ay.div`
  font-size: 12px;
  color: #ccc;
  width: 160px;
  flex-shrink: 0;
`,F=t.Ay.div`
  height: 20px;
  border-radius: 4px;
  background: ${e=>"CRITICAL"===e.$severity?"#ef4444":"SEVERE"===e.$severity?"#f59e0b":"WARNING"===e.$severity?"#eab308":"#22c55e"};
  width: ${e=>Math.min(e.$pct,100)}%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  padding-left: 6px;
  font-size: 11px;
  color: #e2e8f0;
  font-weight: 600;
`,L=t.Ay.div`
  flex: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
`,I=t.Ay.div`
  display: grid;
  grid-template-columns: 32px 1fr 60px 70px 60px 70px;
  gap: 8px;
  padding: 8px 12px;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 12px;
  &:hover { background: rgba(255,255,255,0.03); }
`,z=(0,t.Ay)(I)`
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`,D=t.Ay.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${e=>e.$bg||"rgba(255,255,255,0.1)"};
  color: ${e=>e.$color||"#ccc"};
`,O=t.Ay.div`
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
`,G=t.Ay.button`
  background: ${e=>e.$active?"rgba(139,92,246,0.3)":"rgba(255,255,255,0.05)"};
  border: 1px solid ${e=>e.$active?"rgba(139,92,246,0.5)":"rgba(255,255,255,0.1)"};
  color: ${e=>e.$active?"#c4b5fd":"#888"};
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  &:hover { background: rgba(139,92,246,0.2); }
`;function K(){var e,s,l,t,g,K,B,N,W,M,U,V,H,X,Y,Q,J,q,Z;const[ee,se]=(0,r.useState)(null),[le,re]=(0,r.useState)(null),[te,ie]=(0,r.useState)(null),[oe,ae]=(0,r.useState)(null),[de,ne]=(0,r.useState)(null),[ce,xe]=(0,r.useState)(null),[he,pe]=(0,r.useState)("all"),[ue,je]=(0,r.useState)(!0),ve=(0,r.useCallback)((async()=>{try{const[e,s,l,r,t,i]=await Promise.all([$("/db/pnl?days=60").catch((()=>({available:!1,series:[]}))),$("/db/stats").catch((()=>({available:!1}))),$("/risk/var?simulations=5000").catch((()=>null)),$("/risk/stress").catch((()=>null)),$("/pnl/chart").catch((()=>({trades:[],daily:[],summary:{}}))),$("/trades/history?limit=200").catch((()=>({trades:[],total:0})))]);se(e),re(s),ie(l),ae(r),ne(t),xe(i)}catch(e){console.warn("Analytics fetch error:",e)}je(!1)}),[]);if((0,r.useEffect)((()=>{ve();const e=setInterval(ve,6e4);return()=>clearInterval(e)}),[ve]),ue)return(0,b.jsx)(T,{children:"Loading analytics..."});const ye=(null===de||void 0===de||null===(e=de.daily)||void 0===e?void 0:e.length)>0||(null===de||void 0===de||null===(s=de.trades)||void 0===s?void 0:s.length)>0,fe=(null===ee||void 0===ee||null===(l=ee.series)||void 0===l?void 0:l.length)>0;return(0,b.jsxs)(k,{children:[((null===de||void 0===de?void 0:de.summary)||ce)&&(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83d\udcb0 Trade Record Summary"}),(0,b.jsxs)(E,{children:[(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Total Edges"}),(0,b.jsx)(R,{children:(null===de||void 0===de||null===(t=de.summary)||void 0===t?void 0:t.totalEdges)||(null===ce||void 0===ce?void 0:ce.total)||0})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Resolved"}),(0,b.jsx)(R,{children:(null===de||void 0===de||null===(g=de.summary)||void 0===g?void 0:g.resolvedEdges)||(null===ce||void 0===ce?void 0:ce.closed)||0})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Open"}),(0,b.jsx)(R,{$color:"#3b82f6",children:(null===de||void 0===de||null===(K=de.summary)||void 0===K?void 0:K.pending)||(null===ce||void 0===ce?void 0:ce.open)||0})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Win Rate"}),(0,b.jsx)(R,{$color:((null===de||void 0===de||null===(B=de.summary)||void 0===B?void 0:B.winRate)||0)>=50?"#22c55e":"#ef4444",children:null!=(null===de||void 0===de||null===(N=de.summary)||void 0===N?void 0:N.winRate)?`${de.summary.winRate}%`:"\u2014"})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Total P&L"}),(0,b.jsx)(R,{$color:((null===de||void 0===de||null===(W=de.summary)||void 0===W?void 0:W.cumPnl)||(null===de||void 0===de||null===(M=de.summary)||void 0===M?void 0:M.totalPnLpp)||0)>=0?"#22c55e":"#ef4444",children:null!=(null===de||void 0===de||null===(U=de.summary)||void 0===U?void 0:U.cumPnl)?`$${de.summary.cumPnl.toFixed(2)}`:null!=(null===de||void 0===de||null===(V=de.summary)||void 0===V?void 0:V.totalPnLpp)?`${de.summary.totalPnLpp.toFixed(1)}pp`:"\u2014"})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Better Than Market"}),(0,b.jsx)(R,{$color:((null===de||void 0===de||null===(H=de.summary)||void 0===H?void 0:H.betterRate)||0)>=50?"#22c55e":"#ef4444",children:null!=(null===de||void 0===de||null===(X=de.summary)||void 0===X?void 0:X.betterRate)?`${de.summary.betterRate}%`:"\u2014"})]})]})]}),(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83d\udcc8 P&L Equity Curve"}),ye?(0,b.jsx)(i.u,{width:"100%",height:300,children:(0,b.jsxs)(o.X,{data:de.daily,children:[(0,b.jsx)("defs",{children:(0,b.jsxs)("linearGradient",{id:"pnlGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,b.jsx)("stop",{offset:"5%",stopColor:"#8b5cf6",stopOpacity:.4}),(0,b.jsx)("stop",{offset:"95%",stopColor:"#8b5cf6",stopOpacity:0})]})}),(0,b.jsx)(a.d,{strokeDasharray:"3 3",stroke:"rgba(255,255,255,0.05)"}),(0,b.jsx)(d.W,{dataKey:"date",stroke:"#666",fontSize:11,tickFormatter:e=>null===e||void 0===e?void 0:e.slice(5)}),(0,b.jsx)(n.h,{stroke:"#666",fontSize:11,tickFormatter:e=>`$${e}`}),(0,b.jsx)(c.m,{contentStyle:{background:"#1e1e2e",border:"1px solid #333",borderRadius:8,fontSize:12},formatter:(e,s)=>[`$${"number"===typeof e?e.toFixed(2):e}`,s],labelFormatter:e=>`Date: ${e}`}),(0,b.jsx)(x.e,{y:0,stroke:"#555",strokeDasharray:"3 3"}),(0,b.jsx)(h.G,{type:"monotone",dataKey:"cumPnl",stroke:"#8b5cf6",fill:"url(#pnlGrad)",name:"Cumulative P&L"}),(0,b.jsx)(p.y,{dataKey:"dailyPnl",name:"Daily P&L",barSize:12,children:(de.daily||[]).map(((e,s)=>(0,b.jsx)(u.f,{fill:e.dailyPnl>=0?"rgba(34,197,94,0.6)":"rgba(239,68,68,0.6)"},s)))})]})}):fe?(0,b.jsx)(i.u,{width:"100%",height:300,children:(0,b.jsxs)(j.Q,{data:ee.series,children:[(0,b.jsx)("defs",{children:(0,b.jsxs)("linearGradient",{id:"pnlGradient",x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,b.jsx)("stop",{offset:"5%",stopColor:"#8b5cf6",stopOpacity:.3}),(0,b.jsx)("stop",{offset:"95%",stopColor:"#8b5cf6",stopOpacity:0})]})}),(0,b.jsx)(a.d,{strokeDasharray:"3 3",stroke:"rgba(255,255,255,0.05)"}),(0,b.jsx)(d.W,{dataKey:"date",stroke:"#666",fontSize:11,tickFormatter:e=>null===e||void 0===e?void 0:e.slice(5)}),(0,b.jsx)(n.h,{stroke:"#666",fontSize:11,tickFormatter:e=>`$${e}`}),(0,b.jsx)(c.m,{contentStyle:{background:"#1e1e2e",border:"1px solid #333",borderRadius:8,fontSize:12},formatter:e=>[`$${e.toFixed(2)}`,""],labelFormatter:e=>`Date: ${e}`}),(0,b.jsx)(x.e,{y:0,stroke:"#555",strokeDasharray:"3 3"}),(0,b.jsx)(h.G,{type:"monotone",dataKey:"cumulative_pnl",stroke:"#8b5cf6",fill:"url(#pnlGradient)",name:"Cumulative P&L"}),(0,b.jsx)(v.N,{type:"monotone",dataKey:"daily_pnl",stroke:"#3b82f6",dot:!1,strokeWidth:1,name:"Daily P&L"})]})}):(0,b.jsxs)(T,{children:["No P&L data yet. Edges will appear here as markets resolve. Currently tracking ",(null===de||void 0===de||null===(Y=de.summary)||void 0===Y?void 0:Y.totalEdges)||0," edges."]})]}),(null===de||void 0===de||null===(Q=de.trades)||void 0===Q?void 0:Q.length)>0&&(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83c\udfaf Trade-by-Trade Results"}),(0,b.jsx)(i.u,{width:"100%",height:200,children:(0,b.jsxs)(y.E,{data:de.trades,children:[(0,b.jsx)(a.d,{strokeDasharray:"3 3",stroke:"rgba(255,255,255,0.05)"}),(0,b.jsx)(d.W,{dataKey:"date",stroke:"#666",fontSize:10,tickFormatter:e=>null===e||void 0===e?void 0:e.slice(5)}),(0,b.jsx)(n.h,{stroke:"#666",fontSize:11,tickFormatter:e=>`$${e}`}),(0,b.jsx)(c.m,{contentStyle:{background:"#1e1e2e",border:"1px solid #333",borderRadius:8,fontSize:12},formatter:(e,s)=>[`$${"number"===typeof e?e.toFixed(2):e}`,s],labelFormatter:e=>`${e}`,labelStyle:{color:"#ccc"}}),(0,b.jsx)(x.e,{y:0,stroke:"#555",strokeDasharray:"3 3"}),(0,b.jsx)(p.y,{dataKey:"pnl",name:"Trade P&L",barSize:8,children:de.trades.map(((e,s)=>(0,b.jsx)(u.f,{fill:e.won?"#22c55e":"#ef4444"},s)))})]})})]}),(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83d\udccb Trade Record"}),(0,b.jsx)(O,{children:["all","open","closed"].map((e=>(0,b.jsx)(G,{$active:he===e,onClick:()=>pe(e),children:"all"===e?`All (${(null===ce||void 0===ce?void 0:ce.total)||0})`:"open"===e?`Open (${(null===ce||void 0===ce?void 0:ce.open)||0})`:`Closed (${(null===ce||void 0===ce?void 0:ce.closed)||0})`},e)))}),(0,b.jsxs)("div",{style:{maxHeight:320,overflowY:"auto"},children:[(0,b.jsxs)(z,{children:[(0,b.jsx)("div",{children:"#"}),(0,b.jsx)("div",{children:"Market"}),(0,b.jsx)("div",{children:"Side"}),(0,b.jsx)("div",{children:"Edge"}),(0,b.jsx)("div",{children:"Source"}),(0,b.jsx)("div",{children:"P&L"})]}),((null===ce||void 0===ce?void 0:ce.trades)||[]).filter((e=>"all"===he||("open"===he?!e.resolved:e.resolved))).slice(0,50).map(((e,s)=>{var l;return(0,b.jsxs)(I,{children:[(0,b.jsx)("div",{style:{color:"#94a3b8"},children:e.id||s+1}),(0,b.jsx)("div",{style:{color:"#ddd",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:(null===(l=e.question)||void 0===l?void 0:l.slice(0,55))||"Unknown"}),(0,b.jsx)(D,{$bg:"YES"===e.side?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",$color:"YES"===e.side?"#22c55e":"#ef4444",children:e.side}),(0,b.jsx)("div",{style:{color:Math.abs(e.edgePp||0)>15?"#c4b5fd":"#888"},children:null!=e.edgePp?`${e.edgePp>0?"+":""}${e.edgePp.toFixed(1)}pp`:"\u2014"}),(0,b.jsx)(D,{$bg:"rgba(255,255,255,0.05)",$color:"youtube"===e.source?"#f59e0b":"twitter"===e.source?"#38bdf8":"#888",children:e.source||"scan"}),(0,b.jsx)("div",{style:{fontWeight:600,color:e.resolved?e.won?"#22c55e":"#ef4444":"#555"},children:e.resolved?null!=e.pnl?`${e.pnl>=0?"+":""}$${e.pnl.toFixed(2)}`:null!=e.pnlPp?`${e.pnlPp>0?"+":""}${e.pnlPp}pp`:"\u2014":"\u23f3"})]},e.id||s)})),!(null!==ce&&void 0!==ce&&null!==(J=ce.trades)&&void 0!==J&&J.length)&&(0,b.jsx)(T,{children:"No trades recorded yet. Edges from scanner, YouTube, and Twitter will appear here."})]})]}),(0,b.jsxs)(S,{children:[(0,b.jsx)(P,{children:"\ud83c\udfc6 Strategy Performance"}),(null===le||void 0===le||null===(q=le.byStrategy)||void 0===q?void 0:q.length)>0?(0,b.jsx)(i.u,{width:"100%",height:220,children:(0,b.jsxs)(y.E,{data:le.byStrategy,layout:"vertical",children:[(0,b.jsx)(a.d,{strokeDasharray:"3 3",stroke:"rgba(255,255,255,0.05)"}),(0,b.jsx)(d.W,{type:"number",stroke:"#666",fontSize:11,tickFormatter:e=>`$${e}`}),(0,b.jsx)(n.h,{dataKey:"strategy",type:"category",stroke:"#666",fontSize:11,width:80}),(0,b.jsx)(c.m,{contentStyle:{background:"#1e1e2e",border:"1px solid #333",borderRadius:8,fontSize:12},formatter:(e,s)=>[`$${e}`,s]}),(0,b.jsx)(p.y,{dataKey:"total_pnl",name:"Total P&L",children:le.byStrategy.map(((e,s)=>(0,b.jsx)(u.f,{fill:e.total_pnl>=0?"#22c55e":"#ef4444"},s)))})]})}):(0,b.jsx)(T,{children:"No strategy data yet"})]}),(0,b.jsxs)(S,{children:[(0,b.jsx)(P,{children:"\ud83c\udfaf Calibration Curve"}),(null===le||void 0===le||null===(Z=le.calibration)||void 0===Z?void 0:Z.length)>0?(0,b.jsx)(i.u,{width:"100%",height:220,children:(0,b.jsxs)(f.t,{children:[(0,b.jsx)(a.d,{strokeDasharray:"3 3",stroke:"rgba(255,255,255,0.05)"}),(0,b.jsx)(d.W,{dataKey:"avg_predicted",name:"Predicted",stroke:"#666",fontSize:11,domain:[0,1],tickFormatter:e=>`${(100*e).toFixed(0)}%`}),(0,b.jsx)(n.h,{dataKey:"actual_rate",name:"Actual",stroke:"#666",fontSize:11,domain:[0,1],tickFormatter:e=>`${(100*e).toFixed(0)}%`}),(0,b.jsx)(c.m,{contentStyle:{background:"#1e1e2e",border:"1px solid #333",borderRadius:8,fontSize:12},formatter:e=>`${(100*e).toFixed(1)}%`}),(0,b.jsx)(x.e,{segment:[{x:0,y:0},{x:1,y:1}],stroke:"#555",strokeDasharray:"3 3",label:""}),(0,b.jsx)(m.X,{data:le.calibration,fill:"#8b5cf6",children:le.calibration.map(((e,s)=>(0,b.jsx)(u.f,{fill:Math.abs(e.bias)<.1?"#22c55e":Math.abs(e.bias)<.2?"#eab308":"#ef4444"},s)))})]})}):(0,b.jsx)(T,{children:"Calibration data builds as markets resolve"})]}),(0,b.jsxs)(S,{children:[(0,b.jsx)(P,{children:"\u26a1 Value at Risk (Monte Carlo)"}),te&&te.simulations>0?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)(E,{children:[(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"VaR 95%"}),(0,b.jsxs)(R,{$color:"HIGH"===te.riskLevel?"#ef4444":"MEDIUM"===te.riskLevel?"#eab308":"#22c55e",children:["$",te.vaR95]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"VaR 99%"}),(0,b.jsxs)(R,{$color:"#f59e0b",children:["$",te.vaR99]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"CVaR 95%"}),(0,b.jsxs)(R,{$color:"#ef4444",children:["$",te.cvar95]})]})]}),(0,b.jsxs)(E,{children:[(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Expected P&L"}),(0,b.jsxs)(R,{$color:te.expectedPnL>=0?"#22c55e":"#ef4444",children:["$",te.expectedPnL]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Max Loss"}),(0,b.jsxs)(R,{$color:"#ef4444",children:["$",te.maxLoss]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Risk Level"}),(0,b.jsx)(R,{$color:"HIGH"===te.riskLevel?"#ef4444":"MEDIUM"===te.riskLevel?"#eab308":"#22c55e",children:te.riskLevel})]})]}),(0,b.jsxs)("div",{style:{fontSize:11,color:"#94a3b8",textAlign:"center"},children:[te.simulations.toLocaleString()," simulations \xb7 ",te.positionCount," positions"]})]}):(0,b.jsx)(T,{children:"No open positions for VaR calculation"})]}),(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83e\uddea Stress Test Scenarios"}),null!==oe&&void 0!==oe&&oe.scenarios&&Object.keys(oe.scenarios).length>0?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)("div",{style:{marginBottom:12},children:[(0,b.jsx)("span",{style:{fontSize:12,color:"#888"},children:"Portfolio Resilience: "}),(0,b.jsx)("span",{style:{fontWeight:700,color:"STRONG"===oe.portfolioResilience?"#22c55e":"MODERATE"===oe.portfolioResilience?"#eab308":"#ef4444"},children:oe.portfolioResilience})]}),Object.entries(oe.scenarios).map((e=>{let[s,l]=e;return(0,b.jsxs)(w,{children:[(0,b.jsx)(C,{children:l.name}),(0,b.jsx)(L,{children:(0,b.jsx)(F,{$pct:l.lossPct,$severity:l.severity,children:l.lossPct>3?`-${l.lossPct}%`:""})}),(0,b.jsxs)("div",{style:{fontSize:11,width:60,textAlign:"right",color:"CRITICAL"===l.severity?"#ef4444":"SEVERE"===l.severity?"#f59e0b":"#888",fontWeight:600},children:["-$",l.estimatedLoss]})]},s)}))]}):(0,b.jsx)(T,{children:"No open positions for stress testing"})]}),(0,b.jsxs)(S,{$full:!0,children:[(0,b.jsx)(P,{children:"\ud83d\udcca Overall Trade Statistics"}),null!==le&&void 0!==le&&le.stats?(0,b.jsxs)(E,{children:[(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Total Trades"}),(0,b.jsx)(R,{children:le.stats.total_trades})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Win Rate"}),(0,b.jsx)(R,{$color:le.stats.wins/(le.stats.total_trades||1)>.5?"#22c55e":"#ef4444",children:le.stats.total_trades>0?`${(le.stats.wins/le.stats.total_trades*100).toFixed(1)}%`:"\u2014"})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Total P&L"}),(0,b.jsxs)(R,{$color:(le.stats.total_pnl||0)>=0?"#22c55e":"#ef4444",children:["$",le.stats.total_pnl||0]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Avg P&L"}),(0,b.jsxs)(R,{$color:(le.stats.avg_pnl||0)>=0?"#22c55e":"#ef4444",children:["$",le.stats.avg_pnl||0]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Best Trade"}),(0,b.jsxs)(R,{$color:"#22c55e",children:["$",le.stats.best_trade||0]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Worst Trade"}),(0,b.jsxs)(R,{$color:"#ef4444",children:["$",le.stats.worst_trade||0]})]}),(0,b.jsxs)(_,{children:[(0,b.jsx)(A,{children:"Active Days"}),(0,b.jsx)(R,{children:le.stats.active_days||0})]})]}):(0,b.jsx)(T,{children:"No trade statistics available yet"})]})]})}}}]);