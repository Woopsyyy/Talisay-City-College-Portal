import{c as q,a as G,r as u,j as e,P as O,S as W,d as t}from"./index-G8dAaOpg.js";import{M as J}from"./settings-DNNACGN9.js";import{B as I}from"./building-2-BmFCJ1tq.js";import{L as K}from"./layers-CqdCGdQ0.js";import{C as Q}from"./calendar-CG0mXhiR.js";import{U as _}from"./users-CneqRZry.js";import{C as F}from"./circle-check-big-BkBU9BDV.js";import{T as X}from"./triangle-alert-DHUh_5GK.js";import{C as Z}from"./circle-alert-QpU8jh7N.js";const ee=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],ne=q("wallet",ee),ge=()=>{const a=G(),[n,L]=u.useState({building:"Unassigned",floor:"",room:"",year:"N/A",section:"N/A",paymentStatus:"paid",owingAmount:null,sanctions:null,sanctionText:"No",sanctionDays:null,sanctionNote:""}),[U,V]=u.useState(!0),[v,H]=u.useState(null);u.useEffect(()=>{(async()=>{try{const r=await W.getAssignment();let g="Unassigned",b="",w="",S="N/A",z="N/A",N="paid",A=null,j=null,m="No",f=null,y="",T="-",k="Regular";const s=Array.isArray(r)&&r.length>0?r[0]:r;if(s){if(s.grade_level){const x=String(s.grade_level).match(/^(\d)/);S=x?x[1]:s.grade_level}z=s.section_name||s.section||"N/A",N=s.payment||"paid",A=s.amount_lacking||null,j=s.sanctions||null,T=s.gender||"-",k=s.student_status||"Regular",s.sanction_reason&&(y=s.sanction_reason),s.building&&(g="Building "+s.building),s.floor&&parseInt(s.floor)>0&&(b=P(s.floor)+" Floor"),s.room&&(w="Room "+s.room)}if(j||s?.sanction_reason){const x=s?.sanction_reason||"",D=x.match(/(\d{4}-\d{2}-\d{2})/);if(D){const p=new Date(D[1]),$=new Date;if(p>$){const C=Math.floor((p-$)/864e5);f=C,m=C+" days"}else m="Expired"}else{const p=x.match(/(\d+)\s*days?/i);p?(f=parseInt(p[1]),m=f+" days"):x.trim()?(m="Yes",y=x.trim()):m="Yes"}}L({building:g,floor:b,room:w,year:S,section:z,paymentStatus:N,owingAmount:A,sanctions:j,sanctionText:m,sanctionDays:f,sanctionNote:y,gender:T,studentStatus:k})}catch(r){console.error(r),H(r.message||"Failed to load records")}finally{V(!1)}})()},[]);const P=o=>{if(o=parseInt(o),o<=0)return"";const r=["th","st","nd","rd","th","th","th","th","th","th"],g=o%100;return g>=11&&g<=13?o+"th":o+(r[o%10]||"th")};return U?e.jsx(O,{variant:"cards"}):v?e.jsx(R,{children:e.jsxs("div",{className:"alert alert-danger",children:["Error loading records: ",v]})}):e.jsxs(R,{children:[e.jsxs(se,{children:[e.jsxs("div",{children:[e.jsx("h2",{children:"My Records"}),e.jsx("p",{children:"View your academic and financial information"})]}),e.jsxs(te,{onClick:()=>a("/home/feedback"),children:[e.jsx(J,{size:16}),"Send Feedback"]})]}),e.jsxs(ae,{children:[e.jsxs(B,{children:[e.jsxs(M,{children:[e.jsx(I,{size:20}),e.jsx("h3",{children:"Assignment Details"})]}),e.jsxs(E,{children:[e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(I,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Building"}),e.jsx(c,{children:n.building})]})]}),e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(K,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Floor / Room"}),e.jsx(c,{children:n.floor&&n.room?`${n.floor} / ${n.room}`:n.floor||n.room||"N/A"})]})]}),e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(Q,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Year"}),e.jsx(c,{children:n.year})]})]}),e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(_,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Section"}),e.jsx(c,{children:n.section})]})]}),e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(_,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Gender"}),e.jsx(c,{children:n.gender})]})]}),e.jsxs(h,{children:[e.jsx(i,{children:e.jsx(F,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Student Status"}),e.jsx(c,{children:n.studentStatus})]})]})]})]}),e.jsxs(B,{children:[e.jsxs(M,{children:[e.jsx(ne,{size:20}),e.jsx("h3",{children:"Financial Status"})]}),e.jsxs(E,{children:[e.jsxs(Y,{$status:n.paymentStatus==="owing"?"warning":"success",children:[e.jsx(i,{children:n.paymentStatus==="owing"?e.jsx(X,{size:20}):e.jsx(F,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Outstanding Balance"}),e.jsx(c,{children:n.paymentStatus==="owing"&&n.owingAmount?"₱"+parseFloat(n.owingAmount).toFixed(2):n.paymentStatus==="owing"?"Amount pending":"₱0.00"})]})]}),(n.sanctions||n.sanctionDays!==null&&n.sanctionDays>0||n.sanctionText.includes("days")||n.sanctionText==="Yes"||n.sanctionText==="Expired")&&e.jsxs(Y,{$status:"danger",style:{marginTop:"1rem"},children:[e.jsx(i,{style:{color:"#ef4444"},children:e.jsx(Z,{size:20})}),e.jsxs(d,{children:[e.jsx(l,{children:"Sanctioned"}),e.jsx(c,{children:n.sanctionDays!==null&&n.sanctionDays>0?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-danger fw-bold",children:n.sanctionDays})," days remaining"]}):n.sanctionText.includes("days")?e.jsx("span",{className:"text-danger fw-bold",children:n.sanctionText}):n.sanctionText==="Expired"?e.jsx("span",{className:"text-muted",children:"Sanction expired"}):n.sanctionText==="Yes"?e.jsx("span",{className:"text-danger",children:"Active Sanction"}):e.jsx("span",{children:n.sanctionText})}),n.sanctionNote&&e.jsxs("div",{className:"mt-2 pt-2 border-top border-secondary-subtle",children:[e.jsx("div",{style:{fontSize:"0.8rem",color:"var(--text-secondary)",fontWeight:600},children:"Reason:"}),e.jsx("div",{style:{fontSize:"0.9rem",color:"var(--text-primary)"},children:n.sanctionNote})]})]})]})]})]})]})]})},R=t.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1200px;
  margin: 0 auto;
`,se=t.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`,te=t.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
  }
`,ae=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.5rem;
`,B=t.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,M=t.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`,E=t.div`
  padding: 1.5rem;
  flex: 1;
`,h=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  &:last-child { border-bottom: none; padding-bottom: 0; }
  &:first-child { padding-top: 0; }
`,i=t.div`
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
`,d=t.div`
  display: flex; flex-direction: column;
  gap: 2px;
`,l=t.span`
  font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;
`,c=t.span`
  font-weight: 600; color: var(--text-primary); font-size: 1rem;
`,Y=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: ${a=>a.$status==="warning"?"rgba(234, 179, 8, 0.1)":a.$status==="danger"?"rgba(239, 68, 68, 0.1)":"rgba(34, 197, 94, 0.1)"};
  border: 1px solid ${a=>a.$status==="warning"?"rgba(234, 179, 8, 0.3)":a.$status==="danger"?"rgba(239, 68, 68, 0.3)":"rgba(34, 197, 94, 0.3)"};
  
  ${i} {
    background: white;
    color: ${a=>a.$status==="warning"?"#ca8a04":a.$status==="danger"?"#ef4444":"#16a34a"};
  }
`;export{ge as default};
