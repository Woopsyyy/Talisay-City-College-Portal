import{c as a,r as o,j as e,h as j,P as L,S as k,d as r}from"./index-G8dAaOpg.js";import{T as Y}from"./Toast-CfYD9-5b.js";import{S as p}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{T as q}from"./triangle-alert-DHUh_5GK.js";import{I as B}from"./info-JkjM17ht.js";import{M as N}from"./settings-DNNACGN9.js";import{C as D}from"./clock-DTlNUsPA.js";import{C as E}from"./circle-check-big-BkBU9BDV.js";import"./circle-alert-QpU8jh7N.js";const G=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],c=a("chevron-right",G);const P=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]],W=a("circle-question-mark",P);const V=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],O=a("heart",V);const Q=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]],U=a("history",Q);const X=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],J=a("lightbulb",X),Ve=()=>{const[i,d]=o.useState("submit"),[s,x]=o.useState(""),[g,F]=o.useState("Suggestion"),[u,h]=o.useState(!1),[H,y]=o.useState(!1),[b,M]=o.useState([]),[A,f]=o.useState(!1),[l,m]=o.useState({show:!1,message:"",type:"success"}),v=[{id:"Suggestion",icon:J,color:"#3b82f6",desc:"Ideas to improve the campus"},{id:"Complaint",icon:q,color:"#ef4444",desc:"Issues or problems encountered"},{id:"Inquiry",icon:W,color:"#f59e0b",desc:"General questions about services"},{id:"Shoutout",icon:O,color:"#10b981",desc:"Positive feedback for staff/faculty"}],_=async()=>{f(!0);try{const t=await k.getMyFeedbacks(),n=Array.isArray(t)?t:t?.data||[];M(n)}catch(t){console.error(t)}finally{f(!1)}};o.useEffect(()=>{i==="history"&&_()},[i]);const I=async t=>{if(t.preventDefault(),!!s.trim()){h(!0);try{await k.submitFeedback({message:s,category:g}),m({show:!0,message:"Feedback submitted anonymously",type:"success"}),y(!0),x("")}catch(n){m({show:!0,message:"Failed to submit feedback",type:"error"}),console.error(n)}finally{h(!1)}}},R=t=>v.find(n=>n.id===t)?.color||"#6b7280";return e.jsxs(K,{children:[l.show&&e.jsx(Y,{message:l.message,type:l.type,onClose:()=>m(t=>({...t,show:!1}))}),e.jsxs(Z,{children:[e.jsxs(w,{$active:i==="submit",onClick:()=>d("submit"),children:[e.jsx(j,{size:18})," Submit Feedback"]}),e.jsxs(w,{$active:i==="history",onClick:()=>d("history"),children:[e.jsx(U,{size:18})," My Feedbacks"]})]}),i==="submit"?H?e.jsxs(ye,{children:[e.jsx(be,{children:e.jsx(p,{size:64,color:"#10b981"})}),e.jsx(fe,{children:"Thank You!"}),e.jsx(ve,{children:"Your feedback has been submitted anonymously. The administration will review it soon. Thank you for helping us improve our campus."}),e.jsx(z,{onClick:()=>y(!1),children:"Submit Another Feedback"})]}):e.jsxs(ee,{children:[e.jsxs(re,{children:[e.jsxs(te,{children:[e.jsx(ie,{children:"Send Anonymous Feedback"}),e.jsx(oe,{children:"Your identity will remain private. Speak your mind freely."})]}),e.jsxs(se,{onSubmit:I,children:[e.jsxs(S,{children:[e.jsx($,{children:"Select Category"}),e.jsx(ne,{children:v.map(t=>e.jsxs(ae,{type:"button",$active:g===t.id,$color:t.color,onClick:()=>F(t.id),children:[e.jsx(t.icon,{size:20}),e.jsx("span",{children:t.id})]},t.id))})]}),e.jsxs(S,{children:[e.jsx($,{children:"Your Message"}),e.jsx(ce,{placeholder:"Describe your suggestion, concern, or feedback in detail...",value:s,onChange:t=>x(t.target.value),required:!0}),e.jsxs(de,{$limitReached:s.length>5e3,children:[s.length," / 5000 characters"]})]}),e.jsxs(le,{children:[e.jsx(B,{size:18}),e.jsx("p",{children:"This feedback is sent directly to the Dean and Administrators. They can reply to your message, but won't see who sent it."})]}),e.jsx(C,{type:"submit",disabled:u||!s.trim(),children:u?"Processing...":e.jsxs(e.Fragment,{children:["Submit Feedback ",e.jsx(j,{size:18})]})})]})]}),e.jsxs(me,{children:[e.jsxs(T,{children:[e.jsx(pe,{children:"Why give feedback?"}),e.jsxs(xe,{children:[e.jsxs("li",{children:[e.jsx(c,{size:14})," Drive campus improvements"]}),e.jsxs("li",{children:[e.jsx(c,{size:14})," Report facilities issues"]}),e.jsxs("li",{children:[e.jsx(c,{size:14})," Suggest new features"]}),e.jsxs("li",{children:[e.jsx(c,{size:14})," Share your appreciation"]})]})]}),e.jsxs(ge,{children:[e.jsx(p,{size:32}),e.jsx(ue,{children:"100% Anonymous"}),e.jsx(he,{children:"Your student ID is stored for system reference but is NEVER shown to Deans or Admins. Only the message and category are visible to them."})]})]})]}):e.jsxs(je,{children:[e.jsxs(ke,{children:[e.jsx(we,{children:"Your Feedback History"}),e.jsx(Se,{children:"Track your submissions and view administrative responses"})]}),A?e.jsx(L,{variant:"list",count:6}):b.length===0?e.jsxs(Le,{children:[e.jsx(N,{size:48,opacity:.3}),e.jsx("p",{children:"You haven't submitted any feedback yet."}),e.jsx(z,{onClick:()=>d("submit"),children:"Send your first feedback"})]}):e.jsx($e,{children:b.map(t=>e.jsxs(ze,{children:[e.jsxs(Ce,{children:[e.jsx(Te,{$color:R(t.category),children:t.category}),e.jsx(Fe,{children:t.created_at})]}),e.jsx(He,{children:t.message}),e.jsx(Me,{$replied:t.status==="replied",children:t.status==="unread"?e.jsxs(e.Fragment,{children:[e.jsx(D,{size:14})," Waiting for review"]}):e.jsxs(e.Fragment,{children:[e.jsx(E,{size:14})," Replied"]})}),t.status==="replied"&&e.jsxs(Ae,{children:[e.jsxs(_e,{children:[e.jsx(p,{size:14}),"Response from ",t.replied_by_name," (",t.replied_by_role,")"]}),e.jsx(Ie,{children:t.reply}),e.jsx(Re,{children:t.replied_at})]})]},t.id))})]})]})},K=r.div`
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`,Z=r.div`
  display: flex;
  gap: 1rem;
  background: var(--bg-secondary);
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: fit-content;
`,w=r.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: ${i=>i.$active?"var(--accent-primary)":"transparent"};
  color: ${i=>i.$active?"white":"var(--text-secondary)"};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${i=>i.$active?"var(--accent-primary)":"var(--bg-tertiary)"};
  }
`,ee=r.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`,re=r.div`
  background: var(--bg-secondary);
  padding: 2.5rem;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
`,te=r.div`
  margin-bottom: 2rem;
`,ie=r.h2`
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
`,oe=r.p`
  color: var(--text-secondary);
  margin: 0;
`,se=r.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`,S=r.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,$=r.label`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,ne=r.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
`,ae=r.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid ${i=>i.$active?i.$color:"var(--border-color)"};
  background: ${i=>i.$active?`${i.$color}11`:"var(--bg-primary)"};
  color: ${i=>i.$active?i.$color:"var(--text-secondary)"};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${i=>i.$color};
    background: ${i=>`${i.$color}08`};
    transform: translateY(-2px);
  }
`,ce=r.textarea`
  width: 100%;
  min-height: 200px;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 15px;
  padding: 1.25rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-primary)11;
  }
`,de=r.span`
  align-self: flex-end;
  font-size: 0.8rem;
  color: ${i=>i.$limitReached?"#ef4444":"var(--text-tertiary)"};
`,le=r.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  align-items: flex-start;

  p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`,C=r.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 1.25rem;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
    transform: translateY(-3px);
    box-shadow: 0 10px 20px -10px var(--accent-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`,me=r.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,T=r.div`
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid var(--border-color);
`,pe=r.h4`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 700;
`,xe=r.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
`,ge=r(T)`
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-highlight) 100%);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  border: none;
`,ue=r.h4`
  margin: 0.5rem 0 0 0;
  font-weight: 800;
`,he=r.p`
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.9;
  margin: 0;
`,ye=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px solid var(--border-color);
  text-align: center;
  max-width: 600px;
  margin: 2rem auto;
  animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
`,be=r.div`
  width: 100px;
  height: 100px;
  background: #10b98111;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`,fe=r.h2`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1rem;
`,ve=r.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
`,z=r(C)`
  padding: 1rem 2rem;
`,je=r.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: slideUp 0.3s ease-out;
`,ke=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,we=r.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
`,Se=r.p`
  color: var(--text-secondary);
  margin: 0;
`,$e=r.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,ze=r.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: transform 0.2s;

  &:hover {
    transform: translateX(5px);
    border-color: var(--accent-primary)44;
  }
`,Ce=r.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`,Te=r.span`
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${i=>i.$color}22;
  color: ${i=>i.$color};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,Fe=r.span`
  font-size: 0.8rem;
  color: var(--text-tertiary);
`,He=r.p`
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
`,Me=r.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${i=>i.$replied?"#10b981":"#f59e0b"};
  text-transform: uppercase;
`,Ae=r.div`
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border-left: 4px solid #10b981;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,_e=r.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #10b981;
  text-transform: uppercase;
`,Ie=r.p`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
`,Re=r.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
`,Le=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
  text-align: center;
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px dashed var(--border-color);
  gap: 1.5rem;
  color: var(--text-tertiary);
`;export{Ve as default};
