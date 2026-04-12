"use strict";(self.webpackChunkmarketplaymaker=self.webpackChunkmarketplaymaker||[]).push([[84],{1084:(e,r,a)=>{a.r(r),a.d(r,{default:()=>y});var t=a(9950),n=a(4937),o=a(4414);const l=n.Ay.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem 0.75rem;
  color: #e2e8f0;

  @media (min-width: 768px) {
    padding: 20px;
  }

  h2 {
    font-size: 1.5rem;
    color: #e2e8f0;

    @media (min-width: 768px) {
      font-size: 1.75rem;
    }
  }
`,i=n.Ay.div`
  border: 1px solid rgba(99, 102, 241, 0.15);
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 12px;
  background: rgba(15, 15, 25, 0.8);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  @media (min-width: 768px) {
    padding: 15px;
    margin-bottom: 20px;
  }
`,d=n.Ay.input`
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  box-sizing: border-box;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  @media (min-width: 480px) {
    width: 80%;
  }

  &:focus {
    border-color: #6366f1;
  }

  &::placeholder {
    color: #64748b;
  }
`,s=n.Ay.ul`
  list-style-type: none;
  padding: 0;
`,p=n.Ay.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 10px;
  background: ${e=>e.completed?"rgba(34, 197, 94, 0.1)":"rgba(15, 15, 25, 0.8)"};
  border: 1px solid ${e=>e.completed?"rgba(34, 197, 94, 0.3)":"rgba(99, 102, 241, 0.15)"};
  border-radius: 8px;
  transition: background 0.3s, border-color 0.3s;
  gap: 8px;
  flex-wrap: wrap;
  color: #e2e8f0;
`,c=n.Ay.span`
  text-decoration: ${e=>e.completed?"line-through":"none"};
  flex-grow: 1;
`,x=n.Ay.input`
  margin-right: 10px;
`,g=n.Ay.button`
  padding: 8px 12px;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
  font-size: 14px;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`,m=(0,n.Ay)(g)`
  background: linear-gradient(135deg, #6366f1, #818cf8);
  margin-top: 10px;

  &:hover {
    opacity: 0.9;
  }
`,b=(0,n.Ay)(g)`
  background: linear-gradient(135deg, #6366f1, #818cf8);
  margin-top: 10px;

  &:hover {
    opacity: 0.9;
  }
`,h=(0,n.Ay)(g)`
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  margin-top: 10px;

  &:hover {
    opacity: 0.9;
  }
`,u=(0,n.Ay)(g)`
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  margin-left: 10px;
  margin-top: 5px;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`,f=(0,n.Ay)(g)`
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  font-size: 12px;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`,y=()=>{const[e,r]=(0,t.useState)([]),[a,n]=(0,t.useState)(""),[g,y]=(0,t.useState)(""),[k,j]=(0,t.useState)([]),[w,A]=(0,t.useState)(null);(0,t.useEffect)((()=>{const e=JSON.parse(localStorage.getItem("tradePlans"))||[];j(e)}),[]),(0,t.useEffect)((()=>{localStorage.setItem("tradePlans",JSON.stringify(k))}),[k]);const v=()=>{""!==a.trim()?(r([...e,{text:a,completed:!1}]),n("")):alert("Task name cannot be empty.")};return(0,o.jsxs)(l,{children:[(0,o.jsx)("h2",{children:"Trade Plan Manager"}),(0,o.jsx)("p",{children:"Fail to plan, you plan to fail."}),(0,o.jsxs)(i,{children:[(0,o.jsx)("label",{htmlFor:"new-task-input",style:{display:"none"},children:"New task"}),(0,o.jsx)(d,{id:"new-task-input",type:"text",value:a,onChange:e=>n(e.target.value),placeholder:"Add a new task...",onKeyDown:e=>"Enter"===e.key&&v()}),(0,o.jsx)(m,{onClick:v,children:"Add Task"})]}),(0,o.jsxs)(i,{children:[(0,o.jsx)("label",{htmlFor:"plan-name-input",style:{display:"none"},children:"Plan name"}),(0,o.jsx)(d,{id:"plan-name-input",type:"text",value:g,onChange:e=>y(e.target.value),placeholder:"Enter plan name..."}),(0,o.jsx)(b,{onClick:()=>{if(""===g.trim())return void alert("Plan name cannot be empty.");if(k.some((e=>e.name===g.trim())))return void alert("A plan with this name already exists.");const a={name:g,tasks:e};j([...k,a]),y(""),r([])},children:"Save Plan"})]}),0===e.length?(0,o.jsx)("p",{children:"No tasks added yet. Start by adding your first task!"}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(s,{children:e.map(((a,t)=>(0,o.jsxs)(p,{completed:a.completed,children:[(0,o.jsx)(x,{type:"checkbox",checked:a.completed,onChange:()=>(a=>{const t=e.map(((e,r)=>r===a?{...e,completed:!e.completed}:e));r(t)})(t)}),(0,o.jsx)(c,{completed:a.completed,children:a.text}),(0,o.jsx)(f,{onClick:()=>(a=>{const t=e.filter(((e,r)=>r!==a));r(t)})(t),children:"Delete"})]},t)))}),(0,o.jsx)(h,{onClick:()=>{const a=e.map((e=>({...e,completed:!1})));r(a)},children:"Reset All Tasks"})]}),k.length>0&&(0,o.jsxs)(i,{children:[(0,o.jsx)("h3",{children:"Saved Trade Plans"}),(0,o.jsx)("ul",{children:k.map(((e,a)=>(0,o.jsxs)("li",{style:{marginBottom:"10px"},children:[(0,o.jsx)("button",{onClick:()=>(e=>{A(e),r(e.tasks)})(e),children:e.name}),(0,o.jsx)(u,{onClick:()=>(e=>{if(!window.confirm("Are you sure you want to delete this plan?"))return;const a=k.filter(((r,a)=>a!==e));j(a),localStorage.setItem("tradePlans",JSON.stringify(a)),w&&w===k[e]&&(A(null),r([]))})(a),children:"Delete Plan"})]},a)))})]})]})}}}]);