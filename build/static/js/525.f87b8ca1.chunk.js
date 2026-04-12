"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[525],{3525:(e,t,r)=>{r.r(t),r.d(t,{default:()=>U});var i=r(9950),o=r(4937),a=r(6220),l=r(5042),n=r(9751),s=r(4414);const d=o.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`,c=o.Ay.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  border-radius: 8px;
  font-weight: 500;
  transition: opacity 0.3s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,m=o.Ay.p`
  color: #f87171;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`,g=o.Ay.p`
  color: #94a3b8;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`,h=["image/jpeg","image/png","image/gif","image/webp"],p=e=>{let{onUpload:t}=e;const[r,o]=(0,i.useState)(null),[a,p]=(0,i.useState)(""),[u,b]=(0,i.useState)(!1),[x,f]=(0,i.useState)("");return(0,s.jsxs)(d,{children:[(0,s.jsxs)("label",{htmlFor:"image-upload",style:{cursor:"pointer"},children:["Choose Image",(0,s.jsx)("input",{id:"image-upload",type:"file",accept:"image/jpeg,image/png,image/gif,image/webp",onChange:e=>{f("");const t=e.target.files[0];if(t)return h.includes(t.type)?t.size>5242880?(f("File is too large. Maximum size is 5MB."),void o(null)):void o(t):(f("Please select a valid image file (JPEG, PNG, GIF, or WebP)."),void o(null))},style:{display:"block",marginTop:"0.5rem"}})]}),(0,s.jsx)(c,{onClick:async()=>{if(r){b(!0),f("");try{const e=`${Date.now()}-${Math.random().toString(36).substr(2,9)}-${r.name}`,i=(0,n.KR)(l.IG,`images/${e}`),o=await(0,n.D)(i,r),a=await(0,n.qk)(o.ref);p(a),t(a)}catch(e){console.error("Upload failed:",e),f("Upload failed. Please try again.")}finally{b(!1)}}else f("Please select a file first.")},disabled:!r||u,children:u?"Uploading...":"Upload"}),x&&(0,s.jsx)(m,{role:"alert",children:x}),u&&(0,s.jsx)(g,{children:"Uploading image..."}),a&&(0,s.jsx)("img",{src:a,alt:"Uploaded preview",style:{width:"100px",marginTop:"1rem",objectFit:"contain"}})]})},u=o.Ay.section`
  padding: 4rem 2rem;
  background: #0a0a0f;
  color: #e2e8f0;
  min-height: 80vh;
`,b=o.Ay.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`,x=o.Ay.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 3rem;
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`,f=o.Ay.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
`,y=o.Ay.label`
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  color: #94a3b8;
`,j=o.Ay.input`
  padding: 0.75rem;
  width: 100%;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`,k=o.Ay.textarea`
  padding: 0.75rem;
  width: 100%;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  resize: vertical;
  min-height: 100px;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
`,w=o.Ay.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.3s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,S=(0,o.Ay)(w)`
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
  }
`,v=o.Ay.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.85rem;
`,A=o.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
`,C=o.Ay.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
`,z=o.Ay.img`
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1rem;
`,E=o.Ay.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #e2e8f0;
`,D=o.Ay.p`
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 0.5rem;
`,F=o.Ay.p`
  font-size: 1rem;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 1rem;
`,P=o.Ay.p`
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 1rem;
`,B=o.Ay.p`
  color: #f87171;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`,T=o.Ay.p`
  color: #22c55e;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`,U=()=>{const[e,t]=(0,i.useState)([]),[r,o]=(0,i.useState)({title:"",date:"",content:"",image:"",stockSymbol:""}),[n,d]=(0,i.useState)(!1),[c,m]=(0,i.useState)(null),[g,h]=(0,i.useState)([]),[U,q]=(0,i.useState)({title:"",date:"",author:"",description:"",image:""}),[G,$]=(0,i.useState)(!1),[J,H]=(0,i.useState)(null),[M,I]=(0,i.useState)(null),[N,Y]=(0,i.useState)(null),[Z,K]=(0,i.useState)(null),[R,W]=(0,i.useState)(!1),L=(0,i.useCallback)((async()=>{try{const e=await(0,a.GG)((0,a.rJ)(l.db,"dashboard")),r=[];e.forEach((e=>{r.push({id:e.id,...e.data()})})),t(r)}catch(e){Y("Failed to load dashboard data.")}}),[]),O=(0,i.useCallback)((async()=>{try{const e=await(0,a.GG)((0,a.rJ)(l.db,"blogPosts")),t=[];e.forEach((e=>{t.push({id:e.id,...e.data()})})),h(t)}catch(e){Y("Failed to load blog data.")}}),[]);(0,i.useEffect)((()=>{L(),O()}),[L,O]);const Q=(e,t,r)=>{const{name:i,value:o}=e.target;t({...r,[i]:o})},V=(e,t,r)=>{t({...r,image:e})},X=e=>{K(e),setTimeout((()=>K(null)),3e3)};return(0,s.jsxs)(u,{children:[(0,s.jsx)(b,{children:"Admin Page"}),N&&(0,s.jsx)(B,{role:"alert",children:N}),Z&&(0,s.jsx)(T,{role:"status",children:Z}),(0,s.jsxs)(x,{onSubmit:async e=>{e.preventDefault(),W(!0),Y(null);try{if(n){const e=(0,a.H9)(l.db,"dashboard",c);(await(0,a.x7)(e)).exists()?(await(0,a.mZ)(e,r),X("Element updated successfully.")):Y("Document does not exist."),d(!1),m(null)}else await(0,a.gS)((0,a.rJ)(l.db,"dashboard"),r),X("Element added successfully.");o({title:"",date:"",content:"",image:"",stockSymbol:""}),L()}catch(t){Y("Error saving element. Please try again.")}finally{W(!1)}},"aria-label":"Dashboard element form",children:[(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"el-title",children:"Title"}),(0,s.jsx)(j,{id:"el-title",type:"text",name:"title",value:r.title,onChange:e=>Q(e,o,r),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"el-date",children:"Date"}),(0,s.jsx)(j,{id:"el-date",type:"date",name:"date",value:r.date,onChange:e=>Q(e,o,r),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"el-content",children:"Content"}),(0,s.jsx)(k,{id:"el-content",name:"content",value:r.content,onChange:e=>Q(e,o,r),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"el-stock",children:"Stock Symbol"}),(0,s.jsx)(j,{id:"el-stock",type:"text",name:"stockSymbol",value:r.stockSymbol,onChange:e=>Q(e,o,r)})]}),(0,s.jsx)(p,{onUpload:e=>V(e,o,r)}),(0,s.jsx)(w,{type:"submit",disabled:R,children:R?"Saving...":n?"Update Element":"Add Element"})]}),(0,s.jsx)(b,{children:"Current Elements"}),(0,s.jsx)(A,{children:e.map((e=>(0,s.jsxs)(C,{children:[e.image&&(0,s.jsx)(z,{src:e.image,alt:e.title||"Dashboard element"}),(0,s.jsx)(E,{children:e.title}),(0,s.jsx)(D,{children:e.date}),(0,s.jsx)(F,{children:e.content}),e.stockSymbol&&(0,s.jsx)(P,{children:e.stockSymbol}),(0,s.jsx)(w,{onClick:()=>(e=>{o(e),d(!0),m(e.id),window.scrollTo({top:0,behavior:"smooth"})})(e),children:"Edit"}),M===e.id?(0,s.jsxs)(v,{children:[(0,s.jsx)("span",{style:{color:"#c00"},children:"Delete this?"}),(0,s.jsx)(S,{onClick:()=>(async e=>{try{const t=(0,a.H9)(l.db,"dashboard",e);(await(0,a.x7)(t)).exists()&&(await(0,a.kd)(t),X("Element deleted.")),I(null),L()}catch(t){Y("Error deleting element.")}})(e.id),style:{marginTop:0,padding:"0.4rem 1rem",fontSize:"0.85rem"},children:"Yes"}),(0,s.jsx)(w,{onClick:()=>I(null),style:{marginTop:0,padding:"0.4rem 1rem",fontSize:"0.85rem"},children:"No"})]}):(0,s.jsx)(S,{onClick:()=>I(e.id),children:"Delete"})]},e.id)))}),(0,s.jsx)(b,{children:"Blog Management"}),(0,s.jsxs)(x,{onSubmit:async e=>{e.preventDefault(),W(!0),Y(null);try{if(G){const e=(0,a.H9)(l.db,"blogPosts",J);(await(0,a.x7)(e)).exists()?(await(0,a.mZ)(e,U),X("Blog post updated successfully.")):Y("Document does not exist."),$(!1),H(null)}else await(0,a.gS)((0,a.rJ)(l.db,"blogPosts"),U),X("Blog post added successfully.");q({title:"",date:"",author:"",description:"",image:""}),O()}catch(t){Y("Error saving blog post. Please try again.")}finally{W(!1)}},"aria-label":"Blog post form",children:[(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"blog-title",children:"Title"}),(0,s.jsx)(j,{id:"blog-title",type:"text",name:"title",value:U.title,onChange:e=>Q(e,q,U),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"blog-date",children:"Date"}),(0,s.jsx)(j,{id:"blog-date",type:"date",name:"date",value:U.date,onChange:e=>Q(e,q,U),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"blog-author",children:"Author"}),(0,s.jsx)(j,{id:"blog-author",type:"text",name:"author",value:U.author,onChange:e=>Q(e,q,U),required:!0})]}),(0,s.jsxs)(f,{children:[(0,s.jsx)(y,{htmlFor:"blog-description",children:"Description"}),(0,s.jsx)(k,{id:"blog-description",name:"description",value:U.description,onChange:e=>Q(e,q,U),required:!0})]}),(0,s.jsx)(p,{onUpload:e=>V(e,q,U)}),(0,s.jsx)(w,{type:"submit",disabled:R,children:R?"Saving...":G?"Update Blog":"Add Blog"})]}),(0,s.jsx)(b,{children:"Current Blog Posts"}),(0,s.jsx)(A,{children:g.map((e=>(0,s.jsxs)(C,{children:[e.image&&(0,s.jsx)(z,{src:e.image,alt:e.title||"Blog post"}),(0,s.jsx)(E,{children:e.title}),(0,s.jsx)(D,{children:e.date}),(0,s.jsx)(F,{children:e.description}),e.author&&(0,s.jsxs)(P,{children:["By ",e.author]}),(0,s.jsx)(w,{onClick:()=>(e=>{q(e),$(!0),H(e.id),window.scrollTo({top:0,behavior:"smooth"})})(e),children:"Edit"}),M===`blog-${e.id}`?(0,s.jsxs)(v,{children:[(0,s.jsx)("span",{style:{color:"#c00"},children:"Delete this?"}),(0,s.jsx)(S,{onClick:()=>(async e=>{try{const t=(0,a.H9)(l.db,"blogPosts",e);(await(0,a.x7)(t)).exists()&&(await(0,a.kd)(t),X("Blog post deleted.")),I(null),O()}catch(t){Y("Error deleting blog post.")}})(e.id),style:{marginTop:0,padding:"0.4rem 1rem",fontSize:"0.85rem"},children:"Yes"}),(0,s.jsx)(w,{onClick:()=>I(null),style:{marginTop:0,padding:"0.4rem 1rem",fontSize:"0.85rem"},children:"No"})]}):(0,s.jsx)(S,{onClick:()=>I(`blog-${e.id}`),children:"Delete"})]},e.id)))})]})}}}]);