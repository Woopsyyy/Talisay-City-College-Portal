import{c as P,r as n,o as u,j as e,P as q,X as H,d as a}from"./index-G8dAaOpg.js";import{Y as V,C as O}from"./constants-CkFOpdC7.js";import{T as X}from"./Toast-CfYD9-5b.js";import{D as J}from"./DeleteModal-BwSZan_D.js";import{L as E}from"./layers-CqdCGdQ0.js";import{C as K}from"./circle-plus-BofdGSWu.js";import{C as Q}from"./circle-alert-QpU8jh7N.js";import{C as N}from"./calendar-CG0mXhiR.js";import{B as I}from"./building-2-BmFCJ1tq.js";import{B}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{P as W}from"./pen-tmjuzZCM.js";import{T as Z}from"./trash-2-D6PG7ToH.js";import{S as ee}from"./save-ozLe3sfg.js";import"./circle-check-big-BkBU9BDV.js";import"./triangle-alert-DHUh_5GK.js";const re=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],oe=P("circle-x",re);const ae=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],te=P("layout-grid",ae),Pe=()=>{const[i,A]=n.useState([]),[$,S]=n.useState(!0),[t,y]=n.useState(null),[b,l]=n.useState({show:!1,message:"",type:"success"}),[G,f]=n.useState(!1),[m,k]=n.useState({isOpen:!1,id:null,name:""}),[c,d]=n.useState({grade_level:"",section_name:"",school_year:"2025-2026",course:"",major:""});n.useEffect(()=>{v()},[]),n.useEffect(()=>{t?(d({grade_level:t.grade_level||t.year||"",section_name:t.section_name||t.name||"",school_year:t.school_year||"2025-2026",course:t.course||"",major:t.major||""}),f(!0)):d({grade_level:"",section_name:"",school_year:"2025-2026",course:"",major:""})},[t]);const v=async()=>{try{S(!0);const r=await u.getSections();A(r||[])}catch(r){console.error("Error fetching sections:",r),l({show:!0,message:"Failed to load sections.",type:"error"})}finally{S(!1)}},p=r=>{const{name:o,value:s}=r.target;d(h=>o==="course"?{...h,[o]:s,major:""}:{...h,[o]:s})},_=()=>{y(null),d({grade_level:"",section_name:"",school_year:"2025-2026",course:"",major:""}),f(!0)},T=r=>{y(r)},x=()=>{f(!1),y(null),d({grade_level:"",section_name:"",school_year:"2025-2026",course:"",major:""})},F=(r,o)=>{k({isOpen:!0,id:r,name:o})},z=()=>{k({isOpen:!1,id:null,name:""})},R=async()=>{if(m.id)try{await u.deleteSection(m.id),v(),l({show:!0,message:"Section deleted successfully",type:"success"}),z()}catch(r){l({show:!0,message:`Error deleting section: ${r.message}`,type:"error"})}},U=async r=>{r.preventDefault();try{const o={...c};o.school_year||(o.school_year="2025-2026"),t?(await u.updateSection(t.id,o),l({show:!0,message:"Section updated successfully!",type:"success"})):(await u.createSection(o),l({show:!0,message:"Section created successfully!",type:"success"})),x(),v()}catch(o){l({show:!0,message:`Error ${t?"updating":"creating"} section: ${o.message}`,type:"error"})}},M=n.useMemo(()=>i.reduce((r,o)=>{const s=o.grade_level||o.year||"Unknown";return r[s]||(r[s]=[]),r[s].push(o),r},{}),[i]),j=r=>{switch(String(r)){case"1":return"1st Year";case"2":return"2nd Year";case"3":return"3rd Year";case"4":return"4th Year";default:return`Grade ${r}`}};return e.jsxs(se,{children:[e.jsxs(ne,{children:[e.jsxs("div",{children:[e.jsxs("h2",{children:[e.jsx(E,{size:32})," Sections"]}),e.jsx("p",{children:"Create and manage academic sections for each year level."})]}),e.jsxs(C,{onClick:_,children:[e.jsx(K,{size:18})," Create New Section"]})]}),b.show&&e.jsx(X,{message:b.message,type:b.type,onClose:()=>l(r=>({...r,show:!1}))}),$?e.jsx(q,{variant:"cards",count:4}):i.length===0?e.jsx(D,{children:e.jsxs(L,{className:"text-center py-5",children:[e.jsx(Q,{size:48,className:"text-secondary mb-3"}),e.jsx("p",{className:"text-secondary",children:"No sections created yet."}),e.jsx(C,{onClick:_,className:"mt-3",children:"Create First Section"})]})}):e.jsx("div",{className:"d-flex flex-column gap-4",children:Object.keys(M).sort().map(r=>e.jsxs(D,{children:[e.jsxs(ie,{children:[e.jsx(N,{size:20}),e.jsx("h3",{children:j(r)})]}),e.jsx(L,{children:e.jsx(de,{children:M[r].map(o=>{const s=o.section_name||o.name||"",h=s.trim().charAt(0).toUpperCase()||"?";return e.jsxs(me,{children:[e.jsx(pe,{children:h}),e.jsxs(xe,{children:[e.jsx("h5",{children:s}),e.jsxs("small",{children:[j(r)," • ",o.school_year]}),(o.course||o.major)&&e.jsxs(he,{children:[o.course&&e.jsxs("span",{children:[e.jsx(I,{size:12})," ",o.course]}),o.major&&e.jsxs("span",{children:[e.jsx(B,{size:12})," ",o.major]})]})]}),e.jsxs(ue,{children:[e.jsx(Y,{onClick:()=>T(o),children:e.jsx(W,{size:16})}),e.jsx(Y,{danger:!0,onClick:()=>F(o.id,s),children:e.jsx(Z,{size:16})})]})]},o.id)})})})]},r))}),G&&e.jsx(ge,{onClick:x,children:e.jsxs(ye,{onClick:r=>r.stopPropagation(),children:[e.jsxs(be,{children:[e.jsxs("h3",{children:[e.jsx(te,{size:20})," ",t?"Edit Section":"Create New Section"]}),e.jsx(je,{onClick:x,children:e.jsx(H,{size:20})})]}),e.jsxs("form",{onSubmit:U,children:[e.jsx(fe,{children:e.jsxs("div",{className:"row g-3",children:[e.jsx("div",{className:"col-md-6",children:e.jsxs(g,{children:[e.jsxs("label",{children:[e.jsx(N,{size:16})," Grade Level"]}),e.jsxs(w,{name:"grade_level",value:c.grade_level,onChange:p,required:!0,children:[e.jsx("option",{value:"",children:"Select Grade..."}),V.map(r=>e.jsx("option",{value:r,children:j(r)},r))]})]})}),e.jsx("div",{className:"col-md-6",children:e.jsxs(g,{children:[e.jsxs("label",{children:[e.jsx(E,{size:16})," Section Name"]}),e.jsx(ce,{name:"section_name",placeholder:"e.g. Power, Benevolence",value:c.section_name,onChange:p,required:!0,autoComplete:"off"})]})}),e.jsx("div",{className:"col-md-6",children:e.jsxs(g,{children:[e.jsxs("label",{children:[e.jsx(I,{size:16})," Department/Course"]}),e.jsxs(w,{name:"course",value:c.course,onChange:p,children:[e.jsx("option",{value:"",children:"Select Department..."}),Object.keys(O).map(r=>e.jsx("option",{value:r,children:r},r))]})]})}),e.jsx("div",{className:"col-md-6",children:e.jsxs(g,{children:[e.jsxs("label",{children:[e.jsx(B,{size:16})," Major"]}),e.jsxs(w,{name:"major",value:c.major,onChange:p,disabled:!c.course,children:[e.jsx("option",{value:"",children:"Select Major..."}),c.course&&O[c.course]?.map(r=>e.jsx("option",{value:r,children:r},r))]})]})})]})}),e.jsxs(ve,{children:[e.jsxs(le,{type:"button",onClick:x,children:[e.jsx(oe,{size:18})," Cancel"]}),e.jsxs(C,{type:"submit",children:[e.jsx(ee,{size:18})," ",t?"Update Section":"Create Section"]})]})]})]})}),e.jsx(J,{isOpen:m.isOpen,onClose:z,onConfirm:R,title:"Delete Section",message:"Are you sure you want to delete this section? This action cannot be undone.",itemName:m.name})]})},se=a.div`
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
`,D=a.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`,ie=a.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,L=a.div`
   padding: 1.5rem;
`,g=a.div`
  margin-bottom: 0.5rem;
  label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
  }
`,ce=a.input`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
`,w=a.select`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
`,C=a.button`
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
`,le=a.button`
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
`,de=a.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
`,me=a.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--accent-primary);
    }
`,pe=a.div`
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-highlight));
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`,xe=a.div`
    flex: 1;
    h5 { margin: 0 0 4px; font-size: 1.1rem; color: var(--text-primary); font-weight: 700; }
    small { color: var(--text-secondary); }
`,he=a.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
    
    span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        
        svg {
            flex-shrink: 0;
            color: var(--accent-primary);
        }
    }
`,ue=a.div`
    display: flex;
    gap: 8px;
`,Y=a.button`
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
`,ge=a.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
`,ye=a.div`
    background: var(--bg-secondary);
    width: 90%; max-width: 600px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid var(--border-color); /* Extra redundancy for safety */
`,be=a.div`
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-tertiary);
    border-radius: 16px 16px 0 0;
    h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
`,fe=a.div`
    padding: 1.5rem;
`,ve=a.div`
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: flex-end; gap: 1rem;
    background: var(--bg-tertiary);
    border-radius: 0 0 16px 16px;
`,je=a.button`
    background: transparent; border: none; color: var(--text-secondary); cursor: pointer;
    &:hover { color: var(--text-primary); }
`;export{Pe as default};
