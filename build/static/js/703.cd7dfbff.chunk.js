"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[703],{5703:(e,r,a)=>{a.r(r),a.d(r,{default:()=>y});var t=a(9950),o=a(2074),i=a(8429),n=a(5042),d=a(251),s=a(4937),l=a(4414);const c=s.Ay.section`
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
`,m=s.Ay.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
  padding: 0 0.5rem;
`,u=s.Ay.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 340px;
  text-align: left;

  @media (min-width: 480px) {
    max-width: 300px;
  }
`,p=s.Ay.label`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #94a3b8;
`,g=s.Ay.input`
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
`,h=s.Ay.button`
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
`,b=s.Ay.p`
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
`,x=s.Ay.p`
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
`,f=(0,s.Ay)(o.N_)`
  color: #818cf8;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`,w=s.Ay.button`
  background: none;
  border: none;
  color: #818cf8;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  margin-top: 0.25rem;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`,y=()=>{const[e,r]=(0,t.useState)(""),[a,o]=(0,t.useState)(""),[s,y]=(0,t.useState)(""),[k,v]=(0,t.useState)(""),[j,P]=(0,t.useState)(!1),A=(0,i.Zp)();return(0,l.jsxs)(c,{children:[(0,l.jsx)("h2",{children:"Login"}),(0,l.jsxs)(m,{onSubmit:async r=>{if(r.preventDefault(),y(""),v(""),e.trim()&&a.trim()){P(!0);try{const r=(0,d.x9)(n.j2,e,a),t=new Promise(((e,r)=>setTimeout((()=>r(new Error("Login timed out \u2014 check your internet connection or try disabling browser extensions"))),15e3)));await Promise.race([r,t]),A("/dashboard")}catch(t){switch(console.error("Login error:",t),t.code){case"auth/user-not-found":y("Email not recognized. Please sign up.");break;case"auth/wrong-password":y("Incorrect password. Please try again.");break;case"auth/invalid-email":y("Invalid email format. Please check and try again.");break;case"auth/user-disabled":y("This account has been disabled. Please contact support.");break;case"auth/invalid-credential":y("Invalid credentials. Please check and try again.");break;case"auth/too-many-requests":y("Too many failed attempts. Please try again later.");break;default:y(t.message||"An error occurred. Please try again later.")}}finally{P(!1)}}else y("Please fill in all fields.")},noValidate:!0,children:[(0,l.jsxs)(u,{children:[(0,l.jsx)(p,{htmlFor:"login-email",children:"Email"}),(0,l.jsx)(g,{id:"login-email",type:"email",placeholder:"you@example.com",value:e,onChange:e=>r(e.target.value),autoComplete:"email",required:!0,"aria-required":"true"})]}),(0,l.jsxs)(u,{children:[(0,l.jsx)(p,{htmlFor:"login-password",children:"Password"}),(0,l.jsx)(g,{id:"login-password",type:"password",placeholder:"Enter your password",value:a,onChange:e=>o(e.target.value),autoComplete:"current-password",required:!0,"aria-required":"true"}),(0,l.jsx)(w,{type:"button",onClick:async()=>{if(y(""),v(""),e.trim())try{await(0,d.J1)(n.j2,e),v("Password reset email sent! Check your inbox.")}catch(r){switch(r.code){case"auth/user-not-found":y("No account found with this email.");break;case"auth/invalid-email":y("Invalid email format.");break;default:y("Failed to send reset email. Please try again.")}}else y("Please enter your email address first.")},children:"Forgot password?"})]}),(0,l.jsx)(h,{type:"submit",disabled:j,children:j?"Logging in...":"Login"}),s&&(0,l.jsx)(b,{role:"alert",children:s}),k&&(0,l.jsx)(x,{role:"status",children:k}),(0,l.jsx)(f,{to:"/signup",children:"Don't have an account? Sign up"})]})]})}}}]);