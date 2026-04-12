"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[120],{1120:(e,r,a)=>{a.r(r),a.d(r,{default:()=>v});var t=a(9950),i=a(2074),o=a(8429),n=a(5042),s=a(251),d=a(3507),l=a(4937),c=a(4414);const m=l.Ay.section`
  padding: 1.5rem 1rem;
  text-align: center;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  color: #e2e8f0;

  @media (min-width: 768px) {
    padding: 2rem;
  }

  h2 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`,p=l.Ay.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
  padding: 0 0.5rem;
`,u=l.Ay.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 340px;
  text-align: left;

  @media (min-width: 480px) {
    max-width: 300px;
  }
`,h=l.Ay.label`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #94a3b8;
`,g=l.Ay.input`
  padding: 0.75rem;
  width: 100%;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  &::placeholder {
    color: #64748b;
  }
`,f=l.Ay.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 600;
  transition: opacity 0.3s, transform 0.2s;
  min-width: 120px;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,x=l.Ay.p`
  color: #f87171;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  max-width: 340px;
  text-align: center;
  word-break: break-word;

  @media (min-width: 480px) {
    max-width: 300px;
  }
`,b=l.Ay.p`
  color: #22c55e;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  max-width: 300px;
  text-align: center;
`,w=(0,l.Ay)(i.N_)`
  color: #818cf8;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`,y=l.Ay.div`
  width: 100%;
  margin-top: 0.25rem;
`,k=l.Ay.div`
  height: 4px;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${e=>e.strength}%;
    background-color: ${e=>e.strength<=25?"#f87171":e.strength<=50?"#fb923c":e.strength<=75?"#fbbf24":"#34d399"};
    transition: width 0.3s, background-color 0.3s;
  }
`,j=l.Ay.span`
  font-size: 0.75rem;
  color: #94a3b8;
`,v=()=>{const[e,r]=(0,t.useState)(""),[a,i]=(0,t.useState)(""),[l,v]=(0,t.useState)(""),[A,C]=(0,t.useState)(""),[P,z]=(0,t.useState)(""),[S,q]=(0,t.useState)(!1),F=(0,o.Zp)(),{createUserDocument:U}=(0,d.A)(),Z=(e=>{let r=0;return e.length>=6&&(r+=25),e.length>=8&&(r+=15),/[A-Z]/.test(e)&&(r+=20),/[0-9]/.test(e)&&(r+=20),/[^A-Za-z0-9]/.test(e)&&(r+=20),Math.min(r,100)})(a);(0,t.useEffect)((()=>(0,s.hg)(n.j2,(e=>{e&&e.emailVerified&&F("/dashboard")}))),[F]);return(0,c.jsxs)(m,{children:[(0,c.jsx)("h2",{children:"Sign Up"}),(0,c.jsxs)(p,{onSubmit:async r=>{if(r.preventDefault(),C(""),z(""),e.trim()&&a.trim()&&l.trim())if(a===l)if(a.length<6)C("Password must be at least 6 characters.");else if(Z<50)C("Please choose a stronger password. Include uppercase letters, numbers, or symbols.");else{q(!0);try{const r=await(0,s.eJ)(n.j2,e,a);await U(r.user),await(0,s.gA)(r.user),z("Account created! A verification email has been sent. Please check your inbox.")}catch(t){switch(t.code){case"auth/email-already-in-use":C("You're already signed up. Please log in.");break;case"auth/invalid-email":C("Invalid email format.");break;case"auth/weak-password":C("Password is too weak. Please use at least 6 characters.");break;default:C("An error occurred during sign up. Please try again.")}}finally{q(!1)}}else C("Passwords do not match.");else C("Please fill in all fields.")},noValidate:!0,children:[(0,c.jsxs)(u,{children:[(0,c.jsx)(h,{htmlFor:"signup-email",children:"Email"}),(0,c.jsx)(g,{id:"signup-email",type:"email",placeholder:"you@example.com",value:e,onChange:e=>r(e.target.value),autoComplete:"email",required:!0,"aria-required":"true"})]}),(0,c.jsxs)(u,{children:[(0,c.jsx)(h,{htmlFor:"signup-password",children:"Password"}),(0,c.jsx)(g,{id:"signup-password",type:"password",placeholder:"Create a password",value:a,onChange:e=>i(e.target.value),autoComplete:"new-password",required:!0,"aria-required":"true"}),a&&(0,c.jsxs)(y,{children:[(0,c.jsx)(k,{strength:Z}),(0,c.jsx)(j,{children:(D=Z,D<=25?"Weak":D<=50?"Fair":D<=75?"Good":"Strong")})]})]}),(0,c.jsxs)(u,{children:[(0,c.jsx)(h,{htmlFor:"signup-confirm-password",children:"Confirm Password"}),(0,c.jsx)(g,{id:"signup-confirm-password",type:"password",placeholder:"Confirm your password",value:l,onChange:e=>v(e.target.value),autoComplete:"new-password",required:!0,"aria-required":"true"})]}),(0,c.jsx)(f,{type:"submit",disabled:S,children:S?"Creating account...":"Sign Up"}),A&&(0,c.jsx)(x,{role:"alert",children:A}),P&&(0,c.jsx)(b,{role:"status",children:P}),(0,c.jsx)(w,{to:"/login",children:"Already have an account? Log in"})]})]});var D}}}]);