const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/RecordsView-CC8OldK6.js","assets/index-G8dAaOpg.js","assets/index-A5Pc_CNG.css","assets/settings-DNNACGN9.js","assets/building-2-BmFCJ1tq.js","assets/layers-CqdCGdQ0.js","assets/calendar-CG0mXhiR.js","assets/users-CneqRZry.js","assets/circle-check-big-BkBU9BDV.js","assets/triangle-alert-DHUh_5GK.js","assets/circle-alert-QpU8jh7N.js","assets/AnnouncementsView-B4dJy2e_.js","assets/megaphone-fcxJ3P3Z.js","assets/bell-BYINsMo2.js","assets/clock-DTlNUsPA.js","assets/funnel-FWZ3B0qw.js","assets/trending-up-DdPn23yC.js","assets/GradesView-De9DCj0k.js","assets/award-C-798qRU.js","assets/UnifiedRoleSwitcher-DzaCjurU.js","assets/user-DNE8y8gH.js","assets/download-BQ6YnnDK.js","assets/TransparencyView-DpOM9UnB.js","assets/target-D4UFUtOT.js","assets/EvaluationView-Cy3zP4Ta.js","assets/info-JkjM17ht.js","assets/arrow-left-DhUokZpI.js","assets/star-CLif_3to.js","assets/SettingsView-CDUA5Mpn.js","assets/mail-DGXc6b4k.js","assets/save-ozLe3sfg.js","assets/FeedbackView-BSHpDDwD.js","assets/Toast-CfYD9-5b.js","assets/ManageStudentsView-DveFlg6v.js","assets/constants-CkFOpdC7.js","assets/DeleteModal-BwSZan_D.js","assets/SkeletonLoader-BlW5p720.js","assets/shield-alert-CasghU5a.js","assets/search-DDp6GwTl.js","assets/trash-2-D6PG7ToH.js"])))=>i.map(i=>d[i]);
import{c as x,a as C,u as y,b as A,r as s,j as e,C as v,d as t,e as E,f as a,N as b,P as T,_ as i}from"./index-G8dAaOpg.js";import{U as L,L as R,T as I,C as V}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{M as f,S as M}from"./settings-DNNACGN9.js";import{M as P}from"./megaphone-fcxJ3P3Z.js";import{A as H}from"./award-C-798qRU.js";const $=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"m9 14 2 2 4-4",key:"df797q"}]],N=x("clipboard-check",$);const D=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],O=x("file-text",D);const U=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],F=x("shield",U),B=s.lazy(()=>i(()=>import("./RecordsView-CC8OldK6.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10]))),G=s.lazy(()=>i(()=>import("./AnnouncementsView-B4dJy2e_.js"),__vite__mapDeps([11,1,2,10,12,13,14,15,6,16,7]))),q=s.lazy(()=>i(()=>import("./GradesView-De9DCj0k.js"),__vite__mapDeps([17,1,2,18,6,19,20,21]))),Y=s.lazy(()=>i(()=>import("./TransparencyView-DpOM9UnB.js"),__vite__mapDeps([22,1,2,4,19,8,14,23,6]))),W=s.lazy(()=>i(()=>import("./EvaluationView-Cy3zP4Ta.js"),__vite__mapDeps([24,1,2,9,25,26,8,20,27,14,19,3,12,18]))),X=s.lazy(()=>i(()=>import("./SettingsView-CDUA5Mpn.js"),__vite__mapDeps([28,1,2,8,9,29,20,19,30]))),J=s.lazy(()=>i(()=>import("./FeedbackView-BSHpDDwD.js"),__vite__mapDeps([31,1,2,32,8,10,9,19,25,3,14]))),m=s.lazy(()=>i(()=>import("./ManageStudentsView-DveFlg6v.js"),__vite__mapDeps([33,1,2,34,32,8,10,9,35,36,37,7,38,15,39,30]))),K=()=>{const o=C(),{user:r,loading:l,avatarUrl:j,logout:_}=y(),h=A().pathname.split("/"),u=h[h.length-1],d=u==="home"?"records":u,{activeRole:ke,activeSubRole:p,switchSubRole:Se}=y(),c=(p||"student").toLowerCase(),w=c==="student"?"Student":c.toUpperCase();s.useEffect(()=>{if(l)return;if(!r){o("/");return}(Array.isArray(r.roles)&&r.roles.length?r.roles:[r.role||"student"]).includes("admin")},[l,r,o,p]);const k=async n=>{n.preventDefault();try{await _(),o("/")}catch{o("/")}},S=[...[{id:"records",icon:O,label:"My Records"},{id:"announcements",icon:P,label:"Announcements"},{id:"grades",icon:H,label:"Grades"},{id:"transparency",icon:F,label:"Transparency"},{id:"evaluation",icon:N,label:"Evaluation"},{id:"feedback",icon:f,label:"Feedback"},{id:"settings",icon:M,label:"Settings"}]],g={records:{title:"My Records",copy:"View your enrollment status, section assignment, and schedule."},announcements:{title:"Campus Announcements",copy:"Stay updated with the latest news and events from the college."},grades:{title:"Academic Grades",copy:"Monitor your performance and view your evaluation results."},transparency:{title:"Transparency Board",copy:"Access public records and official college documents."},evaluation:{title:"Faculty Evaluation",copy:"Provide feedback on your instructors and courses."},feedback:{title:"Feedback System",copy:"Submit anonymous suggestions or concerns to the college administration."},sanctions:{title:"Sanction Management",copy:"Record and monitor student disciplinary actions."},payments:{title:"Payment Tracking",copy:"Manage and verify student payment balances."},settings:{title:"Account Settings",copy:"Manage your profile, update password, and personalization."}},z=()=>e.jsx(s.Suspense,{fallback:e.jsx(T,{}),children:e.jsxs(E,{children:[e.jsx(a,{path:"records",element:e.jsx(B,{})}),e.jsx(a,{path:"announcements",element:e.jsx(G,{})}),e.jsx(a,{path:"grades",element:e.jsx(q,{currentUser:r})}),e.jsx(a,{path:"transparency",element:e.jsx(Y,{})}),e.jsx(a,{path:"evaluation",element:e.jsx(W,{})}),e.jsx(a,{path:"feedback",element:e.jsx(J,{})}),e.jsx(a,{path:"manage_students",element:e.jsx(m,{mode:"nt"})}),e.jsx(a,{path:"sanctions",element:e.jsx(m,{mode:"osas"})}),e.jsx(a,{path:"payments",element:e.jsx(m,{mode:"treasury"})}),e.jsx(a,{path:"settings",element:e.jsx(X,{currentUser:r})}),e.jsx(a,{path:"/",element:e.jsx(b,{to:"records",replace:!0})}),e.jsx(a,{path:"*",element:e.jsx(b,{to:"records",replace:!0})})]})});return l&&!r?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg-primary)"},children:e.jsx(v,{})}):r?(r?.sub_role?.toLowerCase(),r?.sub_role?.toLowerCase(),e.jsxs(Q,{children:[e.jsxs(Z,{children:[e.jsxs(ee,{children:[e.jsx(te,{src:j,onError:n=>{n.target.src="/images/sample.jpg"},alt:"User"}),e.jsxs(re,{children:[e.jsx(oe,{children:r?.full_name||"Student"}),r?.school_id&&e.jsx(ae,{children:r.school_id}),e.jsx(ne,{children:w})]})]}),e.jsx("div",{style:{padding:"0 0.75rem"},children:e.jsx(L,{label:"Student Profile"})}),e.jsx(se,{children:S.map(n=>e.jsxs(ie,{$active:d===n.id,onClick:()=>o(`/home/${n.id}`),children:[e.jsx(n.icon,{size:20}),e.jsx("span",{children:n.label})]},n.id))}),e.jsx(ce,{children:e.jsxs(le,{onClick:k,children:[e.jsx(R,{size:20})," Logout"]})})]}),e.jsxs(de,{children:[e.jsxs(pe,{children:[e.jsxs(me,{children:[e.jsx(xe,{children:c==="student"?"Student Portal":`${c.toUpperCase()} Portal`}),e.jsxs(he,{children:["Hello, ",r?.full_name?.split(" ")[0]||"Student","."]}),e.jsx(ue,{children:g[d]?.copy||"Welcome to your portal."}),e.jsxs("div",{style:{marginTop:"1rem",display:"flex",gap:"10px",alignItems:"center"},children:[e.jsxs(ge,{onClick:()=>o("/home/feedback"),children:[e.jsx(f,{size:16}),"Send Feedback"]}),e.jsx(I,{}),e.jsx("span",{style:{fontSize:"0.9rem",color:"var(--text-secondary)"},children:"Toggle Theme"})]})]}),e.jsxs(ye,{children:[e.jsxs(ve,{children:[e.jsx(be,{children:"Current View"}),e.jsx(fe,{children:g[d]?.title}),e.jsx(je,{children:"Active Session"})]}),e.jsx(V,{})]})]}),e.jsx(_e,{children:z()})]})]})):e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg-primary)"},children:e.jsx(v,{})})},Q=t.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
`,Z=t.aside`
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
`,ee=t.div`
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`,te=t.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 2px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`,re=t.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,oe=t.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`,ae=t.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
`,ne=t.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`,se=t.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`,ie=t.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: ${o=>o.$active?"var(--bg-tertiary)":"transparent"};
  color: ${o=>o.$active?"var(--accent-primary)":"var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${o=>o.$active?"600":"500"};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid ${o=>o.$active?"var(--accent-primary)":"transparent"};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`,ce=t.div`
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
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { border-color: var(--accent-primary); transform: translateY(-1px); }
`;const le=t.button`
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
`,de=t.main`
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  max-width: 100%;
  overflow-x: hidden;
`,pe=t.section`
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
`,me=t.div`
  max-width: 600px;
`,xe=t.span`
  color: var(--accent-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  display: block;
`,he=t.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
`,ue=t.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
`,ge=t.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
  }
`,ye=t.div`
  display: flex;
  gap: 1.5rem;
`,ve=t.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 16px;
  min-width: 260px;
  box-shadow: var(--shadow-md);
`,be=t.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
`,fe=t.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
`,je=t.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`,_e=t.div`
  animation: slideUp 0.4s ease-out;
`,Ve=Object.freeze(Object.defineProperty({__proto__:null,default:K},Symbol.toStringTag,{value:"Module"}));export{N as C,Ve as H};
