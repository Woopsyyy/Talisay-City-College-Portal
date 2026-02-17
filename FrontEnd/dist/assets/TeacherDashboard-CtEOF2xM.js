const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ScheduleView-DEhnZ26e.js","assets/index-G8dAaOpg.js","assets/index-A5Pc_CNG.css","assets/calendar-CG0mXhiR.js","assets/clock-DTlNUsPA.js","assets/user-DNE8y8gH.js","assets/map-pin-ENw4PO3o.js","assets/AnnouncementsView-Cb4tEHqz.js","assets/Toast-CfYD9-5b.js","assets/circle-check-big-BkBU9BDV.js","assets/circle-alert-QpU8jh7N.js","assets/triangle-alert-DHUh_5GK.js","assets/DeleteModal-BwSZan_D.js","assets/megaphone-fcxJ3P3Z.js","assets/plus-C9Cx14sX.js","assets/bell-BYINsMo2.js","assets/funnel-FWZ3B0qw.js","assets/trash-2-D6PG7ToH.js","assets/save-ozLe3sfg.js","assets/trending-up-DdPn23yC.js","assets/users-CneqRZry.js","assets/TransparencyView-BR4XWpgn.js","assets/building-2-BmFCJ1tq.js","assets/UnifiedRoleSwitcher-DzaCjurU.js","assets/target-D4UFUtOT.js","assets/pen-tmjuzZCM.js","assets/GradeSystemView-Lp-tgA-j.js","assets/award-C-798qRU.js","assets/EvaluationView-wdeMKBkC.js","assets/star-CLif_3to.js","assets/settings-DNNACGN9.js","assets/SettingsView-DbqkTNke.js","assets/mail-DGXc6b4k.js","assets/FeedbackInboxView-DrbACEUb.js","assets/SkeletonLoader-BlW5p720.js","assets/ManageStudentsView-DveFlg6v.js","assets/constants-CkFOpdC7.js","assets/shield-alert-CasghU5a.js","assets/search-DDp6GwTl.js","assets/SanctionsView-Dx5SBQjC.js","assets/PaymentsView-1C9WY9LA.js"])))=>i.map(i=>d[i]);
import{c as R,a as F,u as S,b as U,r as i,j as e,C as $,d as t,e as G,f as s,N as k,P as H,_ as l}from"./index-G8dAaOpg.js";import{G as A,U as B,L as q,T as J,C as W}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{M}from"./megaphone-fcxJ3P3Z.js";import{L as X}from"./layout-dashboard-BfKp-c8E.js";import{C as E}from"./clipboard-list-CG9ErwR6.js";import{U as Y}from"./users-CneqRZry.js";import{M as K,S as Q}from"./settings-DNNACGN9.js";import{S as Z,C as ee}from"./shield-alert-CasghU5a.js";const te=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]],ae=R("calendar-days",te);const ne=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]],re=R("chart-line",ne),oe=i.lazy(()=>l(()=>import("./ScheduleView-DEhnZ26e.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),se=i.lazy(()=>l(()=>import("./AnnouncementsView-Cb4tEHqz.js"),__vite__mapDeps([7,1,2,8,9,10,11,12,13,14,15,4,16,3,17,18,19,20]))),ie=i.lazy(()=>l(()=>import("./TransparencyView-BR4XWpgn.js"),__vite__mapDeps([21,1,2,8,9,10,11,12,22,14,23,24,3,25,17,18,4]))),ce=i.lazy(()=>l(()=>import("./GradeSystemView-Lp-tgA-j.js"),__vite__mapDeps([26,1,2,23,27,20]))),le=i.lazy(()=>l(()=>import("./EvaluationView-wdeMKBkC.js"),__vite__mapDeps([28,1,2,8,9,10,11,29,20,19,30]))),de=i.lazy(()=>l(()=>import("./SettingsView-DbqkTNke.js"),__vite__mapDeps([31,1,2,9,11,32,5,23,18]))),pe=i.lazy(()=>l(()=>import("./FeedbackInboxView-DrbACEUb.js"),__vite__mapDeps([33,1,2,8,9,10,11,34,4,16,30,5,23]))),me=i.lazy(()=>l(()=>import("./ManageStudentsView-DveFlg6v.js"),__vite__mapDeps([35,1,2,36,8,9,10,11,12,34,37,20,38,16,17,18]))),he=i.lazy(()=>l(()=>import("./SanctionsView-Dx5SBQjC.js"),__vite__mapDeps([39,1,2,35,36,8,9,10,11,12,34,37,20,38,16,17,18]))),ue=i.lazy(()=>l(()=>import("./PaymentsView-1C9WY9LA.js"),__vite__mapDeps([40,1,2,35,36,8,9,10,11,12,34,37,20,38,16,17,18]))),Ye=()=>{const r=F(),{user:n,loading:u,avatarUrl:T,logout:z}=S(),v=U().pathname.split("/"),_=v[v.length-1],{activeRole:p}=S(),d=(a=>{if(!a)return[];const b=[a.sub_role,...Array.isArray(a.sub_roles)?a.sub_roles:[],a.sub_roles].flatMap(c=>{if(!c)return[];if(typeof c=="string")try{const f=JSON.parse(c);return Array.isArray(f)?f:[c]}catch{return[c]}return[c]});return[...new Set(b.map(c=>String(c||"").toLowerCase().trim()))].filter(Boolean)})(n),m=p==="faculty",C=d.includes("dean"),o=m&&C;i.useEffect(()=>{const a=Array.isArray(n?.roles)&&n.roles.length?n.roles:n?.role?[n.role]:[],y=a.includes("teacher"),b=p==="faculty"&&d.includes("dean"),c=d.includes("osas")||d.includes("treasury");!u&&(!n||!y&&!b)&&(n?a.includes("admin")?r("/admin/dashboard"):c||a.includes("nt")?r("/nt/dashboard"):r("/home"):r("/"))},[u,n,r,p,d]);const D=async a=>{a.preventDefault();try{await z(),r("/")}catch{r("/")}},L=[{id:"schedule",icon:ae,label:"Schedule"},{id:"announcements",icon:M,label:"Announcements"},{id:"transparency",icon:re,label:"Transparency"},{id:"grade_system",icon:A,label:"Grade System"},{id:"evaluation",icon:E,label:"Evaluation"},{id:"settings",icon:Q,label:"Settings"}],I=[{id:"announcements",icon:M,label:"Manage Announcements"},{id:"transparency",icon:X,label:"Manage Projects"},{id:"grade_system",icon:A,label:"Grade Monitoring"},{id:"evaluation",icon:E,label:"Evaluation Mgmt"},{id:"manage_students",icon:Y,label:"Manage Students"},{id:"feedback",icon:K,label:"Feedback Replies"}],V=[...d.includes("dean")?I:[],...d.includes("osas")?[{id:"sanctions",icon:Z,label:"Sanctions"}]:[],...d.includes("treasury")?[{id:"payments",icon:ee,label:"Payments"}]:[]],j=Array.from(new Map(V.map(a=>[a.id,a])).values()),g=m&&j.length>0?j:L,x=g.length>0?g[0].id:"schedule",h=_==="teachers"?x:_,w={schedule:{title:"My Schedule",copy:"Check your weekly schedule, see which classes you teach, and manage your time effectively."},announcements:{title:o?"Global Announcements":"Announcements",copy:o?"Create and manage announcements for the whole department.":"Browse targeted updates and stay informed on school activities."},transparency:{title:o?"Project Oversight":"Transparency",copy:o?"Manage school project budgets, completion status, and milestones.":"Explore school project budgets and milestones through the transparency log."},grade_system:{title:o?"Grade Monitoring":"Grade System",copy:o?"View and filter student grades across the department (Read-only).":"Manage student grades and maintain accurate records for your classes."},evaluation:{title:o?"Evaluation Management":"Evaluation Statistics",copy:o?"Enable/Disable evaluations, update templates, and view overall statistics.":"Review detailed evaluation statistics and student feedback."},manage_students:{title:"Section Assignments",copy:"Assign students to sections and update their regular/irregular status."},sanctions:{title:"Sanction Management",copy:"Monitor and manage student disciplinary actions."},payments:{title:"Financial Tracking",copy:"Monitor student payment statuses and financial balances."},feedback:{title:"Feedback Inbox",copy:"Review and respond to anonymous feedback from students."},settings:{title:"Settings",copy:"Update your account details and profile picture."}},P=()=>e.jsx(i.Suspense,{fallback:e.jsx(H,{}),children:e.jsxs(G,{children:[e.jsx(s,{path:"schedule",element:e.jsx(oe,{})}),e.jsx(s,{path:"announcements",element:e.jsx(se,{isAdmin:o})}),e.jsx(s,{path:"transparency",element:e.jsx(ie,{isAdmin:o})}),e.jsx(s,{path:"grade_system",element:e.jsx(ce,{isReadOnly:o})}),e.jsx(s,{path:"evaluation",element:e.jsx(le,{isAdmin:o})}),e.jsx(s,{path:"manage_students",element:e.jsx(me,{mode:"dean"})}),e.jsx(s,{path:"sanctions",element:e.jsx(he,{})}),e.jsx(s,{path:"payments",element:e.jsx(ue,{})}),e.jsx(s,{path:"feedback",element:e.jsx(pe,{})}),e.jsx(s,{path:"settings",element:e.jsx(de,{currentUser:n})}),e.jsx(s,{path:"/",element:e.jsx(k,{to:x,replace:!0})}),e.jsx(s,{path:"*",element:e.jsx(k,{to:x,replace:!0})})]})});if(u&&!n)return e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg-primary)"},children:e.jsx($,{})});const O=(Array.isArray(n?.roles)&&n.roles.length?n.roles:n?.role?[n.role]:[]).includes("teacher"),N=p==="faculty"&&d.includes("dean");return!n||!O&&!N?null:e.jsxs(ge,{children:[e.jsxs(xe,{children:[e.jsxs(ye,{children:[e.jsx(be,{src:T,onError:a=>{a.target.src="/images/sample.jpg"},alt:"Teacher"}),e.jsxs(fe,{children:[e.jsx(ve,{children:n?.full_name}),n?.school_id&&e.jsx(_e,{children:n.school_id}),e.jsx(je,{children:o?"Dean":m?"Faculty":"Teacher"})]})]}),e.jsx("div",{style:{padding:"0 0.75rem"},children:e.jsx(B,{label:"Faculty Context"})}),e.jsx(we,{children:g.map(a=>e.jsxs(Se,{$active:h===a.id,onClick:()=>r(`/teachers/${a.id}`),children:[e.jsx(a.icon,{size:20}),e.jsx("span",{children:a.label})]},a.id))}),e.jsx(ke,{children:e.jsxs(Ae,{onClick:D,children:[e.jsx(q,{size:20})," Logout"]})})]}),e.jsxs(Me,{children:[e.jsxs(Ee,{children:[e.jsxs(Re,{children:[e.jsx(Te,{children:o?"Dean Portal":m?"Faculty Portal":"Teacher Dashboard"}),e.jsxs(ze,{children:["Hi, ",n?.full_name,"!"]}),e.jsx(Ce,{children:w[h]?.copy||"Welcome to your dashboard."}),e.jsxs("div",{style:{marginTop:"1rem",display:"flex",gap:"10px",alignItems:"center"},children:[e.jsx(J,{}),e.jsx("span",{style:{fontSize:"0.9rem",color:"var(--text-secondary)"},children:"Toggle Theme"})]})]}),e.jsxs(De,{children:[e.jsxs(Le,{children:[e.jsx(Ie,{children:h.replace("_"," ")}),e.jsx(Ve,{children:w[h]?.title}),e.jsx(Pe,{children:"View Details"})]}),e.jsx(W,{})]})]}),e.jsx(Oe,{children:P()})]})]})},ge=t.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
`,xe=t.aside`
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
`,ye=t.div`
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`,be=t.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 2px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`,fe=t.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,ve=t.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`,_e=t.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
`,je=t.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`,we=t.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`,Se=t.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: ${r=>r.$active?"var(--bg-tertiary)":"transparent"};
  color: ${r=>r.$active?"var(--accent-primary)":"var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${r=>r.$active?"600":"500"};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid
    ${r=>r.$active?"var(--accent-primary)":"transparent"};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`,ke=t.div`
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;t.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
`;const Ae=t.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 8px;
  transition: color 0.2s;
  &:hover { color: #ef4444; }
`,Me=t.main`
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  background-color: var(--bg-primary);
  min-height: 100vh;
  transition: all 0.3s ease;
`,Ee=t.section`
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
`,Re=t.div`
  max-width: 600px;
`,Te=t.span`
  color: var(--accent-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  display: block;
`,ze=t.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
`,Ce=t.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
`,De=t.div`
  display: flex;
  gap: 1.5rem;
`,Le=t.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 16px;
  min-width: 260px;
  box-shadow: var(--shadow-md);
`,Ie=t.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
`,Ve=t.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
`,Pe=t.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`,Oe=t.div`
  animation: slideUp 0.4s ease-out;
`;export{Ye as default};
