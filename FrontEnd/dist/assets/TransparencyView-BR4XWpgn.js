import{r as a,j as e,P as Y,X as Z,T as j,d as t}from"./index-G8dAaOpg.js";import{T as ee}from"./Toast-CfYD9-5b.js";import{D as re}from"./DeleteModal-BwSZan_D.js";import{C as te}from"./circle-alert-QpU8jh7N.js";import{B as oe}from"./building-2-BmFCJ1tq.js";import{P as se}from"./plus-C9Cx14sX.js";import{a as ne}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{C as M}from"./circle-check-big-BkBU9BDV.js";import{D as F,T as L,P as ae}from"./target-D4UFUtOT.js";import{C as ie}from"./calendar-CG0mXhiR.js";import{P as de}from"./pen-tmjuzZCM.js";import{T as le}from"./trash-2-D6PG7ToH.js";import{S as ce}from"./save-ozLe3sfg.js";import{C as pe}from"./clock-DTlNUsPA.js";import"./triangle-alert-DHUh_5GK.js";const Ze=({isAdmin:s=!1})=>{const[i,G]=a.useState([]),[B,l]=a.useState(!0),[T,R]=a.useState(null),[U,c]=a.useState(!1),[u,b]=a.useState(null),[f,$]=a.useState({show:!1,message:"",type:"success"}),[N,v]=a.useState({isOpen:!1,id:null}),[d,g]=a.useState({name:"",description:"",budget:"",status:"Planned",start_date:""}),y=async()=>{try{l(!0);const r=await j.getProjects();G(Array.isArray(r)?r:[])}catch(r){console.error("Load transparency error:",r),R(r.message||"Failed to load projects")}finally{l(!1)}};a.useEffect(()=>{y()},[]);const p=(r,o="success")=>{$({show:!0,message:r,type:o})},x=r=>{const{name:o,value:n}=r.target;g(h=>({...h,[o]:n}))},X=async r=>{r.preventDefault();try{l(!0),u?(await j.updateProject(u.id,d),p("Project updated successfully!")):(await j.createProject(d),p("Project created successfully!")),c(!1),b(null),g({name:"",description:"",budget:"",status:"Planned",start_date:""}),y()}catch(o){p(o.message||"Operation failed","error")}finally{l(!1)}},J=r=>{b(r),g({name:r.name||"",description:r.description||"",budget:String(r.budget||"").replace(/[₱,]/g,""),status:r.status||"Planned",start_date:r.start_date||""}),c(!0)},K=async()=>{try{l(!0),await j.deleteProject(N.id),p("Project deleted"),v({isOpen:!1,id:null}),y()}catch(r){p(r.message||"Failed to delete project","error")}finally{l(!1)}},O=r=>{if(!r)return"N/A";const o=String(r).replace(/[₱,]/g,""),n=parseFloat(o);return isNaN(n)?r:"₱"+n.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})},Q=r=>{if(!r)return"N/A";try{return new Date(r).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return r}},W=r=>{const o=(r||"").toLowerCase();return o==="completed"?{icon:M,label:"Completed",color:"#10b981",bg:"rgba(16, 185, 129, 0.1)"}:o==="ongoing"?{icon:pe,label:"Ongoing",color:"#3b82f6",bg:"rgba(59, 130, 246, 0.1)"}:o==="paused"?{icon:ae,label:"Paused",color:"#f59e0b",bg:"rgba(245, 158, 11, 0.1)"}:{icon:L,label:"Planned",color:"#8b5cf6",bg:"rgba(139, 92, 246, 0.1)"}},C=a.useMemo(()=>({totalBudget:i.reduce((o,n)=>{const h=parseFloat(String(n.budget||"0").replace(/[₱,]/g,""));return o+(isNaN(h)?0:h)},0),completed:i.filter(o=>(o.status||"").toLowerCase()==="completed").length,total:i.length}),[i]);return B&&i.length===0?e.jsx(Fe,{children:e.jsx(Y,{variant:"cards",count:4})}):T&&i.length===0?e.jsxs(Le,{children:[e.jsx(te,{size:48}),e.jsx("h3",{children:"Failed to Load Projects"}),e.jsx("p",{children:T})]}):e.jsxs(xe,{children:[f.show&&e.jsx(ee,{...f,onClose:()=>$({...f,show:!1})}),e.jsxs(me,{children:[e.jsxs(ue,{children:[e.jsx(oe,{size:32}),e.jsxs("div",{children:[e.jsx("h2",{children:s?"Project":"Campus Transparency"}),e.jsx("p",{children:s?"Manage and track departmental projects":"View ongoing and completed campus projects with budget allocation"})]})]}),s&&e.jsxs(ge,{onClick:()=>{b(null),g({name:"",description:"",budget:"",status:"Planned",start_date:""}),c(!0)},children:[e.jsx(se,{size:20})," New Project"]})]}),e.jsxs(he,{children:[e.jsxs(P,{$color:"#3b82f6",children:[e.jsx(w,{children:e.jsx(ne,{size:24})}),e.jsxs(S,{children:[e.jsx(k,{children:"Total Projects"}),e.jsx(D,{children:C.total})]})]}),e.jsxs(P,{$color:"#10b981",children:[e.jsx(w,{children:e.jsx(M,{size:24})}),e.jsxs(S,{children:[e.jsx(k,{children:"Completed"}),e.jsx(D,{children:C.completed})]})]}),e.jsxs(P,{$color:"#8b5cf6",children:[e.jsx(w,{children:e.jsx(F,{size:24})}),e.jsxs(S,{children:[e.jsx(k,{children:"Total Budget"}),e.jsx(D,{children:O(C.totalBudget)})]})]})]}),i.length===0?e.jsxs(Ee,{children:[e.jsx(L,{size:64}),e.jsx("h3",{children:"No Projects Available"}),e.jsx("p",{children:"There are currently no campus projects to display."})]}):e.jsx(je,{children:i.map((r,o)=>{const n=W(r.status);return e.jsxs(q,{children:[e.jsxs(be,{children:[e.jsx(fe,{children:r.name}),e.jsxs(ve,{$color:n.color,$bg:n.bg,children:[e.jsx(n.icon,{size:16}),e.jsx("span",{children:n.label})]})]}),e.jsx(ye,{children:r.description}),e.jsxs(Ce,{children:[e.jsxs(E,{children:[e.jsx(A,{children:e.jsx(F,{size:18})}),e.jsxs(I,{children:[e.jsx(_,{children:"Budget"}),e.jsx(H,{children:O(r.budget)})]})]}),e.jsxs(E,{children:[e.jsx(A,{children:e.jsx(ie,{size:18})}),e.jsxs(I,{children:[e.jsx(_,{children:"Start Date"}),e.jsx(H,{children:Q(r.start_date)})]})]})]}),s&&e.jsxs(Pe,{children:[e.jsx(V,{onClick:()=>J(r),$color:"#3b82f6",children:e.jsx(de,{size:16})}),e.jsx(V,{onClick:()=>v({isOpen:!0,id:r.id}),$color:"#ef4444",children:e.jsx(le,{size:16})})]}),e.jsx(we,{$color:n.color})]},r.id||o)})}),U&&e.jsx(Se,{onClick:()=>c(!1),children:e.jsxs(ke,{onClick:r=>r.stopPropagation(),children:[e.jsxs(De,{children:[e.jsx("h3",{children:u?"Edit Project":"Add Project"}),e.jsx(Me,{onClick:()=>c(!1),children:e.jsx(Z,{size:24})})]}),e.jsxs("form",{onSubmit:X,children:[e.jsxs(ze,{children:[e.jsxs("div",{className:"mb-3",children:[e.jsx(m,{children:"Project Name"}),e.jsx(z,{name:"name",value:d.name,onChange:x,required:!0})]}),e.jsxs("div",{className:"mb-3",children:[e.jsx(m,{children:"Description"}),e.jsx(Te,{name:"description",value:d.description,onChange:x,rows:"3"})]}),e.jsxs("div",{className:"row g-3",children:[e.jsxs("div",{className:"col-md-6",children:[e.jsx(m,{children:"Budget (₱)"}),e.jsx(z,{type:"number",name:"budget",value:d.budget,onChange:x,required:!0})]}),e.jsxs("div",{className:"col-md-6",children:[e.jsx(m,{children:"Status"}),e.jsxs($e,{name:"status",value:d.status,onChange:x,children:[e.jsx("option",{value:"Planned",children:"Planned"}),e.jsx("option",{value:"Ongoing",children:"Ongoing"}),e.jsx("option",{value:"Paused",children:"Paused"}),e.jsx("option",{value:"Completed",children:"Completed"})]})]}),e.jsxs("div",{className:"col-12",children:[e.jsx(m,{children:"Start Date"}),e.jsx(z,{type:"date",name:"start_date",value:d.start_date,onChange:x,required:!0})]})]})]}),e.jsxs(Be,{children:[e.jsx(Oe,{type:"button",onClick:()=>c(!1),children:"Cancel"}),e.jsxs(Ne,{type:"submit",disabled:B,children:[e.jsx(ce,{size:18})," ",u?"Update":"Create"]})]})]})]})}),e.jsx(re,{isOpen:N.isOpen,onClose:()=>v({isOpen:!1,id:null}),onConfirm:K,title:"Delete Project",message:"Remove this project from the transparency board?"})]})},xe=t.div`
  animation: fadeIn 0.3s;
  max-width: 1400px;
  margin: 0 auto;
`,me=t.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`,ue=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  h2 {
    margin: 0;
  }
  p {
    color: var(--text-secondary);
    margin: 0;
  }
  svg {
    color: var(--accent-primary);
  }
`,ge=t.button`
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`,he=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`,P=t.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`,w=t.div`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
`,S=t.div`
  flex: 1;
`,k=t.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`,D=t.div`
  font-size: 1.5rem;
  font-weight: 700;
`,je=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
`,q=t.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
`,be=t.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`,fe=t.h3`
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.4;
`,ve=t.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${s=>s.$bg};
  color: ${s=>s.$color};
  font-size: 0.8rem;
  font-weight: 600;
`,ye=t.p`
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.25rem;
`,Ce=t.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,E=t.div`
  display: flex;
  align-items: center;
  gap: 12px;
`,A=t.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
`,I=t.div`
  flex: 1;
`,_=t.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
`,H=t.div`
  font-size: 1rem;
  font-weight: 600;
`,Pe=t.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: none;
  gap: 8px;
  ${q}:hover & {
    display: flex;
  }
`,V=t.button`
  background: white;
  border: 1px solid var(--border-color);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${s=>s.$color};
  cursor: pointer;
  &:hover {
    background: var(--bg-tertiary);
  }
`,we=t.div`
  height: 4px;
  background: linear-gradient(90deg, ${s=>s.$color}, transparent);
  margin: 1.25rem -1.5rem -1.5rem -1.5rem;
`,Se=t.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`,ke=t.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  overflow: hidden;
`,De=t.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
`,ze=t.div`
  padding: 1.5rem;
`,Be=t.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`,m=t.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
`,z=t.input`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`,Te=t.textarea`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`,$e=t.select`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`,Ne=t.button`
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`,Oe=t.button`
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
`,Me=t.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
`,Fe=t.div`
  text-align: center;
  padding: 4rem;
`,Le=t.div`
  text-align: center;
  padding: 4rem;
`,Ee=t.div`
  text-align: center;
  padding: 4rem;
`;export{Ze as default};
