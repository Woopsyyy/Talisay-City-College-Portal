import{c as H,r as o,j as e,h as U,o as p,d as r}from"./index-G8dAaOpg.js";import{T as q}from"./Toast-CfYD9-5b.js";import{S as $}from"./SkeletonLoader-BlW5p720.js";import{C as z}from"./clock-DTlNUsPA.js";import{C}from"./circle-check-big-BkBU9BDV.js";import{F as G}from"./funnel-FWZ3B0qw.js";import{M as N}from"./settings-DNNACGN9.js";import{U as P}from"./user-DNE8y8gH.js";import{S as V}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{C as Y}from"./circle-alert-QpU8jh7N.js";import"./triangle-alert-DHUh_5GK.js";const W=[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]],J=H("inbox",W),Ae=()=>{const[s,M]=o.useState([]),[D,g]=o.useState(!0),[i,d]=o.useState("unread"),[a,b]=o.useState(null),[l,y]=o.useState(""),[h,f]=o.useState(!1),[v,B]=o.useState({unread:0,replied:0,total:0}),[c,n]=o.useState({show:!1,message:"",type:"success"}),j=async()=>{g(!0);try{const t=await p.getFeedbacks(i),w=Array.isArray(t)?t:t?.data||[];M(w);const S=await p.getFeedbackStats(),E=S?.data||S||{unread:0,replied:0,total:0};B(E)}catch(t){n({show:!0,message:"Failed to load feedbacks",type:"error"}),console.error(t)}finally{g(!1)}};o.useEffect(()=>{j()},[i]);const I=async t=>{if(t.preventDefault(),!!l.trim()){f(!0);try{await p.replyFeedback(a.id,l),n({show:!0,message:"Reply sent successfully",type:"success"}),y(""),b(null),j()}catch{n({show:!0,message:"Failed to send reply",type:"error"})}finally{f(!1)}}},k=t=>{switch(t?.toLowerCase()){case"suggestion":return"#3b82f6";case"complaint":return"#ef4444";case"inquiry":return"#f59e0b";case"shoutout":return"#10b981";default:return"#6b7280"}};return e.jsxs(K,{children:[c.show&&e.jsx(q,{message:c.message,type:c.type,onClose:()=>n(t=>({...t,show:!1}))}),e.jsxs(O,{children:[e.jsxs(Q,{children:[e.jsx(J,{size:24,color:"var(--accent-primary)"}),e.jsxs("div",{children:[e.jsx(X,{children:"Feedback Inbox"}),e.jsx(Z,{children:"Manage anonymous feedback from students"})]})]}),e.jsxs(ee,{children:[e.jsxs(F,{$type:"unread",children:[e.jsx(R,{children:"Unread"}),e.jsx(T,{children:v.unread})]}),e.jsxs(F,{$type:"replied",children:[e.jsx(R,{children:"Replied"}),e.jsx(T,{children:v.replied})]})]})]}),e.jsxs(re,{children:[e.jsxs(x,{$active:i==="unread",onClick:()=>d("unread"),children:[e.jsx(z,{size:16})," Unread"]}),e.jsxs(x,{$active:i==="replied",onClick:()=>d("replied"),children:[e.jsx(C,{size:16})," Replied"]}),e.jsxs(x,{$active:i==="",onClick:()=>d(""),children:[e.jsx(G,{size:16})," All"]})]}),e.jsxs(te,{children:[e.jsx(se,{children:D?e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",width:"100%"},children:[e.jsx($,{}),e.jsx($,{})]}):s.length===0?e.jsxs(L,{children:[e.jsx(N,{size:48,opacity:.3}),e.jsx("p",{children:"No feedbacks found in this category."})]}):s.map(t=>e.jsxs(ae,{$selected:a?.id===t.id,onClick:()=>b(t),children:[e.jsxs(oe,{children:[e.jsx(A,{$color:k(t.category),children:t.category}),e.jsx(m,{children:t.created_at})]}),e.jsx(ie,{children:t.message}),e.jsx(ne,{children:e.jsxs(_,{$replied:t.status==="replied",children:[t.status==="unread"?e.jsx(z,{size:12}):e.jsx(C,{size:12}),t.status]})})]},t.id))}),e.jsx(de,{children:a?e.jsxs(le,{children:[e.jsxs(ce,{children:[e.jsxs(pe,{children:[e.jsx(A,{$color:k(a.category),children:a.category}),e.jsxs(m,{children:["Received on ",a.created_at]})]}),e.jsx(_,{$replied:a.status==="replied",children:a.status})]}),e.jsxs(xe,{children:[e.jsxs(u,{children:[e.jsx(P,{size:14})," Anonymous Student Message"]}),e.jsx(me,{children:a.message})]}),a.status==="replied"&&e.jsxs(ue,{children:[e.jsxs(u,{children:[e.jsx(V,{size:14}),"Response by ",a.replied_by_name," (",a.replied_by_role,")"]}),e.jsx(ge,{children:a.reply}),e.jsxs(m,{style:{marginTop:"8px"},children:["Replied at ",a.replied_at]})]}),a.status==="unread"&&e.jsxs(be,{onSubmit:I,children:[e.jsxs(u,{children:[e.jsx(U,{size:14})," Formulate Response"]}),e.jsx(ye,{placeholder:"Type your reply here...",value:l,onChange:t=>y(t.target.value),required:!0}),e.jsx(he,{type:"submit",disabled:h,children:h?"Sending...":"Send Reply"})]})]}):e.jsxs(fe,{children:[e.jsx(Y,{size:48,opacity:.3}),e.jsx("p",{children:"Select a feedback to view details and respond."})]})})]})]})},K=r.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  animation: fadeIn 0.3s ease-out;
`,O=r.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`,Q=r.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,X=r.h1`
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
`,Z=r.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
`,ee=r.div`
  display: flex;
  gap: 1rem;
`,F=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  border-bottom: 3px solid ${s=>s.$type==="unread"?"#f59e0b":"#10b981"};
`,R=r.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-tertiary);
`,T=r.span`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
`,re=r.div`
  display: flex;
  gap: 0.75rem;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 10px;
  width: fit-content;
  border: 1px solid var(--border-color);
`,x=r.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: ${s=>s.$active?"var(--accent-primary)":"transparent"};
  color: ${s=>s.$active?"white":"var(--text-secondary)"};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${s=>s.$active?"var(--accent-primary)":"var(--bg-tertiary)"};
  }
`,te=r.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 500px;
`,se=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  max-height: calc(100vh - 300px);

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`,ae=r.div`
  padding: 1.25rem;
  background: ${s=>s.$selected?"var(--bg-tertiary)":"var(--bg-primary)"};
  border: 1px solid ${s=>s.$selected?"var(--accent-primary)":"var(--border-color)"};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--accent-primary);
  }
`,oe=r.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`,A=r.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${s=>s.$color}22;
  color: ${s=>s.$color};
  text-transform: uppercase;
`,m=r.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
`,ie=r.p`
  font-size: 0.9rem;
  color: var(--text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`,ne=r.div`
  display: flex;
  justify-content: flex-end;
`,_=r.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${s=>s.$replied?"#10b981":"#f59e0b"};
`,de=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
`,le=r.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: slideRight 0.3s ease-out;
`,ce=r.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
`,pe=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,xe=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,u=r.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,me=r.div`
  background: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  border-left: 4px solid var(--accent-primary);
`,ue=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #10b98111;
  border: 1px solid #10b98133;
  border-radius: 12px;
`,ge=r.p`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
`,be=r.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,ye=r.textarea`
  width: 100%;
  min-height: 150px;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`,he=r.button`
  align-self: flex-end;
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--accent-highlight);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;r.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: var(--text-secondary);
`;const L=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-tertiary);
  text-align: center;
  gap: 1rem;
`,fe=r(L)`
  height: 100%;
`;export{Ae as default};
