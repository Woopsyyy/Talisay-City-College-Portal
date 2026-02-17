import{r as s,j as o,d as p,p as f}from"./index-G8dAaOpg.js";import{C as c}from"./circle-check-big-BkBU9BDV.js";import{C as x}from"./circle-alert-QpU8jh7N.js";import{T as m}from"./triangle-alert-DHUh_5GK.js";const T=({message:r,type:e="success",onClose:t,duration:a=3e3})=>{s.useEffect(()=>{const n=setTimeout(()=>{t&&t()},a);return()=>clearTimeout(n)},[a,t]);let i=c;return e==="error"&&(i=x),e==="warning"&&(i=m),o.jsxs(u,{$type:e,children:[o.jsx(i,{size:20}),r]})},l=f`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`,u=p.div`
  position: fixed;
  top: 24px;
  right: 24px;
  background: white;
  color: ${r=>r.$type==="error"?"#ef4444":r.$type==="warning"?"#f59e0b":"#10b981"};
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  z-index: 4000;
  animation: ${l} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 4px solid ${r=>r.$type==="error"?"#ef4444":r.$type==="warning"?"#f59e0b":"#10b981"};
`;export{T};
