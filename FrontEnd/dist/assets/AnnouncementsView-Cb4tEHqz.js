import{r as a,j as e,P as ee,X as E,T as z,d as r}from"./index-G8dAaOpg.js";import{T as re}from"./Toast-CfYD9-5b.js";import{D as te}from"./DeleteModal-BwSZan_D.js";import{C as A}from"./circle-alert-QpU8jh7N.js";import{M as I}from"./megaphone-fcxJ3P3Z.js";import{P as ne}from"./plus-C9Cx14sX.js";import{B as H}from"./bell-BYINsMo2.js";import{C as Y}from"./clock-DTlNUsPA.js";import{F as oe}from"./funnel-FWZ3B0qw.js";import{C as se}from"./calendar-CG0mXhiR.js";import{T as ie}from"./trash-2-D6PG7ToH.js";import{S as ae}from"./save-ozLe3sfg.js";import{T as le}from"./trending-up-DdPn23yC.js";import{U as b}from"./users-CneqRZry.js";import"./circle-check-big-BkBU9BDV.js";import"./triangle-alert-DHUh_5GK.js";const ar=({isAdmin:o=!1})=>{const[c,V]=a.useState([]),[B,d]=a.useState(!0),[L,J]=a.useState(null),[l,p]=a.useState("all"),[R,m]=a.useState(!1),[y,N]=a.useState({show:!1,message:"",type:"success"}),[O,j]=a.useState({isOpen:!1,id:null}),[x,P]=a.useState({title:"",content:"",priority:"medium",target_role:"all",expires_at:""}),w=async()=>{try{d(!0);const t=await z.getAnnouncements();V(Array.isArray(t)?t:[])}catch(t){console.error("Error fetching announcements:",t),J(t.message||"Failed to load announcements")}finally{d(!1)}};a.useEffect(()=>{w()},[]);const f=(t,n="success")=>{N({show:!0,message:t,type:n})},u=t=>{const{name:n,value:s}=t.target;P(i=>({...i,[n]:s}))},X=async t=>{t.preventDefault();try{d(!0),await z.createAnnouncement(x),f("Announcement created successfully!"),m(!1),P({title:"",content:"",priority:"medium",target_role:"all",expires_at:""}),w()}catch(n){f(n.message||"Failed to create announcement","error")}finally{d(!1)}},K=async()=>{try{d(!0),await z.deleteAnnouncement(O.id),f("Announcement deleted"),j({isOpen:!1,id:null}),w()}catch(t){f(t.message||"Failed to delete announcement","error")}finally{d(!1)}},C=t=>{try{if(!t)return"Date not specified";const n=new Date(t);return isNaN(n.getTime())?String(t):n.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return String(t)}},Q=t=>{try{const n=new Date(t),i=new Date-n,g=Math.floor(i/(1e3*60*60*24)),k=Math.floor(i/(1e3*60*60)),S=Math.floor(i/(1e3*60));return g>7?C(t):g>0?`${g} day${g>1?"s":""} ago`:k>0?`${k} hour${k>1?"s":""} ago`:S>0?`${S} minute${S>1?"s":""} ago`:"Just now"}catch{return C(t)}},W=t=>{const n=(t||"medium").toLowerCase();return n==="high"?{icon:A,label:"Urgent",color:"#ef4444",bg:"rgba(239, 68, 68, 0.1)"}:n==="medium"?{icon:le,label:"Important",color:"#f59e0b",bg:"rgba(245, 158, 11, 0.1)"}:{icon:H,label:"Info",color:"#3b82f6",bg:"rgba(59, 130, 246, 0.1)"}},Z=t=>{const n=(t||"all").toLowerCase();return n==="all"?{icon:b,label:"All Users",color:"#8b5cf6"}:n==="student"?{icon:b,label:"Students",color:"#10b981"}:n==="teacher"?{icon:b,label:"Teachers",color:"var(--accent-primary)"}:{icon:b,label:t,color:"#6b7280"}},$=a.useMemo(()=>{const t=c.filter(s=>(s.priority||"").toLowerCase()==="high").length,n=c.filter(s=>{const i=new Date(s.published_at);return(new Date-i)/(1e3*60*60*24)<=7}).length;return{total:c.length,urgent:t,recent:n}},[c]),U=a.useMemo(()=>c.filter(t=>l==="all"?!0:(t.priority||"medium").toLowerCase()===l),[c,l]);return B&&c.length===0?e.jsx(Be,{children:e.jsx(ee,{variant:"cards",count:4})}):L&&c.length===0?e.jsxs(Le,{children:[e.jsx(A,{size:48}),e.jsx("h3",{children:"Failed to Load Announcements"}),e.jsx("p",{children:L})]}):e.jsxs(ce,{children:[y.show&&e.jsx(re,{...y,onClose:()=>N({...y,show:!1})}),e.jsxs(de,{children:[e.jsxs(xe,{children:[e.jsx(I,{size:32}),e.jsxs("div",{children:[e.jsx("h2",{children:o?"Announcement":"Campus Announcements"}),e.jsx("p",{children:o?"Create and manage department announcements":"Stay informed with the latest news and important updates"})]})]}),o&&e.jsxs(pe,{onClick:()=>m(!0),children:[e.jsx(ne,{size:20})," Create New"]})]}),e.jsxs(me,{children:[e.jsxs(T,{$color:"#3b82f6",children:[e.jsx(M,{children:e.jsx(H,{size:24})}),e.jsxs(D,{children:[e.jsx(F,{children:"Total"}),e.jsx(_,{children:$.total})]})]}),e.jsxs(T,{$color:"#ef4444",children:[e.jsx(M,{children:e.jsx(A,{size:24})}),e.jsxs(D,{children:[e.jsx(F,{children:"Urgent"}),e.jsx(_,{children:$.urgent})]})]}),e.jsxs(T,{$color:"#10b981",children:[e.jsx(M,{children:e.jsx(Y,{size:24})}),e.jsxs(D,{children:[e.jsx(F,{children:"Recent (7 days)"}),e.jsx(_,{children:$.recent})]})]})]}),e.jsxs(ue,{children:[e.jsxs(ge,{children:[e.jsx(oe,{size:16})," Filter by Priority:"]}),e.jsxs(he,{children:[e.jsx(v,{$active:l==="all",onClick:()=>p("all"),children:"All"}),e.jsx(v,{$active:l==="high",$color:"#ef4444",onClick:()=>p("high"),children:"Urgent"}),e.jsx(v,{$active:l==="medium",$color:"#f59e0b",onClick:()=>p("medium"),children:"Important"}),e.jsx(v,{$active:l==="low",$color:"#3b82f6",onClick:()=>p("low"),children:"Info"}),l!=="all"&&e.jsxs(fe,{onClick:()=>p("all"),children:[e.jsx(E,{size:14})," Clear"]})]})]}),U.length===0?e.jsxs(_e,{children:[e.jsx(I,{size:64}),e.jsx("h3",{children:"No Announcements Found"}),e.jsx("p",{children:l!=="all"?"No announcements match your current filter.":"There are currently no announcements to display."})]}):e.jsx(be,{children:U.map((t,n)=>{const s=W(t.priority),i=Z(t.target_role);return e.jsxs(ve,{children:[e.jsx(ye,{$color:s.color}),e.jsxs(je,{children:[e.jsxs(we,{children:[e.jsx(Ce,{children:t.title||"Untitled"}),e.jsx($e,{children:e.jsxs(ke,{children:[e.jsx(Y,{size:14})," ",Q(t.published_at)]})})]}),e.jsxs(Se,{$color:s.color,$bg:s.bg,children:[e.jsx(s.icon,{size:14}),e.jsx("span",{children:s.label})]})]}),e.jsx(ze,{children:e.jsx(Ae,{dangerouslySetInnerHTML:{__html:(t.content||"").replace(/\n/g,"<br>")}})}),e.jsxs(Te,{children:[e.jsxs("div",{style:{display:"flex",gap:"10px"},children:[e.jsxs(Me,{$color:i.color,children:[e.jsx(i.icon,{size:12})," ",e.jsx("span",{children:i.label})]}),t.expires_at&&e.jsxs(De,{children:[e.jsx(se,{size:12})," ",e.jsxs("span",{children:["Expires: ",C(t.expires_at)]})]})]}),o&&e.jsx(Fe,{onClick:()=>j({isOpen:!0,id:t.id}),children:e.jsx(ie,{size:16})})]})]},t.id||n)})}),R&&e.jsx(Ne,{onClick:()=>m(!1),children:e.jsxs(Oe,{onClick:t=>t.stopPropagation(),children:[e.jsxs(Pe,{children:[e.jsx("h3",{children:"Create New Announcement"}),e.jsx(Ue,{onClick:()=>m(!1),children:e.jsx(E,{size:24})})]}),e.jsxs("form",{onSubmit:X,children:[e.jsxs(Ee,{children:[e.jsxs("div",{className:"mb-3",children:[e.jsx(h,{children:"Title"}),e.jsx(q,{name:"title",value:x.title,onChange:u,required:!0,placeholder:"Announcement Title"})]}),e.jsxs("div",{className:"mb-3",children:[e.jsx(h,{children:"Content"}),e.jsx(He,{name:"content",value:x.content,onChange:u,required:!0,rows:"5",placeholder:"Details..."})]}),e.jsxs("div",{className:"row g-3",children:[e.jsxs("div",{className:"col-md-6",children:[e.jsx(h,{children:"Priority"}),e.jsxs(G,{name:"priority",value:x.priority,onChange:u,children:[e.jsx("option",{value:"low",children:"Low (Info)"}),e.jsx("option",{value:"medium",children:"Medium (Important)"}),e.jsx("option",{value:"high",children:"High (Urgent)"})]})]}),e.jsxs("div",{className:"col-md-6",children:[e.jsx(h,{children:"Target Audience"}),e.jsxs(G,{name:"target_role",value:x.target_role,onChange:u,children:[e.jsx("option",{value:"all",children:"All Users"}),e.jsx("option",{value:"student",children:"Students Only"}),e.jsx("option",{value:"teacher",children:"Teachers Only"})]})]}),e.jsxs("div",{className:"col-12",children:[e.jsx(h,{children:"Expiry Date (Optional)"}),e.jsx(q,{type:"date",name:"expires_at",value:x.expires_at,onChange:u})]})]})]}),e.jsxs(Ie,{children:[e.jsx(qe,{type:"button",onClick:()=>m(!1),children:"Cancel"}),e.jsxs(Ye,{type:"submit",disabled:B,children:[e.jsx(ae,{size:18})," Publish"]})]})]})]})}),e.jsx(te,{isOpen:O.isOpen,onClose:()=>j({isOpen:!1,id:null}),onConfirm:K,title:"Delete Announcement",message:"Are you sure you want to delete this announcement? This action cannot be undone."})]})},ce=r.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1400px;
  margin: 0 auto;
`,de=r.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`,xe=r.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0;
  }
  p {
    color: var(--text-secondary);
    margin: 0;
  }
  svg {
    color: var(--accent-primary);
  }
`,pe=r.button`
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
  transition: all 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
`,me=r.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`,T=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    border-color: ${o=>o.$color};
  }
`,M=r.div`
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
`,D=r.div`
  flex: 1;
`,F=r.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
`,_=r.div`
  font-size: 1.5rem;
  font-weight: 700;
`,ue=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`,ge=r.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
`,he=r.div`
  display: flex;
  gap: 10px;
`,v=r.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid
    ${o=>o.$active?o.$color||"var(--accent-primary)":"var(--border-color)"};
  background: ${o=>o.$active?o.$color||"var(--accent-primary)":"var(--bg-tertiary)"};
  color: ${o=>o.$active?"white":"var(--text-primary)"};
  font-weight: 600;
  cursor: pointer;
`,fe=r.button`
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
`,be=r.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
`,ve=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }
`,ye=r.div`
  height: 4px;
  background: ${o=>o.$color};
`,je=r.div`
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`,we=r.div`
  flex: 1;
`,Ce=r.h3`
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`,$e=r.div`
  display: flex;
  gap: 10px;
`,ke=r.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
`,Se=r.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${o=>o.$bg};
  color: ${o=>o.$color};
  font-size: 0.75rem;
  font-weight: 700;
`,ze=r.div`
  padding: 0 1.5rem 1.5rem 1.5rem;
  flex: 1;
`,Ae=r.div`
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
`,Te=r.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
`,Me=r.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: ${o=>o.$color};
  font-size: 0.75rem;
  font-weight: 600;
`,De=r.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
`,Fe=r.button`
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  &:hover {
    color: #ef4444;
  }
`,_e=r.div`
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
  svg {
    opacity: 0.2;
    margin-bottom: 1rem;
  }
`,Be=r.div`
  text-align: center;
  padding: 4rem;
`,Le=r.div`
  text-align: center;
  padding: 4rem;
  color: #ef4444;
`,Ne=r.div`
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
`,Oe=r.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  overflow: hidden;
`,Pe=r.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  h3 {
    margin: 0;
  }
`,Ue=r.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
`,Ee=r.div`
  padding: 1.5rem;
`,Ie=r.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`,h=r.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 0.9rem;
`,q=r.input`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`,He=r.textarea`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: none;
`,G=r.select`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`,Ye=r.button`
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
`,qe=r.button`
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
`;export{ar as default};
