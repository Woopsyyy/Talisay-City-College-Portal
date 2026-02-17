const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/DashboardOverview-D_Dp4a3U.js","assets/index-G8dAaOpg.js","assets/index-A5Pc_CNG.css","assets/users-CneqRZry.js","assets/building-2-BmFCJ1tq.js","assets/UnifiedRoleSwitcher-DzaCjurU.js","assets/layers-CqdCGdQ0.js","assets/calendar-CG0mXhiR.js","assets/megaphone-fcxJ3P3Z.js","assets/clipboard-list-CG9ErwR6.js","assets/ManageUsersView-Dpk6IRRD.js","assets/Toast-CfYD9-5b.js","assets/circle-check-big-BkBU9BDV.js","assets/circle-alert-QpU8jh7N.js","assets/triangle-alert-DHUh_5GK.js","assets/DeleteModal-BwSZan_D.js","assets/useDebouncedValue-hUueIzrg.js","assets/search-DDp6GwTl.js","assets/trash-2-D6PG7ToH.js","assets/award-C-798qRU.js","assets/layout-dashboard-BfKp-c8E.js","assets/settings-DNNACGN9.js","assets/SettingsView-B36oKdzH.js","assets/info-JkjM17ht.js","assets/download-BQ6YnnDK.js","assets/clock-DTlNUsPA.js","assets/FeedbackInboxView-DrbACEUb.js","assets/SkeletonLoader-BlW5p720.js","assets/funnel-FWZ3B0qw.js","assets/user-DNE8y8gH.js"])))=>i.map(i=>d[i]);
import{c as b,a as y,u as j,b as k,r as s,j as e,C as w,d as t,e as _,f as n,N as m,P as S,_ as c}from"./index-G8dAaOpg.js";import{U as z,L as A,T as C,C as L}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{L as T}from"./layout-dashboard-BfKp-c8E.js";import{M as I,S as E}from"./settings-DNNACGN9.js";const U=[["path",{d:"M10 15H6a4 4 0 0 0-4 4v2",key:"1nfge6"}],["path",{d:"m14.305 16.53.923-.382",key:"1itpsq"}],["path",{d:"m15.228 13.852-.923-.383",key:"eplpkm"}],["path",{d:"m16.852 12.228-.383-.923",key:"13v3q0"}],["path",{d:"m16.852 17.772-.383.924",key:"1i8mnm"}],["path",{d:"m19.148 12.228.383-.923",key:"1q8j1v"}],["path",{d:"m19.53 18.696-.382-.924",key:"vk1qj3"}],["path",{d:"m20.772 13.852.924-.383",key:"n880s0"}],["path",{d:"m20.772 16.148.924.383",key:"1g6xey"}],["circle",{cx:"18",cy:"15",r:"3",key:"gjjjvw"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],D=b("user-cog",U),M=s.lazy(()=>c(()=>import("./DashboardOverview-D_Dp4a3U.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9]))),R=s.lazy(()=>c(()=>import("./ManageUsersView-Dpk6IRRD.js"),__vite__mapDeps([10,1,2,11,12,13,14,15,16,3,17,18,5,19,20,21]))),O=s.lazy(()=>c(()=>import("./SettingsView-B36oKdzH.js"),__vite__mapDeps([22,1,2,11,12,13,14,21,23,24,25,18]))),P=s.lazy(()=>c(()=>import("./FeedbackInboxView-DrbACEUb.js"),__vite__mapDeps([26,1,2,11,12,13,14,27,25,28,21,29,5]))),$=()=>{const o=y(),{user:r,loading:l,avatarUrl:x,logout:g}=j(),i=k().pathname.split("/"),d=i[i.length-1]==="dashboard"?"overview":i[i.length-1];s.useEffect(()=>{const a=Array.isArray(r?.roles)&&r.roles.length?r.roles:r?.role?[r.role]:[];!l&&(!r||!a.includes("admin"))&&(a.includes("teacher")?o("/teachers"):a.includes("student")?o("/home"):a.includes("nt")?o("/nt/dashboard"):o("/"))},[l,r,o]);const h=async a=>{a.preventDefault();try{await g(),o("/")}catch{o("/")}},u=[{id:"overview",icon:T,label:"Overview"},{id:"feedback",icon:I,label:"Feedback"},{id:"settings",icon:E,label:"Settings"},{id:"manage_user",icon:D,label:"Manage Users"}],p={overview:{title:"Dashboard Overview",copy:"Get a quick snapshot of the system's status, including total users, buildings, and active subjects."},sanctions:{title:"Sanction Management",copy:"Monitor and manage student disciplinary actions."},payments:{title:"Financial Tracking",copy:"Monitor student payment statuses and financial balances."},manage_user:{title:"User Roles",copy:"Manage user permissions, assign roles, and control access across the platform."},feedback:{title:"Feedback Inbox",copy:"Review and respond to anonymous feedback from students."},settings:{title:"System Settings",copy:"Perform maintenance tasks, clean up database records, and manage system configurations."}},v=()=>e.jsx(s.Suspense,{fallback:e.jsx(S,{}),children:e.jsxs(_,{children:[e.jsx(n,{path:"overview",element:e.jsx(M,{})}),e.jsx(n,{path:"manage_user",element:e.jsx(R,{})}),e.jsx(n,{path:"feedback",element:e.jsx(P,{})}),e.jsx(n,{path:"settings",element:e.jsx(O,{})}),e.jsx(n,{path:"/",element:e.jsx(m,{to:"overview",replace:!0})}),e.jsx(n,{path:"*",element:e.jsx(m,{to:"overview",replace:!0})})]})});if(l&&!r)return e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg-primary)"},children:e.jsx(w,{})});const f=Array.isArray(r?.roles)&&r.roles.length?r.roles:r?.role?[r.role]:[];return!r||!f.includes("admin")?null:e.jsxs(H,{children:[e.jsxs(q,{children:[e.jsxs(N,{children:[e.jsx(V,{src:x,onError:a=>{a.target.src="/images/sample.jpg"},alt:"Admin"}),e.jsxs(F,{children:[e.jsx(B,{children:r?.full_name}),r?.school_id&&e.jsx(G,{children:r.school_id}),e.jsx(W,{children:"Administrator"})]})]}),e.jsx("div",{style:{padding:"0 0.75rem"},children:e.jsx(z,{label:"Admin Controls"})}),e.jsx(X,{children:u.map(a=>e.jsxs(J,{$active:d===a.id,onClick:()=>o(`/admin/dashboard/${a.id}`),children:[e.jsx(a.icon,{size:20}),e.jsx("span",{children:a.label})]},a.id))}),e.jsx(K,{children:e.jsxs(Q,{onClick:h,children:[e.jsx(A,{size:20})," Logout"]})})]}),e.jsxs(Y,{children:[e.jsxs(Z,{children:[e.jsxs(ee,{children:[e.jsx(te,{children:"Administrative Portal"}),e.jsxs(re,{children:["Welcome back, ",r?.full_name,"."]}),e.jsxs(oe,{children:["Stay in control of campus activity with quick insights.",p[d]?.copy]}),e.jsxs("div",{style:{marginTop:"1rem",display:"flex",gap:"10px",alignItems:"center"},children:[e.jsx(C,{}),e.jsx("span",{style:{fontSize:"0.9rem",color:"var(--text-secondary)"},children:"Toggle Theme"})]})]}),e.jsxs(ae,{children:[e.jsxs(ne,{children:[e.jsx(se,{children:"Current Focus"}),e.jsx(ie,{children:p[d]?.title||"Overview"}),e.jsx(ce,{children:"Manage operations efficiently."})]}),e.jsx(L,{})]})]}),e.jsx(le,{children:v()})]})]})},H=t.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
`,q=t.aside`
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
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
`,N=t.div`
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`,V=t.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 2px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`,F=t.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,B=t.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`,G=t.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
`,W=t.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`,X=t.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
`,J=t.button`
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
  border-left: 3px solid
    ${o=>o.$active?"var(--accent-primary)":"transparent"};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`,K=t.div`
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`,Q=t.button`
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

  &:hover {
    color: #ef4444;
  }
`,Y=t.main`
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  background-color: var(--bg-primary);
  min-height: 100vh;
  transition: all 0.3s ease;
`,Z=t.section`
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
`,ee=t.div`
  max-width: 600px;
`,te=t.span`
  color: var(--accent-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  display: block;
`,re=t.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
`,oe=t.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
`,ae=t.div`
  display: flex;
  gap: 1.5rem;
`,ne=t.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 16px;
  min-width: 260px;
  box-shadow: var(--shadow-md);
`,se=t.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
`,ie=t.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
`,ce=t.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`,le=t.div`
  animation: slideUp 0.4s ease-out;
`,ue=Object.freeze(Object.defineProperty({__proto__:null,default:$},Symbol.toStringTag,{value:"Module"}));export{ue as A,D as U};
