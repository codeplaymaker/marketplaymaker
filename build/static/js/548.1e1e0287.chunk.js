"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[548],{1548:(e,r,a)=>{a.r(r),a.d(r,{default:()=>z});var i=a(9950),t=a(4937),n=a(4414);const s=t.i7`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`,o=t.Ay.div`
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`,d=t.Ay.section`
  text-align: center;
  padding: 4rem 1rem 2rem;
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(99,102,241,0.1);

  @media (min-width: 768px) {
    padding: 5rem 2rem 3rem;
  }
`,l=t.Ay.h1`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  animation: ${s} 0.6s ease-out;
`,m=t.Ay.p`
  color: #94a3b8;
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  max-width: 550px;
  margin: 0 auto 2rem;
  line-height: 1.7;
  animation: ${s} 0.6s ease-out 0.1s backwards;
`,c=t.Ay.section`
  padding: 3rem 1rem;
  max-width: 900px;
  margin: 0 auto;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
  }
`,p=t.Ay.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
`,h=t.Ay.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid ${e=>e.$featured?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.15)"};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  position: relative;
  animation: ${s} 0.6s ease-out ${e=>e.$delay||"0.2s"} backwards;
  transition: border-color 0.3s, transform 0.3s;

  ${e=>e.$featured&&"\n    box-shadow: 0 0 40px rgba(99,102,241,0.15);\n  "}

  &:hover {
    border-color: rgba(99,102,241,0.5);
    transform: translateY(-4px);
  }
`,g=t.Ay.span`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  padding: 0.3rem 1rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`,x=t.Ay.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 0.5rem;
`,f=t.Ay.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0.75rem 0;

  span {
    font-size: 1rem;
    font-weight: 400;
    color: #64748b;
  }
`,b=t.Ay.p`
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`,y=t.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
`,u=t.Ay.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  color: #e2e8f0;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);

  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: '✓';
    color: #22c55e;
    font-weight: 700;
    font-size: 0.85rem;
  }
`,j=t.Ay.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`,w=t.Ay.section`
  padding: 2rem 1rem 4rem;
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
`,k=t.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`,v=t.Ay.div`
  background: rgba(15, 15, 25, 0.6);
  border: 1px solid rgba(99,102,241,0.1);
  border-radius: 12px;
  padding: 1.5rem 1rem;
  animation: ${s} 0.6s ease-out ${e=>e.$delay||"0.4s"} backwards;

  h4 {
    color: #e2e8f0;
    font-size: 0.95rem;
    margin: 0.5rem 0 0.25rem;
  }

  p {
    color: #64748b;
    font-size: 0.8rem;
    margin: 0;
  }
`,A=t.Ay.div`
  font-size: 1.5rem;
`,$=t.Ay.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`,z=()=>(i.useEffect((()=>{window.StripeBuyButton&&window.StripeBuyButton.load()}),[]),(0,n.jsxs)(o,{children:[(0,n.jsxs)(d,{children:[(0,n.jsx)(l,{children:"Get Full Access"}),(0,n.jsx)(m,{children:"Unlock real-time market edges, automated alerts, and the tools that power smarter trades \u2014 all in one place."})]}),(0,n.jsx)(c,{children:(0,n.jsxs)(p,{children:[(0,n.jsxs)(h,{$delay:"0.2s",children:[(0,n.jsx)(x,{children:"Explorer"}),(0,n.jsxs)(f,{children:["$0 ",(0,n.jsx)("span",{children:"/ forever"})]}),(0,n.jsx)(b,{children:"See what the platform can do. Browse public data and get a feel for the tools."}),(0,n.jsxs)(y,{children:[(0,n.jsx)(u,{children:"Track Record \u2014 full transparency"}),(0,n.jsx)(u,{children:"Public blog & market insights"}),(0,n.jsx)(u,{children:"Playbook overview"}),(0,n.jsx)(u,{children:"Community access"})]})]}),(0,n.jsxs)(h,{$featured:!0,$delay:"0.3s",children:[(0,n.jsx)(g,{children:"Most Popular"}),(0,n.jsx)(x,{children:"Pro"}),(0,n.jsx)(f,{children:(0,n.jsx)("span",{children:"Starting at"})}),(0,n.jsx)(b,{children:"Everything in Explorer, plus real-time alerts and advanced tools to stay ahead."}),(0,n.jsxs)(y,{children:[(0,n.jsx)(u,{children:"Real-time Telegram edge alerts"}),(0,n.jsx)(u,{children:"Polymarket live scanner"}),(0,n.jsx)(u,{children:"Trading journal with analytics"}),(0,n.jsx)(u,{children:"AI-powered probability models"}),(0,n.jsx)(u,{children:"Priority support"})]}),(0,n.jsx)(j,{children:(0,n.jsx)("stripe-buy-button",{"buy-button-id":"buy_btn_1PoCswBQ5dVVUoajzSWdKTH7","publishable-key":"pk_live_51PkTr0BQ5dVVUoajsRhl46KlNpxhd9RYZ2r4rUQXyfnEuA3W9Nr2S4VMGVaXzwJejXVFfxBTEGKhQv100vZXKyur00fBGlG9D7"})})]})]})}),(0,n.jsxs)(w,{children:[(0,n.jsx)($,{children:"Why traders choose us"}),(0,n.jsxs)(k,{children:[(0,n.jsxs)(v,{$delay:"0.4s",children:[(0,n.jsx)(A,{children:"\ud83d\udcca"}),(0,n.jsx)("h4",{children:"Data-Driven"}),(0,n.jsx)("p",{children:"Every edge is backed by real probability models and live market data."})]}),(0,n.jsxs)(v,{$delay:"0.5s",children:[(0,n.jsx)(A,{children:"\ud83d\udd12"}),(0,n.jsx)("h4",{children:"Transparent"}),(0,n.jsx)("p",{children:"Full track record \u2014 wins and losses \u2014 published for everyone to see."})]}),(0,n.jsxs)(v,{$delay:"0.6s",children:[(0,n.jsx)(A,{children:"\u26a1"}),(0,n.jsx)("h4",{children:"Real-Time"}),(0,n.jsx)("p",{children:"Alerts fire the moment an edge appears. No delays, no stale data."})]})]})]})]}))}}]);