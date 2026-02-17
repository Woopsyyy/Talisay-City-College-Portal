import{r as i,j as e,P as K,X as Q,o as u,d as a,R as Z}from"./index-G8dAaOpg.js";import{T as V}from"./Toast-CfYD9-5b.js";import{D as ee}from"./DeleteModal-BwSZan_D.js";import{B as _}from"./building-2-BmFCJ1tq.js";import{C as I}from"./circle-plus-BofdGSWu.js";import{T as q}from"./trash-2-D6PG7ToH.js";import{M as re}from"./map-pin-ENw4PO3o.js";import{T as se}from"./triangle-alert-DHUh_5GK.js";import{S as H}from"./save-ozLe3sfg.js";import{C as oe}from"./circle-check-big-BkBU9BDV.js";import"./circle-alert-QpU8jh7N.js";const ze=()=>{const[g,o]=i.useState(!0),[h,A]=i.useState({show:!1,message:"",type:"success"}),[N,c]=i.useState([]),[C,p]=i.useState([]),[S,y]=i.useState([]),[x,m]=i.useState({isOpen:!1,type:null,id:null,name:""}),[z,f]=i.useState(!1),[d,j]=i.useState({name:"",floors:4,rooms_per_floor:4}),[R,t]=i.useState({year:"",section:"",building:"",floor:1,room:""}),l=(r,s="success")=>{A({show:!0,message:r,type:s})},v=async(r=!1)=>{try{o(!0);const[s,n,w]=await Promise.all([u.getBuildings(r?{refresh:1}:void 0).catch(()=>[]),u.getSections().catch(()=>[]),u.getSectionAssignments().catch(()=>[])]),k=Array.isArray(s)?s.map(b=>typeof b=="string"?{name:b,floors:4,rooms_per_floor:4}:b):[];c(k),p(Array.isArray(n)?n:[]),y(Array.isArray(w)?w:[])}catch(s){console.error("Error loading facilities data:",s),l("Failed to load facilities data.","error")}finally{o(!1)}};if(i.useEffect(()=>{v()},[]),g)return e.jsx(K,{variant:"table",columns:7});const T=async r=>{r.preventDefault();try{const s=parseInt(d.floors,10),n=parseInt(d.rooms_per_floor,10);if(isNaN(s)||s<1||isNaN(n)||n<1){l("Please enter valid floor and room counts.","error");return}o(!0),await u.createBuilding({building_name:d.name,num_floors:s,rooms_per_floor:n}),await v(!0),j({name:"",floors:4,rooms_per_floor:4}),f(!1),l("Building added successfully")}catch(s){l(`Error creating building: ${s.message}`,"error"),String(s.message||"").toLowerCase().includes("already")&&await v(!0)}finally{o(!1)}},U=r=>{m({isOpen:!0,type:"building",id:r,name:`Building ${r}`})},W=r=>{m({isOpen:!0,type:"assignment",id:r,name:"this section assignment"})},G=async()=>{const{type:r,id:s}=x;if(!(!r||!s))try{o(!0),r==="building"?(await u.deleteBuilding(s),l("Building deleted")):r==="assignment"&&(await u.deleteSectionAssignment(s),l("Assignment removed")),await v(),E()}catch(n){l(`Error deleting ${r}: ${n.message}`,"error")}finally{o(!1)}},E=()=>{m({isOpen:!1,type:null,id:null,name:""})},X=async(r,s,n,w,k,b)=>{if(!w||!b){l("Please fill in building and room","error");return}try{if(o(!0),r){const B={building:w,floor:parseInt(k),room:b};await u.updateSectionAssignment(r,B)}else{const B={year:s,section:n,building:w,floor:parseInt(k),room:b};await u.createSectionAssignment(B)}await v(),l("Assignment updated")}catch(B){l(`Error saving assignment: ${B.message}`,"error")}finally{o(!1)}},J=(r,s)=>S.find(n=>(n.year===r||n.year===parseInt(r))&&n.section===s);return e.jsxs(ae,{children:[e.jsx(ne,{children:e.jsxs("div",{children:[e.jsxs("h2",{children:[e.jsx(_,{size:32})," Facilities Management"]}),e.jsx("p",{children:"Manage campus buildings, floors, and room assignments."})]})}),h.show&&e.jsx(V,{message:h.message,type:h.type,onClose:()=>A(r=>({...r,show:!1}))}),e.jsx("div",{className:"row g-4 mb-4",children:e.jsx("div",{className:"col-12",children:e.jsxs($,{children:[e.jsxs(L,{children:[e.jsxs("div",{className:"d-flex align-items-center gap-2",children:[e.jsx(_,{size:20}),e.jsx("h3",{children:"Campus Buildings"})]}),e.jsxs(O,{onClick:()=>f(!0),children:[e.jsx(I,{size:18})," Add New Building"]})]}),e.jsx(ie,{children:N.length===0?e.jsx("div",{className:"text-center py-5 text-secondary",children:"No buildings configured."}):e.jsx(le,{children:N.map((r,s)=>e.jsxs(de,{children:[e.jsx(ce,{children:e.jsx(_,{size:24})}),e.jsxs("div",{className:"text-center my-3 flex-grow-1",children:[e.jsx("h4",{className:"m-0 text-primary fw-bold mb-1",children:r.name}),e.jsxs("small",{className:"text-secondary d-block",children:[r.floors," Floors"]}),e.jsxs("small",{className:"text-secondary d-block",children:[r.rooms_per_floor," Rooms/Floor"]})]}),e.jsxs(P,{className:"w-100 justify-content-center",onClick:()=>U(r.name),children:[e.jsx(q,{size:16})," Delete"]})]},s))})})]})})}),e.jsx("div",{className:"row g-4",children:e.jsx("div",{className:"col-12",children:e.jsxs($,{children:[e.jsxs(L,{children:[e.jsx(re,{size:20}),e.jsx("h3",{children:"Section Room Assignments"})]}),C.length===0?e.jsxs("div",{className:"p-5 text-center",children:[e.jsx(se,{size:32,className:"text-warning mb-2"}),e.jsx("p",{className:"text-secondary",children:"No sections found. Please create sections in the Sections view first."})]}):e.jsx("div",{className:"table-responsive",children:e.jsxs(me,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Year Level"}),e.jsx("th",{children:"Section Name"}),e.jsx("th",{children:"Status"}),e.jsx("th",{style:{width:"100px"},children:"Building"}),e.jsx("th",{style:{width:"80px"},children:"Floor"}),e.jsx("th",{style:{width:"100px"},children:"Room"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:C.map(r=>{const s=r.grade_level||r.year,n=r.section_name||r.name;return e.jsx(te,{section:{...r,year:s,name:n},existing:J(s,n),buildings:N,onUpdate:X,onDelete:W},`${s}-${n}`)})})]})})]})})}),e.jsx(ee,{isOpen:x.isOpen,onClose:E,onConfirm:G,title:"Confirm Deletion",message:`Are you sure you want to delete ${x.name}?`,itemName:x.name,isLoading:g}),z&&e.jsx(pe,{onClick:()=>f(!1),children:e.jsxs(xe,{onClick:r=>r.stopPropagation(),children:[e.jsxs(ge,{children:[e.jsxs("h3",{children:[e.jsx(I,{size:20})," Add New Building"]}),e.jsx(fe,{onClick:()=>f(!1),children:e.jsx(Q,{size:20})})]}),e.jsxs("form",{onSubmit:T,children:[e.jsx(ue,{children:e.jsxs("div",{className:"row g-3",children:[e.jsx("div",{className:"col-12",children:e.jsxs(M,{children:[e.jsx("label",{children:"Building Name"}),e.jsx(F,{type:"text",placeholder:"e.g. Science Wing",required:!0,value:d.name,onChange:r=>j({...d,name:r.target.value})})]})}),e.jsx("div",{className:"col-6",children:e.jsxs(M,{children:[e.jsx("label",{children:"Total Floors"}),e.jsx(F,{type:"number",min:"1",required:!0,value:d.floors,onChange:r=>j({...d,floors:r.target.value})})]})}),e.jsx("div",{className:"col-6",children:e.jsxs(M,{children:[e.jsx("label",{children:"Rooms / Floor"}),e.jsx(F,{type:"number",min:"1",required:!0,value:d.rooms_per_floor,onChange:r=>j({...d,rooms_per_floor:r.target.value})})]})})]})}),e.jsxs(he,{children:[e.jsx(P,{type:"button",onClick:()=>f(!1),children:"Cancel"}),e.jsxs(O,{type:"submit",disabled:g,children:[e.jsx(H,{size:18})," Create Building"]})]})]})]})})]})},te=({section:g,existing:o,buildings:h,onUpdate:A,onDelete:N})=>{const[c,C]=i.useState(o?.building||""),[p,S]=i.useState(o?.floor||1),[y,x]=i.useState(o?.room||"");Z.useEffect(()=>{o&&(C(o.building||""),S(o.floor||1),x(o.room||""))},[o]);const m=i.useMemo(()=>h.find(t=>t.name===c),[h,c]),z=i.useMemo(()=>m?Array.from({length:m.floors||4},(t,l)=>l+1):[],[m]),f=i.useMemo(()=>m&&p?Array.from({length:m.rooms_per_floor||4},(t,l)=>(parseInt(p)*100+(l+1)).toString()):[],[m,p]),d=t=>{C(t.target.value),S(1),x("")},j=t=>{S(t.target.value),x("")},R=o?c!==o.building||p!=o.floor||y!==o.room:c!==""||y!=="";return e.jsxs("tr",{children:[e.jsxs("td",{style:{fontWeight:600},children:[g.year," Year"]}),e.jsx("td",{style:{fontWeight:600,color:"var(--accent-primary)"},children:g.name}),e.jsx("td",{children:o?e.jsxs(Y,{className:"success",children:[e.jsx(oe,{size:12})," Assigned"]}):e.jsx(Y,{className:"warning",children:"Pending"})}),e.jsx("td",{children:e.jsxs(D,{className:"sm",value:c,onChange:d,children:[e.jsx("option",{value:"",children:"Select Building"}),h.map(t=>e.jsx("option",{value:t.name,children:t.name},t.name))]})}),e.jsx("td",{children:e.jsx(D,{className:"sm",value:p,onChange:j,disabled:!c,children:z.map(t=>e.jsx("option",{value:t,children:t},t))})}),e.jsx("td",{children:e.jsxs(D,{className:"sm",value:y,onChange:t=>x(t.target.value),disabled:!c||!p,children:[e.jsx("option",{value:"",children:"Select Room"}),f.map(t=>e.jsx("option",{value:t,children:t},t))]})}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("div",{className:"d-flex justify-content-end gap-2",children:[e.jsx(O,{className:"sm",disabled:!R,onClick:()=>A(o?.id,g.year,g.name,c,p,y),children:o?e.jsx(H,{size:14}):e.jsx(I,{size:14})}),o&&e.jsx(P,{className:"sm",onClick:()=>N(o.id),children:e.jsx(q,{size:14})})]})})]})},ae=a.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`,ne=a.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    svg { color: var(--accent-primary); }
  }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`,$=a.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
`,L=a.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between; 
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,ie=a.div`
   padding: 1.5rem;
   color: var(--text-secondary);
`,M=a.div`
  margin-bottom: 1rem;
  label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
  }
`,F=a.input`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
    
    &.sm {
        padding: 6px 10px;
        font-size: 0.85rem;
        height: 36px;
    }
`,D=a.select`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    cursor: pointer;
    &:focus { border-color: var(--accent-primary); outline: none; }
    
    &.sm {
        padding: 6px 10px;
        font-size: 0.85rem;
        height: 36px;
    }
`,O=a.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  &.sm {
      padding: 6px 12px;
      border-radius: 6px;
      height: 36px;
  }
`,P=a.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: 6px;
    color: #ef4444; 
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    &:hover { background: rgba(239, 68, 68, 0.1); border-color: #fecaca; }
    
    &.sm {
        height: 36px;
    }
`,le=a.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    @media (max-width: 1400px) { grid-template-columns: repeat(4, 1fr); }
    @media (max-width: 1100px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 500px) { grid-template-columns: 1fr; }
`,de=a.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover { 
        border-color: var(--accent-primary); 
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
`,ce=a.div`
    width: 60px; height: 60px;
    border-radius: 16px;
    background: var(--bg-tertiary);
    color: var(--accent-primary);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
`,me=a.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    th {
        text-align: left;
        padding: 1rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 12px 1rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
    }
    tr:last-child td { border-bottom: none; }
`,Y=a.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    &.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    &.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
`,pe=a.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
`,xe=a.div`
    background: var(--bg-secondary);
    width: 90%; max-width: 550px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`,ge=a.div`
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-tertiary);
    border-radius: 16px 16px 0 0;
    h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
`,ue=a.div`
    padding: 2rem;
`,he=a.div`
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: flex-end; gap: 1rem;
    background: var(--bg-tertiary);
    border-radius: 0 0 16px 16px;
`,fe=a.button`
    background: transparent; border: none; color: var(--text-secondary); cursor: pointer;
    &:hover { color: var(--text-primary); }
`;export{ze as default};
