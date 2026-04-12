"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[141],{9141:(e,t,o)=>{o.r(t),o.d(t,{default:()=>I});var r=o(9950),n=o(4937),a=o(32),i=o(2207),s=o(2941),d=o(5711),l=o(5571),c=o(704),x=o(6639),f=o(1095),p=o(2847),u=o(3245),m=o(158),h=o(4813),g=o(6335),b=o(6473),y=o(1072),j=o(4118),A=o(9998),k=o(4414);const T=e=>{let{userDetails:t}=e;const[o,n]=(0,r.useState)([]),[T,w]=(0,r.useState)([]),[v,C]=(0,r.useState)(!1),[S,D]=(0,r.useState)(""),[P,E]=(0,r.useState)([]),[F,I]=(0,r.useState)(0),[z,M]=(0,r.useState)(0),[$,W]=(0,r.useState)(0),B=(0,r.useCallback)((async()=>{const{apiToken:e,accountId:o}=t;if(e&&o){C(!0);try{const t=new A.Ay(e),r=await t.metatraderAccountApi.getAccount(o);"DEPLOYED"!==r.state&&await r.deploy(),await r.waitConnected(3e5);const a=new Date,i=new Date(a.getTime()-7776e6),s=e=>e.toISOString().replace("T"," ").slice(0,-5)+".000",d=await fetch(`https://metastats-api-v1.london.agiliumtrade.ai/users/current/accounts/${o}/historical-trades/${s(i)}/${s(a)}`,{method:"GET",headers:{"Content-Type":"application/json",Accept:"application/json","auth-token":e}});if(!d.ok)throw new Error(`HTTP error! status: ${d.status}`);const{trades:l}=await d.json(),c=l.sort(((e,t)=>new Date(t.closeTime||t.openTime)-new Date(e.closeTime||e.openTime))).slice(0,100);n(c),w(c),R(c),L(c)}catch(r){D(r.message||"Error connecting to MetaApi")}finally{C(!1)}}else D("API Token or Account ID is missing")}),[t]),L=e=>{let t=0;e.forEach((e=>{t+=e.profit}));const o=e.filter((e=>e.profit>0)).reduce(((e,t)=>e+t.profit),0),r=e.filter((e=>e.profit<0)).reduce(((e,t)=>e+t.profit),0);M(t),I(t);const n=Math.abs(r)>0?o/Math.abs(r):o>0?1/0:0;W(isNaN(n)?0:n)},R=e=>{const t={};e.forEach((e=>{const o=new Date(e.openTime).toISOString().split("T")[0];t[o]||(t[o]={totalProfit:0,totalTrades:0}),t[o].totalProfit+=e.profit,t[o].totalTrades+=1}));const o=Object.keys(t).map((e=>({title:"",date:e,backgroundColor:t[e].totalProfit>0?"#4caf50":"#f44336",textColor:"#ffffff",extendedProps:{totalProfit:t[e].totalProfit,totalTrades:t[e].totalTrades}})));E(o)},N=(0,r.useMemo)((()=>T.slice().sort(((e,t)=>new Date(e.openTime)-new Date(t.openTime))).map((e=>({name:new Date(e.openTime).toLocaleDateString(),profit:e.profit})))),[T]);(0,r.useEffect)((()=>{t&&B()}),[t,B]);const O={background:"rgba(15,15,25,0.8)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"12px",color:"#e2e8f0"},H={borderColor:"rgba(99,102,241,0.3)",color:"#a5b4fc",textTransform:"none",borderRadius:"8px","&:hover":{borderColor:"#6366f1",background:"rgba(99,102,241,0.1)"}};return(0,k.jsxs)(a.A,{p:{xs:1.5,sm:2,md:3},sx:{background:"#0a0a0f",minHeight:"80vh",color:"#e2e8f0"},children:[(0,k.jsx)(i.A,{variant:"h4",gutterBottom:!0,sx:{fontSize:{xs:"1.5rem",sm:"2rem",md:"2.125rem"},fontWeight:800,background:"linear-gradient(135deg,#fff,#a5b4fc,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},children:"Trading Dashboard"}),(0,k.jsxs)(s.A,{direction:{xs:"column",sm:"row"},spacing:1,sx:{mb:3},children:[(0,k.jsx)(d.A,{variant:"contained",onClick:()=>w(o),sx:{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontWeight:500,textTransform:"none",borderRadius:"8px","&:hover":{opacity:.9}},children:"All Trades"}),(0,k.jsx)(d.A,{variant:"outlined",onClick:()=>w(o.filter((e=>e.profit>0))),sx:H,children:"Profitable Trades"}),(0,k.jsx)(d.A,{variant:"outlined",onClick:()=>w(o.filter((e=>e.profit<=0))),sx:H,children:"Losses"})]}),(0,k.jsx)(l.A,{sx:{...O,mb:4},children:(0,k.jsxs)(c.A,{children:[(0,k.jsxs)(i.A,{variant:"body1",sx:{color:"#e2e8f0"},children:["Balance: ",(0,k.jsxs)("span",{style:{color:"#a5b4fc"},children:["\xa3",F.toFixed(2)]})]}),(0,k.jsxs)(i.A,{variant:"body1",sx:{color:"#e2e8f0"},children:["Net P&L: ",(0,k.jsxs)("span",{style:{color:"#22c55e"},children:["\xa3",z.toFixed(2)]})]}),(0,k.jsxs)(i.A,{variant:"body1",sx:{color:"#e2e8f0"},children:["Profit Factor: ",$.toFixed(2)]})]})}),v?(0,k.jsx)(a.A,{display:"flex",justifyContent:"center",children:(0,k.jsx)(x.A,{})}):S?(0,k.jsx)(i.A,{color:"error",children:S}):(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(l.A,{sx:{...O,mb:4},children:(0,k.jsxs)(c.A,{children:[(0,k.jsx)(i.A,{variant:"h6",gutterBottom:!0,sx:{color:"#e2e8f0"},children:"Profit Trend"}),(0,k.jsx)(f.u,{width:"100%",height:300,children:(0,k.jsxs)(p.b,{data:N,children:[(0,k.jsx)(u.d,{strokeDasharray:"3 3",stroke:"rgba(99,102,241,0.1)"}),(0,k.jsx)(m.W,{dataKey:"name",stroke:"#64748b",tick:{fill:"#64748b"}}),(0,k.jsx)(h.h,{stroke:"#64748b",tick:{fill:"#64748b"}}),(0,k.jsx)(g.m,{contentStyle:{background:"#0f0f19",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"8px",color:"#e2e8f0"}}),(0,k.jsx)(b.N,{type:"monotone",dataKey:"profit",stroke:"#4caf50",strokeWidth:2,dot:{r:4}})]})})]})}),(0,k.jsx)(l.A,{sx:O,children:(0,k.jsxs)(c.A,{children:[(0,k.jsx)(i.A,{variant:"h6",gutterBottom:!0,sx:{color:"#e2e8f0"},children:"Trading Calendar"}),(0,k.jsx)(a.A,{sx:{height:{xs:350,sm:400,md:500}},children:(0,k.jsx)(y.A,{plugins:[j.A],initialView:"dayGridMonth",events:P,height:"100%",contentHeight:"auto",headerToolbar:{start:"title",center:"",end:"prev,next today"},eventDidMount:e=>{const t=e.event.extendedProps.totalProfit,o=e.event.extendedProps.totalTrades;e.el.textContent="";const r=document.createElement("div");r.style.textAlign="center",r.style.padding="4px";const n=document.createElement("strong");n.style.fontSize="16px",n.style.display="block",n.textContent=`${t>=0?"Profit":"Loss"}: \xa3${t.toFixed(2)}`;const a=document.createElement("span");a.style.fontSize="12px",a.textContent=`Trades: ${o}`,r.appendChild(n),r.appendChild(a),e.el.appendChild(r),e.el.style.borderRadius="4px"}})})]})})]})]})},w=n.Ay.div`
  max-width: 500px;
  margin: 1.5rem auto;
  padding: 1.5rem 1rem;

  @media (min-width: 768px) {
    margin: 2rem auto;
    padding: 2rem;
  }
`,v=n.Ay.h2`
  margin-bottom: 1rem;
  text-align: center;
`,C=n.Ay.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,S=n.Ay.div`
  display: flex;
  flex-direction: column;
`,D=n.Ay.label`
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`,P=n.Ay.input`
  padding: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  font-size: 16px;
  font-family: monospace;
  width: 100%;
  box-sizing: border-box;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }
`,E=n.Ay.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  margin-top: 0.5rem;
  transition: opacity 0.3s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,F=n.Ay.p`
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.5rem;
`,I=()=>{const[e,t]=(0,r.useState)(""),[o,n]=(0,r.useState)(""),[a,i]=(0,r.useState)(null);return(0,k.jsx)(w,{children:a?(0,k.jsx)(T,{userDetails:a}):(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(v,{children:"Connect Your Trading Account"}),(0,k.jsxs)(C,{onSubmit:t=>{t.preventDefault(),e.trim()&&o.trim()&&i({apiToken:e,accountId:o})},children:[(0,k.jsxs)(S,{children:[(0,k.jsx)(D,{htmlFor:"api-token",children:"API Token"}),(0,k.jsx)(P,{id:"api-token",type:"password",value:e,onChange:e=>t(e.target.value),placeholder:"Enter your MetaAPI token",required:!0,autoComplete:"off"})]}),(0,k.jsxs)(S,{children:[(0,k.jsx)(D,{htmlFor:"account-id",children:"Account ID"}),(0,k.jsx)(P,{id:"account-id",type:"text",value:o,onChange:e=>n(e.target.value),placeholder:"Enter your account ID",required:!0,autoComplete:"off"})]}),(0,k.jsx)(E,{type:"submit",disabled:!e.trim()||!o.trim(),children:"Connect"}),(0,k.jsx)(F,{children:"Your credentials are used only for this session and are not stored."})]})]})})}}}]);