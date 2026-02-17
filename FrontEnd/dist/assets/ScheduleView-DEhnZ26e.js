import{r as o,j as e,P as k,T as z,d as a}from"./index-G8dAaOpg.js";import{C as m}from"./calendar-CG0mXhiR.js";import{C}from"./clock-DTlNUsPA.js";import{U as M}from"./user-DNE8y8gH.js";import{M as j}from"./map-pin-ENw4PO3o.js";const K=()=>{const[y,p]=o.useState([]),[S,T]=o.useState(!0),[x,h]=o.useState(null),f=s=>{if(!s)return"TBA";try{const[r,t]=s.split(":"),n=parseInt(r),d=n>=12?"PM":"AM";return`${n%12||12}:${t} ${d}`}catch{return s}};o.useEffect(()=>{(async()=>{try{const r=await z.getSchedule();p(Array.isArray(r)?r:[]),h(null)}catch(r){p([]),h(r?.message||"Failed to load schedule.")}finally{T(!1)}})()},[]);const c=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],i=o.useMemo(()=>{const s={},r=t=>{if(!t)return"Unknown";const n=String(t).trim(),d=n.toLowerCase(),l={mon:"Monday",monday:"Monday",tue:"Tuesday",tues:"Tuesday",tuesday:"Tuesday",wed:"Wednesday",weds:"Wednesday",wednesday:"Wednesday",thu:"Thursday",thur:"Thursday",thurs:"Thursday",thursday:"Thursday",fri:"Friday",friday:"Friday",sat:"Saturday",saturday:"Saturday",sun:"Sunday",sunday:"Sunday",1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday",6:"Saturday",7:"Sunday"};return l[d]?l[d]:n.charAt(0).toUpperCase()+n.slice(1)};return y.forEach(t=>{const n=r(t.day||t.day_of_week||t.dayOfWeek);s[n]||(s[n]=[]),s[n].push(t)}),s},[y]),g=o.useMemo(()=>{const s=c.filter(t=>i[t]),r=Object.keys(i).filter(t=>!c.includes(t)).sort();return[...s,...r]},[c,i]);return e.jsxs(A,{children:[e.jsxs(D,{children:[e.jsxs("div",{children:[e.jsx(W,{children:"Class Schedule"}),e.jsx(_,{children:"Manage your weekly teaching schedule"})]}),e.jsx(m,{size:32,color:"var(--accent-primary)"})]}),e.jsx(E,{children:S?e.jsxs(I,{children:[e.jsx(k,{variant:"cards",count:4}),e.jsx(L,{children:"Loading schedule…"})]}):x?e.jsxs(v,{children:[e.jsx(m,{size:48}),e.jsx("p",{children:x}),e.jsx(b,{children:"Try refreshing or contact an admin to assign your schedule."})]}):g.length===0?e.jsxs(v,{children:[e.jsx(m,{size:48}),e.jsx("p",{children:"No scheduled classes found."}),e.jsx(b,{children:"If this looks wrong, ask the admin to assign your subjects."})]}):e.jsx($,{children:g.map(s=>e.jsxs(B,{children:[e.jsx(F,{children:s}),e.jsx(P,{children:i[s].map((r,t)=>e.jsxs(w,{children:[e.jsxs(H,{children:[e.jsx(C,{size:16}),f(r.time_start)," - ",f(r.time_end)]}),e.jsxs(U,{children:[e.jsx(Y,{children:r.subject_name||r.subject||r.subject_code||"Subject"}),e.jsxs(O,{children:[e.jsxs(u,{children:[e.jsx(M,{size:14}),e.jsxs("span",{children:[r.year||"Year"," - ",r.section||r.section_name||"Section"]})]}),e.jsxs(u,{children:[e.jsx(j,{size:14}),e.jsxs("span",{children:["building: ",r.building||"TBA"]})]}),e.jsxs(u,{children:[e.jsx(j,{size:14}),e.jsxs("span",{children:["floor: ",r.floor||"TBA"]})]})]})]}),e.jsx(G,{})]},`${s}-${t}`))})]},s))})})]})},A=a.div`
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`,D=a.div`
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;
`,W=a.h2`
  font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800;
`,_=a.p`
  color: var(--text-secondary); margin: 0; font-size: 1rem;
`,v=a.div`
  padding: 4rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem;
  svg { opacity: 0.5; }
`,b=a.span`
  font-size: 0.9rem;
  color: var(--text-tertiary);
`,E=a.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
`,I=a.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1rem;
`,L=a.span`
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.95rem;
`,$=a.div`
    display: flex; flex-direction: column; gap: 2rem;
`,B=a.div`
    display: flex; flex-direction: column; gap: 1rem;
`,F=a.h3`
    font-size: 1.25rem; color: var(--accent-primary); margin: 0; padding-left: 0.5rem; border-left: 4px solid var(--accent-primary); line-height: 1;
`,P=a.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;
`,w=a.div`
    background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; position: relative; transition: all 0.2s;
    &:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`,H=a.div`
    background: var(--bg-tertiary); color: var(--text-secondary); padding: 0.75rem 1rem; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color);
`,U=a.div`
    padding: 1.25rem;
`,Y=a.h4`
    font-size: 1.2rem; color: var(--accent-primary); margin: 0 0 1rem 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
`,O=a.div`
    display: flex; flex-direction: column; gap: 0.5rem;
`,u=a.div`
    display: flex; align-items: center; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;
    &:last-child { margin-bottom: 0; }
    svg { color: var(--accent-primary); opacity: 0.8; }
`,G=a.div`
    position: absolute; bottom: 0; left: 0; height: 3px; width: 0; background: var(--accent-primary); transition: width 0.2s;
    ${w}:hover & { width: 100%; }
`;export{K as default};
