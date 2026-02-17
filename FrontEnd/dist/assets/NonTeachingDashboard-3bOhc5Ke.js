const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/FacilitiesView-B4PGMq3o.js","assets/index-G8dAaOpg.js","assets/index-A5Pc_CNG.css","assets/Toast-CfYD9-5b.js","assets/circle-check-big-BkBU9BDV.js","assets/circle-alert-QpU8jh7N.js","assets/triangle-alert-DHUh_5GK.js","assets/DeleteModal-BwSZan_D.js","assets/building-2-BmFCJ1tq.js","assets/circle-plus-BofdGSWu.js","assets/trash-2-D6PG7ToH.js","assets/map-pin-ENw4PO3o.js","assets/save-ozLe3sfg.js","assets/SectionsView-B8j4ncB4.js","assets/constants-CkFOpdC7.js","assets/layers-CqdCGdQ0.js","assets/calendar-CG0mXhiR.js","assets/UnifiedRoleSwitcher-DzaCjurU.js","assets/pen-tmjuzZCM.js","assets/SubjectsView-DoTG_ceq.js","assets/useDebouncedValue-hUueIzrg.js","assets/funnel-FWZ3B0qw.js","assets/clock-DTlNUsPA.js","assets/StudyLoadView-wu17kw83.js","assets/arrow-left-DhUokZpI.js","assets/download-BQ6YnnDK.js","assets/SanctionsView-Bdnwrc4U.js","assets/ManageStudentsView-DveFlg6v.js","assets/SkeletonLoader-BlW5p720.js","assets/shield-alert-CasghU5a.js","assets/users-CneqRZry.js","assets/search-DDp6GwTl.js","assets/PaymentsView-mLYZnRzR.js"])))=>i.map(i=>d[i]);
import{a as N,u as S,b as V,r as i,j as e,C as O,d as o,e as $,f as n,N as w,P as B,_ as l}from"./index-G8dAaOpg.js";import{B as D,U as M,L as U,T as F,C as H}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{S as Y,C as q}from"./shield-alert-CasghU5a.js";import{C as J}from"./clipboard-list-CG9ErwR6.js";import{L as W}from"./layers-CqdCGdQ0.js";import{B as X}from"./building-2-BmFCJ1tq.js";const G=i.lazy(()=>l(()=>import("./FacilitiesView-B4PGMq3o.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12]))),K=i.lazy(()=>l(()=>import("./SectionsView-B8j4ncB4.js"),__vite__mapDeps([13,1,2,14,3,4,5,6,7,15,9,16,8,17,18,10,12]))),Q=i.lazy(()=>l(()=>import("./SubjectsView-DoTG_ceq.js"),__vite__mapDeps([19,1,2,14,3,4,5,6,7,20,17,9,21,18,10,22,12]))),Z=i.lazy(()=>l(()=>import("./StudyLoadView-wu17kw83.js"),__vite__mapDeps([23,1,2,3,4,5,6,24,17,9,15,25,10]))),ee=i.lazy(()=>l(()=>import("./SanctionsView-Bdnwrc4U.js"),__vite__mapDeps([26,1,2,27,14,3,4,5,6,7,28,29,30,31,21,10,12]))),re=i.lazy(()=>l(()=>import("./PaymentsView-mLYZnRzR.js"),__vite__mapDeps([32,1,2,27,14,3,4,5,6,7,28,29,30,31,21,10,12]))),Pe=()=>{const a=N(),{user:t,loading:d,avatarUrl:A,logout:z}=S(),y=V().pathname.split("/"),p=y[y.length-1],{activeRole:C}=S(),m=(r=>{if(!r)return[];const b=[r.sub_role,...Array.isArray(r.sub_roles)?r.sub_roles:[],r.sub_roles].flatMap(s=>{if(!s)return[];if(typeof s=="string")try{const f=JSON.parse(s);return Array.isArray(f)?f:[s]}catch{return[s]}return[s]});return[...new Set(b.map(s=>String(s||"").toLowerCase().trim()))].filter(Boolean)})(t),u=C==="faculty";i.useEffect(()=>{const r=Array.isArray(t?.roles)&&t.roles.length?t.roles:t?.role?[t.role]:[],h=Array.isArray(t?.sub_roles)?t.sub_roles:[t?.sub_role].filter(Boolean),b=r.includes("admin")||r.includes("nt")||h.some(s=>["nt","osas","treasury"].includes(s));!d&&(!t||!b)&&(r.includes("admin")?a("/admin/dashboard"):r.includes("teacher")?a("/teachers"):r.includes("student")?a("/home"):a("/"))},[d,t,a]);const L=async r=>{r.preventDefault();try{await z(),a("/")}catch{a("/")}},k=[{id:"study_load",icon:J,label:"Study Load"},{id:"subjects",icon:D,label:"Subjects"},{id:"sections",icon:W,label:"Sections"},{id:"buildings",icon:X,label:"Buildings"}],v=[...m.includes("osas")?[{id:"sanctions",icon:Y,label:"Sanctions"}]:[],...m.includes("treasury")?[{id:"payments",icon:q,label:"Payments"}]:[]],c=u&&v.length>0?v:k,x=c.length>0?c[0].id:"study_load",T=c.map(r=>r.id),g=p==="dashboard"||!T.includes(p)?x:p,R=m.filter(r=>r==="osas"||r==="treasury").map(r=>r.toUpperCase()).join(", "),j={study_load:{title:"Study Load",copy:"Assign subject loads to sections based on course and year level requirements."},subjects:{title:"Subject Catalog",copy:"Maintain the comprehensive list of academic subjects, units, and curriculum details."},sections:{title:"Section Management",copy:"Organize student sections by year level and manage academic groupings."},buildings:{title:"Buildings & Facilities",copy:"Manage campus infrastructure, track room usage, and organize section allocations."},sanctions:{title:"Sanction Management",copy:"Record and monitor student disciplinary actions."},payments:{title:"Payment Tracking",copy:"Manage and verify student payment balances."}},E=()=>e.jsx(i.Suspense,{fallback:e.jsx(B,{}),children:e.jsxs($,{children:[e.jsx(n,{path:"study_load",element:e.jsx(Z,{})}),e.jsx(n,{path:"subjects",element:e.jsx(Q,{})}),e.jsx(n,{path:"sections",element:e.jsx(K,{})}),e.jsx(n,{path:"buildings",element:e.jsx(G,{})}),e.jsx(n,{path:"sanctions",element:e.jsx(ee,{})}),e.jsx(n,{path:"payments",element:e.jsx(re,{})}),e.jsx(n,{index:!0,element:e.jsx(w,{to:x,replace:!0})}),e.jsx(n,{path:"*",element:e.jsx(w,{to:`/nt/dashboard/${x}`,replace:!0})})]})});if(d&&!t)return e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg-primary)"},children:e.jsx(O,{})});const _=Array.isArray(t?.roles)&&t.roles.length?t.roles:t?.role?[t.role]:[],I=Array.isArray(t?.sub_roles)?t.sub_roles:[t?.sub_role].filter(Boolean),P=_.includes("admin")||_.includes("nt")||I.some(r=>["nt","osas","treasury"].includes(r.toLowerCase()));return!t||!P?null:e.jsxs(te,{children:[e.jsxs(oe,{children:[e.jsxs(ae,{children:[e.jsx(se,{src:A,onError:r=>{r.target.src="/images/sample.jpg"},alt:"Non-Teaching"}),e.jsxs(ne,{children:[e.jsx(ie,{children:t?.full_name}),t?.school_id&&e.jsx(le,{children:t.school_id}),e.jsx(ce,{children:u?R||"FACULTY":"STAFF"})]})]}),e.jsx("div",{style:{padding:"0 0.75rem"},children:e.jsx(M,{label:"Staff Access"})}),e.jsx(de,{children:c.map(r=>e.jsxs(pe,{$active:g===r.id,onClick:()=>a(`/nt/dashboard/${r.id}`),children:[e.jsx(r.icon,{size:20}),e.jsx("span",{children:r.label})]},r.id))}),e.jsx(me,{children:e.jsxs(ue,{onClick:L,children:[e.jsx(U,{size:20})," Logout"]})})]}),e.jsxs(xe,{children:[e.jsxs(ge,{children:[e.jsxs(he,{children:[e.jsx(be,{children:u?"Faculty Access":"Non-Teaching Portal"}),e.jsxs(fe,{children:["Welcome back, ",t?.full_name,"."]}),e.jsx(ye,{children:j[g]?.copy||"Manage campus operations."}),e.jsxs("div",{style:{marginTop:"1rem",display:"flex",gap:"10px",alignItems:"center"},children:[e.jsx(F,{}),e.jsx("span",{style:{fontSize:"0.9rem",color:"var(--text-secondary)"},children:"Toggle Theme"})]})]}),e.jsxs(ve,{children:[e.jsxs(je,{children:[e.jsx(_e,{children:"Current Focus"}),e.jsx(Se,{children:j[g]?.title||"Overview"}),e.jsx(we,{children:"Manage operations efficiently."})]}),e.jsx(H,{})]})]}),e.jsx(Ae,{children:E()})]})]})},te=o.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
`,oe=o.aside`
  width: 240px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 50;
  box-shadow: var(--shadow-sm);
`,ae=o.div`
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`,se=o.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 2px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`,ne=o.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,ie=o.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`,le=o.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
`,ce=o.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`,de=o.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`,pe=o.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: ${a=>a.$active?"var(--bg-tertiary)":"transparent"};
  color: ${a=>a.$active?"var(--accent-primary)":"var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${a=>a.$active?"600":"500"};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid ${a=>a.$active?"var(--accent-primary)":"transparent"};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`,me=o.div`
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;o.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { border-color: var(--accent-primary); transform: translateY(-1px); }
`;const ue=o.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { border-color: var(--accent-primary); transform: translateY(-1px); }
  &:hover { color: #ef4444; }
`,xe=o.main`
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  background-color: var(--bg-primary);
  min-height: 100vh;
  transition: all 0.3s ease;
`,ge=o.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
  animation: fadeIn 0.5s ease-out;

  @media (max-width: 1100px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
`,he=o.div`
  max-width: 600px;
`,be=o.span`
  color: var(--accent-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  display: block;
`,fe=o.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
`,ye=o.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
`,ve=o.div`
  display: flex;
  gap: 1.5rem;
`,je=o.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 16px;
  min-width: 260px;
  box-shadow: var(--shadow-md);
`,_e=o.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
`,Se=o.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
`,we=o.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`,Ae=o.div`
  animation: slideUp 0.4s ease-out;
`;export{Pe as default};
