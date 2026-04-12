"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[912],{4508:(e,i,r)=>{r.d(i,{A:()=>o});var t=r(9950);const o=(e,i)=>{(0,t.useEffect)((()=>{if(e){const e=document.body.style.overflow;return document.body.style.overflow="hidden",()=>{document.body.style.overflow=e}}}),[e]);const r=(0,t.useCallback)((r=>{"Escape"===r.key&&e&&i()}),[e,i]);(0,t.useEffect)((()=>(document.addEventListener("keydown",r),()=>document.removeEventListener("keydown",r))),[r])}},9912:(e,i,r)=>{r.r(i),r.d(i,{default:()=>P});var t=r(9950),o=r(4937),n=r(6220),a=r(5042),d=r(4508),s=r(4414);const l=o.Ay.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`,c=o.Ay.div`
  background: #0f0f19;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 1rem;
  border-radius: 12px;
  width: 90%;
  max-width: 75vw;
  max-height: 75vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0px 4px 30px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    width: 95%;
    max-width: 95vw;
    max-height: 80vh;
  }

  @media (max-width: 480px) {
    width: 98%;
    max-width: 98vw;
    max-height: 70vh;
  }
`,m=o.Ay.button`
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001;
  color: #94a3b8;

  &:focus-visible {
    outline: 2px solid #818cf8;
    outline-offset: 2px;
  }
`,h=e=>{let{stockSymbol:i,onClose:r}=e;const o=(0,t.useRef)(null);return(0,d.A)(!0,r),(0,t.useEffect)((()=>{try{window.TradingView&&window.TradingView.widget&&new window.TradingView.widget({container_id:"tradingview_widget",width:"100%",height:"100%",symbol:i,interval:"D",timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",toolbar_bg:"#0f0f19",enable_publishing:!1,withdateranges:!0,hide_side_toolbar:!1,allow_symbol_change:!0,save_image:!1,studies:[],show_popup_button:!0,popup_width:"100%",popup_height:"100%"})}catch(e){console.error("Error initializing TradingView widget:",e)}return()=>{o.current&&(o.current.innerHTML="")}}),[i]),(0,s.jsx)(l,{onClick:r,role:"dialog","aria-modal":"true","aria-label":`Chart for ${i}`,children:(0,s.jsxs)(c,{onClick:e=>e.stopPropagation(),children:[(0,s.jsx)(m,{onClick:r,"aria-label":"Close chart",children:"\xd7"}),(0,s.jsx)("div",{id:"tradingview_widget",ref:o,style:{height:"100%",width:"100%",minHeight:"400px"}})]})})},p=o.Ay.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`,g=o.Ay.img`
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
`,f=o.Ay.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
`,u=e=>{let{imageUrl:i,onClose:r}=e;return(0,d.A)(!0,r),(0,s.jsxs)(p,{onClick:r,role:"dialog","aria-modal":"true","aria-label":"Image preview",children:[(0,s.jsx)(g,{src:i,alt:"Full size preview",onClick:e=>e.stopPropagation()}),(0,s.jsx)(f,{onClick:r,"aria-label":"Close image preview",children:"\xd7"})]})};var x=r(4959),b=r(9324),w=r(5074);const y=o.Ay.section`
  padding: 2rem 1rem;
  text-align: center;
  background: #0a0a0f;
  color: #e2e8f0;
  min-height: 80vh;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
  }
`,v=o.Ay.h1`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (min-width: 768px) {
    font-size: 3rem;
    margin-bottom: 2rem;
  }
`,k=o.Ay.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  padding: 0 0.25rem;

  @media (min-width: 768px) {
    gap: 2rem;
    padding: 0;
  }
`,j=o.Ay.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 15px;
  padding: 1.25rem;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s, border-color 0.3s;
  position: relative;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (min-width: 768px) {
    width: 300px;
    padding: 1.5rem;
  }

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(99, 102, 241, 0.4);
  }
`,A=o.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1rem;
`,C=o.Ay.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #e2e8f0;
`,z=o.Ay.div`
  font-size: 0.9rem;
  color: #64748b;
`,_=o.Ay.div`
  font-size: 1rem;
  color: #94a3b8;
  text-align: center;
`,S=o.Ay.div`
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  cursor: pointer;
`,E=o.Ay.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.1);
  }
`,T=o.Ay.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: opacity 0.3s, transform 0.3s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-3px);
  }

  &:focus-visible {
    outline: 2px solid #818cf8;
    outline-offset: 2px;
  }
`,V=o.Ay.p`
  color: #f87171;
  font-size: 1.1rem;
  margin: 2rem 0;
`,D=o.Ay.div`
  padding: 3rem;
  color: #64748b;
  font-size: 1.1rem;
`,L=o.Ay.button`
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;

  &:hover {
    opacity: 0.9;
  }
`,P=()=>{const[e,i]=(0,t.useState)([]),[r,o]=(0,t.useState)(!1),[d,l]=(0,t.useState)(null),[c,m]=(0,t.useState)(!1),[p,g]=(0,t.useState)(null),[f,P]=(0,t.useState)(!0),[U,F]=(0,t.useState)(null),G=(0,t.useCallback)((async()=>{P(!0),F(null);try{const e=await(0,n.GG)((0,n.rJ)(a.db,"dashboard")),r=[];e.forEach((e=>{r.push({id:e.id,...e.data()})})),i(r)}catch(e){console.error("Error fetching dashboard data:",e),F("Failed to load dashboard data. Please try again.")}finally{P(!1)}}),[]);(0,t.useEffect)((()=>{G()}),[G]);return f?(0,s.jsx)(w.A,{}):(0,s.jsxs)(y,{children:[(0,s.jsx)(v,{children:"Dashboard"}),U?(0,s.jsxs)(V,{role:"alert",children:[U,(0,s.jsx)("br",{}),(0,s.jsx)(L,{onClick:G,children:"Retry"})]}):0===e.length?(0,s.jsx)(D,{children:(0,s.jsx)("p",{children:"No dashboard items yet. Check back soon!"})}):(0,s.jsx)(k,{children:e.map((e=>(0,s.jsxs)(j,{children:[(0,s.jsxs)(A,{children:[(0,s.jsx)(C,{children:e.title}),(0,s.jsx)(z,{children:e.date})]}),(0,s.jsx)(S,{onClick:()=>{return i=e.image,g(i),void m(!0);var i},children:e.image&&(0,s.jsx)(E,{src:e.image,alt:e.title||"Dashboard item"})}),(0,s.jsx)(_,{children:e.content}),e.stockSymbol&&(0,s.jsxs)(T,{onClick:()=>{var i;(i=e.stockSymbol)&&(l(i),o(!0))},"aria-label":`View chart for ${e.stockSymbol}`,children:[(0,s.jsx)(x.g,{icon:b.ArK,size:"lg"}),(0,s.jsx)("span",{children:"Chart"})]})]},e.id)))}),r&&d&&(0,s.jsx)(h,{stockSymbol:d,onClose:()=>{o(!1),l(null)}}),c&&(0,s.jsx)(u,{imageUrl:p,onClose:()=>{m(!1),g(null)}})]})}}}]);