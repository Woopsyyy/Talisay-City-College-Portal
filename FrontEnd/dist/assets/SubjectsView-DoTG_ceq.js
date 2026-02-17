import{c as R,r as a,o as v,j as e,P as re,X as se,d as t}from"./index-G8dAaOpg.js";import{C as f,Y,S as H}from"./constants-CkFOpdC7.js";import{T as te}from"./Toast-CfYD9-5b.js";import{D as oe}from"./DeleteModal-BwSZan_D.js";import{u as ae}from"./useDebouncedValue-hUueIzrg.js";import{B as ne,G as le}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{C as $}from"./circle-plus-BofdGSWu.js";import{F as ie}from"./funnel-FWZ3B0qw.js";import{P as ce}from"./pen-tmjuzZCM.js";import{T as de}from"./trash-2-D6PG7ToH.js";import{C as ue}from"./clock-DTlNUsPA.js";import{S as me}from"./save-ozLe3sfg.js";import"./circle-check-big-BkBU9BDV.js";import"./circle-alert-QpU8jh7N.js";import"./triangle-alert-DHUh_5GK.js";const he=[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]],pe=R("book",he);const xe=[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]],je=R("hash",xe),M=i=>{const c=parseInt(i),S=["th","st","nd","rd","th","th","th","th","th","th"];return c%100>=11&&c%100<=13?c+"th":c+(S[c%10]||"th")},Je=()=>{const[i,c]=a.useState([]),[S,A]=a.useState(!0),[w,m]=a.useState({show:!1,message:"",type:"success"}),[G,C]=a.useState(!1),[n,k]=a.useState(null),[U,z]=a.useState(!1),[j,E]=a.useState(null),[l,N]=a.useState({subject_code:"",subject_name:"",units:"",course:"",major:"",year_level:"",semester:"All Semesters"}),[s,J]=a.useState({course:"",major:"",year:"",semester:""}),[O,V]=a.useState(""),T=ae(O,200);a.useEffect(()=>{D()},[]),a.useEffect(()=>{N(n?{subject_code:n.subject_code||"",subject_name:n.subject_name||"",units:n.units||"",course:n.course||"",major:n.major||"",year_level:n.year_level||"",semester:n.semester||"All Semesters"}:{subject_code:"",subject_name:"",units:"",course:"",major:"",year_level:"",semester:"All Semesters"})},[n]);const D=async()=>{try{A(!0);const r=await v.getSubjects();c(Array.isArray(r)?r:[])}catch(r){console.error("Error fetching subjects:",r),c([]),m({show:!0,message:"Failed to load subjects.",type:"error"})}finally{A(!1)}},h=r=>{const{name:o,value:d}=r.target;N(x=>{const P={...x,[o]:d};return o==="course"&&(P.major=""),P})},b=r=>{const{name:o,value:d}=r.target;J(x=>({...x,[o]:d}))},W=()=>{k(null),C(!0)},X=r=>{k(r),C(!0)},g=()=>{C(!1),k(null)},K=r=>{E(r),z(!0)},I=()=>{z(!1),E(null)},Q=async()=>{if(j)try{await v.deleteSubject(j.id),c(r=>r.filter(o=>o.id!==j.id)),m({show:!0,message:"Subject deleted successfully",type:"success"}),I()}catch(r){m({show:!0,message:`Error deleting subject: ${r.message}`,type:"error"})}},Z=async r=>{r.preventDefault();try{const o={...l,units:parseFloat(l.units)||0,year_level:parseInt(l.year_level)};n?(await v.updateSubject(n.id,o),m({show:!0,message:"Subject updated successfully!",type:"success"})):(await v.createSubject(o),m({show:!0,message:"Subject created successfully!",type:"success"})),g(),D()}catch(o){m({show:!0,message:`Error ${n?"updating":"creating"} subject: ${o.message}`,type:"error"})}},_=a.useMemo(()=>i.filter(r=>{const o=T.trim().toLowerCase();if(o){const d=(r.subject_code||"").toLowerCase(),x=(r.subject_name||r.title||"").toLowerCase();if(!d.includes(o)&&!x.includes(o))return!1}return!(s.course&&r.course!==s.course||s.major&&r.major!==s.major||s.year&&parseInt(r.year_level)!==parseInt(s.year)||s.semester&&r.semester!==s.semester)}),[i,T,s.course,s.major,s.year,s.semester]),F=r=>!r||r==="All Courses"?[]:f[r]||[],B=a.useMemo(()=>{const r=[];return Object.values(f).forEach(o=>{o.forEach(d=>{r.includes(d)||r.push(d)})}),r},[]),L=a.useMemo(()=>F(l.course),[l.course]),ee=a.useMemo(()=>s.course?F(s.course):B,[s.course,B]);return e.jsxs(be,{children:[e.jsxs(ge,{children:[e.jsxs("div",{children:[e.jsxs("h2",{children:[e.jsx(ne,{size:32})," Subject Catalog"]}),e.jsx("p",{children:"Centralize subject codes, titles, and units to avoid typos when building study loads."})]}),e.jsxs(Se,{onClick:W,children:[e.jsx($,{size:20})," Add Subject"]})]}),w.show&&e.jsx(te,{message:w.message,type:w.type,onClose:()=>m(r=>({...r,show:!1}))}),e.jsxs(ve,{children:[e.jsx(fe,{children:e.jsxs("div",{className:"d-flex align-items-center gap-2",children:[e.jsx(ie,{size:20}),e.jsxs("h3",{children:["Subject List ",e.jsxs("span",{className:"text-secondary opacity-75",children:["(",_.length,")"]})]})]})}),e.jsx("div",{className:"p-3 border-bottom border-light",children:e.jsxs("div",{className:"row g-2",children:[e.jsx("div",{className:"col-12 col-md-4",children:e.jsx(y,{placeholder:"Search code or title...",value:O,onChange:r=>V(r.target.value)})}),e.jsx("div",{className:"col-12 col-md-2",children:e.jsxs(u,{name:"course",value:s.course,onChange:b,className:"sm",children:[e.jsx("option",{value:"",children:"All Courses"}),Object.keys(f).map(r=>e.jsx("option",{value:r,children:r},r))]})}),e.jsx("div",{className:"col-12 col-md-2",children:e.jsxs(u,{name:"major",value:s.major,onChange:b,className:"sm",children:[e.jsx("option",{value:"",children:"All Majors"}),ee.map(r=>e.jsx("option",{value:r,children:r},r))]})}),e.jsx("div",{className:"col-12 col-md-2",children:e.jsxs(u,{name:"year",value:s.year,onChange:b,className:"sm",children:[e.jsx("option",{value:"",children:"All Years"}),Y.map(r=>e.jsxs("option",{value:r,children:[M(r)," Year"]},r))]})}),e.jsx("div",{className:"col-12 col-md-2",children:e.jsxs(u,{name:"semester",value:s.semester,onChange:b,className:"sm",children:[e.jsx("option",{value:"",children:"All Semesters"}),H.map(r=>e.jsx("option",{value:r,children:r},r))]})})]})}),e.jsx(ye,{className:"p-0",children:e.jsx("div",{className:"table-responsive",style:{maxHeight:"600px",overflowY:"auto"},children:e.jsxs(ke,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Code"}),e.jsx("th",{children:"Title"}),e.jsx("th",{children:"Units"}),e.jsx("th",{children:"Details"}),e.jsx("th",{className:"text-end",children:"Actions"})]})}),e.jsx("tbody",{children:S?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",children:e.jsx(re,{variant:"table",compact:!0,columns:5})})}):_.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"text-center py-5 text-secondary",children:"No subjects found matching your filters."})}):_.map(r=>e.jsxs("tr",{children:[e.jsx("td",{style:{fontWeight:700,whiteSpace:"nowrap"},children:r.subject_code}),e.jsx("td",{children:r.subject_name}),e.jsx("td",{style:{fontFamily:"monospace"},children:r.units}),e.jsx("td",{children:e.jsxs("div",{className:"text-secondary small",children:[e.jsxs("div",{children:[r.course," ",r.major&&`(${r.major})`]}),e.jsxs("div",{children:[M(r.year_level)," Year • ",r.semester==="First Semester"?"1st":r.semester==="Second Semester"?"2nd":"All"," Sem"]})]})}),e.jsx("td",{className:"text-end",children:e.jsxs("div",{className:"d-flex gap-2 justify-content-end",children:[e.jsx(q,{onClick:()=>X(r),children:e.jsx(ce,{size:16})}),e.jsx(q,{danger:!0,onClick:()=>K(r),children:e.jsx(de,{size:16})})]})})]},r.id))})]})})})]}),G&&e.jsx(Ne,{onClick:g,children:e.jsxs(_e,{onClick:r=>r.stopPropagation(),children:[e.jsxs(Me,{children:[e.jsx("h3",{children:n?"Edit Subject":"Add New Subject"}),e.jsx(Ae,{onClick:g,children:e.jsx(se,{size:24})})]}),e.jsxs("form",{onSubmit:Z,children:[e.jsxs(ze,{children:[e.jsxs(p,{children:[e.jsxs("label",{children:[e.jsx(je,{size:16})," Subject Code"]}),e.jsx(y,{name:"subject_code",placeholder:"e.g. IT101",value:l.subject_code,onChange:h,required:!0})]}),e.jsxs(p,{children:[e.jsxs("label",{children:[e.jsx(pe,{size:16})," Descriptive Title"]}),e.jsx(y,{name:"subject_name",placeholder:"Introduction to Computing",value:l.subject_name,onChange:h,required:!0})]}),e.jsxs("div",{className:"row g-3",children:[e.jsx("div",{className:"col-12 col-md-4",children:e.jsxs(p,{children:[e.jsxs("label",{children:[e.jsx(ue,{size:16})," Units"]}),e.jsx(y,{name:"units",type:"number",min:"0",step:"0.5",value:l.units,onChange:h,required:!0})]})}),e.jsx("div",{className:"col-12 col-md-8",children:e.jsxs(p,{children:[e.jsxs("label",{children:[e.jsx(le,{size:16})," Course"]}),e.jsxs(u,{name:"course",value:l.course,onChange:h,required:!0,children:[e.jsx("option",{value:"",children:"Select course..."}),e.jsx("option",{value:"All Courses",children:"All Courses"}),Object.keys(f).map(r=>e.jsx("option",{value:r,children:r},r))]})]})})]}),e.jsxs("div",{className:"row g-3",children:[e.jsx("div",{className:"col-12 col-md-6",children:e.jsxs(p,{children:[e.jsx("label",{children:"Major"}),e.jsxs(u,{name:"major",value:l.major,onChange:h,disabled:!l.course||L.length===0,children:[e.jsx("option",{value:"",children:"Select major..."}),L.map(r=>e.jsx("option",{value:r,children:r},r))]})]})}),e.jsx("div",{className:"col-6 col-md-3",children:e.jsxs(p,{children:[e.jsx("label",{children:"Year"}),e.jsxs(u,{name:"year_level",value:l.year_level,onChange:h,required:!0,children:[e.jsx("option",{value:"",children:"Select..."}),Y.map(r=>e.jsx("option",{value:r,children:M(r)},r))]})]})}),e.jsx("div",{className:"col-6 col-md-3",children:e.jsxs(p,{children:[e.jsx("label",{children:"Sem"}),e.jsxs(u,{name:"semester",value:l.semester,onChange:h,required:!0,children:[e.jsx("option",{value:"All Semesters",children:"All"}),H.map(r=>e.jsx("option",{value:r,children:r==="First Semester"?"1st":r==="Second Semester"?"2nd":r},r))]})]})})]})]}),e.jsxs(Ee,{children:[e.jsx(Ce,{type:"button",onClick:g,className:"justify-content-center",children:"Cancel"}),e.jsxs(we,{type:"submit",className:"justify-content-center",children:[n?e.jsx(me,{size:18}):e.jsx($,{size:18}),n?"Save Changes":"Add Subject"]})]})]})]})}),e.jsx(oe,{isOpen:U,onClose:I,onConfirm:Q,title:"Confirm Subject Deletion",message:"Are you sure you want to delete this subject? This might affect existing study loads.",itemName:j?.subject_code,isLoading:!1})]})},be=t.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`,ge=t.div`
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
`,ve=t.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
`,fe=t.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,ye=t.div`
   padding: 1.5rem;
`,p=t.div`
  margin-bottom: 1.25rem;
  label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
  }
`,y=t.input`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
`,u=t.select`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
    
    &.sm {
        padding: 8px 12px;
        font-size: 0.85rem;
    }
`,Se=t.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);

  &:hover {
    background: var(--accent-secondary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
`,we=t.button`
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
`,Ce=t.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    color: var(--text-primary);
    cursor: pointer;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    &:hover { background: var(--bg-tertiary); }
`,ke=t.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    thead th {
        position: sticky;
        top: 0;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-weight: 600;
        padding: 1rem 1.5rem;
        border-bottom: 2px solid var(--border-color);
        z-index: 10;
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
`,q=t.button`
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: ${i=>i.danger?"#ef4444":"var(--accent-primary)"};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { 
        background: ${i=>i.danger?"rgba(239, 68, 68, 0.1)":"rgba(59, 130, 246, 0.1)"};
        border-color: ${i=>i.danger?"#fecaca":"#bae6fd"};
    }
`,Ne=t.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`,_e=t.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 700px;
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
`,Me=t.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
`,Ae=t.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-primary); }
`,ze=t.div` padding: 2rem; `,Ee=t.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;export{Je as default};
