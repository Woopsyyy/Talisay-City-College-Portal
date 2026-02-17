import{c as X,u as Ge,r as o,o as b,j as e,X as ce,d as a}from"./index-G8dAaOpg.js";import{C as de,Y as Je}from"./constants-CkFOpdC7.js";import{T as Ke}from"./Toast-CfYD9-5b.js";import{D as Xe}from"./DeleteModal-BwSZan_D.js";import{S as me}from"./SkeletonLoader-BlW5p720.js";import{S as ue,C as he}from"./shield-alert-CasghU5a.js";import{U as Qe}from"./users-CneqRZry.js";import{S as Ze,C as pe}from"./search-DDp6GwTl.js";import{F as es}from"./funnel-FWZ3B0qw.js";import{C as V}from"./circle-alert-QpU8jh7N.js";import{T as ss}from"./trash-2-D6PG7ToH.js";import{S as xe}from"./save-ozLe3sfg.js";import"./circle-check-big-BkBU9BDV.js";import"./triangle-alert-DHUh_5GK.js";const ns=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],ts=X("square-pen",ns);const rs=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],ge=X("user-check",rs);const as=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],os=X("user-plus",as),Fs=({mode:w=null})=>{const{user:T}=Ge(),g=(Array.isArray(T?.roles)?T.roles:[T?.role||"student"]).includes("admin"),h=w==="osas",y=w==="treasury",j=w==="dean"||w==="nt",c=!w||w==="admin",Ce=g&&c,Q=c&&g||y,Z=c&&g||h,[ee,se]=o.useState([]),[F,Ne]=o.useState([]),[q,p]=o.useState(!1),[Y,R]=o.useState(!1),[Ae,f]=o.useState(!1),[C,N]=o.useState({days:"",reason:""}),[B,ne]=o.useState({show:!1,message:"",type:"success"}),[D,te]=o.useState({isOpen:!1,id:null}),[t,v]=o.useState({id:null,full_name:"",existing_user_id:"",year:"3",section:"",department:"",major:"",semester:"1st Semester",lacking_payment:"no",amount_lacking:"",has_sanction:"no",sanction_reason:"",student_status:"Regular"}),[re,ae]=o.useState([]),[ze,$]=o.useState(!1),z=o.useRef(null),[r,Me]=o.useState({query:"",year:"",section:"",department:"",major:"",lacking_payment:"all",has_sanctions:"all"}),[M,H]=o.useState(1),[O]=o.useState(10);o.useEffect(()=>{P()},[]),o.useEffect(()=>()=>{z.current&&clearTimeout(z.current)},[]);const l=(s,n="success")=>{ne({show:!0,message:s,type:n})},P=async()=>{try{p(!0);const[s,n]=await Promise.all([b.getUserAssignments(),b.getSections()]);se(Array.isArray(s)?s:[]),Ne(Array.isArray(n)?n:[])}catch(s){console.error("Error loading manage students data:",s),l("Failed to load data.","error")}finally{p(!1)}},A=s=>{const{name:n,value:i}=s.target;v(S=>{const x={...S,[n]:i};if(n==="section"){const d=F.find(I=>I.section_name===i);d&&(x.year=ie(d.grade_level),x.department=d.course||d.department||"",x.major=d.major||"")}if(n==="lacking_payment"&&i==="no"&&(x.amount_lacking=""),n==="has_sanction"&&i==="yes"){const d=S.sanction_reason||"",I=d.match(/(\d+)\s*days?/i),We=I?I[1]:"",Ve=d.replace(/^\d+\s*days?:\s*/i,"").trim();N({days:We,reason:Ve}),setTimeout(()=>f(!0),100)}return n==="has_sanction"&&i==="no"&&(x.sanction_reason="",N({days:"",reason:""})),x})},Pe=async s=>{const n=s.target.value;if(v(i=>({...i,full_name:n,existing_user_id:""})),z.current&&clearTimeout(z.current),n.length<2){ae([]),$(!1);return}z.current=setTimeout(async()=>{try{const i=await b.getUserSuggestions(n);ae(i||[]),$(!0)}catch(i){console.error("Error searching users:",i)}},300)},Ue=s=>{v(n=>({...n,full_name:s.full_name||s.username,existing_user_id:s.id})),$(!1)},Fe=()=>{if(!t.full_name){l("Please select or enter a user first.","error");return}R(!0)},Re=s=>{v({id:s.id||null,full_name:s.full_name||s.username,existing_user_id:s.user_id,year:s.year?String(s.year):"3",section:s.section||"",department:s.department||"",major:s.major||"",semester:s.semester||"1st Semester",lacking_payment:s.payment==="owing"?"yes":"no",amount_lacking:s.amount_lacking||"",has_sanction:s.sanctions||s.sanctions===1?"yes":"no",sanction_reason:s.sanction_reason||"",student_status:s.student_status||"Regular"}),R(!0)},De=s=>{const n=s.sanction_reason||"",i=n.match(/(\d+)\s*days?/i),S=i?i[1]:"",x=n.replace(/^\d+\s*days?:\s*/i,"").trim();v(d=>({...d,id:s.id,sanction_reason:n})),N({days:S,reason:x}),f(!0)},E=()=>{R(!1),v({id:null,full_name:"",existing_user_id:"",year:"3",section:"",department:"",major:"",semester:"1st Semester",lacking_payment:"no",amount_lacking:"",has_sanction:"no",sanction_reason:"",student_status:"Regular"})},Oe=async s=>{if(s.preventDefault(),t.has_sanction==="yes"&&!t.sanction_reason){l("Please details (days and reason) for the sanction.","error"),N({days:"",reason:""}),f(!0);return}try{p(!0);const n={...t,user_id:t.existing_user_id||null,section:t.section,department:t.department,major:t.major,semester:t.semester,payment:t.lacking_payment==="yes"?"owing":"paid",amount_lacking:t.lacking_payment==="yes"?t.amount_lacking:null,sanctions:t.has_sanction==="yes",sanction_reason:t.has_sanction==="yes"?t.sanction_reason:"",student_status:t.student_status};t.id?(await b.updateUserAssignment(t.id,n),l("Assignment updated successfully!")):(await b.createUserAssignment(n),l("User assigned successfully!")),E(),P()}catch(n){l(`Error saving assignment: ${n.message}`,"error")}finally{p(!1)}},k=s=>{const{name:n,value:i}=s.target;Me(S=>({...S,[n]:i})),H(1)},Ee=s=>{te({isOpen:!0,id:s})},oe=()=>{te({isOpen:!1,id:null})},Le=async()=>{if(!C.days||!C.reason){l("Please enter both days and reason for sanction","error");return}const s=`${C.days} days: ${C.reason}`;if(t.id&&!Y)try{p(!0);const n={sanctions:!0,sanction_reason:s};await b.updateUserAssignment(t.id,n),l("Sanction updated successfully"),f(!1),P()}catch(n){l(`Error updating sanction: ${n.message}`,"error")}finally{p(!1)}else v(n=>({...n,sanction_reason:s})),f(!1),l("Sanction details saved")},Ie=async s=>{try{p(!0);const n={sanctions:!1,sanction_reason:""};await b.updateUserAssignment(s,n),l("Sanction cleared"),P()}catch(n){l(`Error clearing sanction: ${n.message}`,"error")}finally{p(!1)}},Te=async s=>{try{p(!0);const n={payment:"paid",amount_lacking:0};await b.updateUserAssignment(s,n),l("Marked as paid"),P()}catch(n){l(`Error updating payment: ${n.message}`,"error")}finally{p(!1)}},qe=async()=>{if(D.id)try{await b.deleteUserAssignment(D.id),se(s=>s.filter(n=>n.id!==D.id)),l("Assignment deleted."),oe()}catch(s){l(`Error deleting assignment: ${s.message}`,"error")}},Ye=o.useMemo(()=>[...new Set(F.map(s=>s.section_name))].sort(),[F]),Be=o.useMemo(()=>Object.keys(de),[]),$e=o.useMemo(()=>r.department?de[r.department]:[],[r.department]),ie=s=>{if(!s)return"";const n=String(s).match(/^(\d)/);return n?n[1]:s},He=F.slice().sort((s,n)=>s.section_name.localeCompare(n.section_name)),L=o.useMemo(()=>ee.filter(s=>{if(r.query){const n=r.query.toLowerCase(),i=s.username?.toLowerCase().includes(n)||s.full_name?.toLowerCase().includes(n),S=s.section?.toLowerCase().includes(n),x=s.department?.toLowerCase().includes(n),d=s.major?.toLowerCase().includes(n);if(!(i||S||x||d))return!1}return!(r.year&&String(s.year)!==String(r.year)||r.section&&s.section!==r.section||r.department&&s.department!==r.department||r.major&&s.major!==r.major||r.lacking_payment==="lacking"&&s.payment!=="owing"||r.lacking_payment==="paid"&&s.payment==="owing"||r.has_sanctions==="with"&&!s.sanctions||r.has_sanctions==="without"&&s.sanctions)}),[ee,r]),W=Math.ceil(L.length/O),le=o.useMemo(()=>{const s=(M-1)*O;return L.slice(s,s+O)},[L,M,O]);return e.jsxs(is,{children:[e.jsx(ls,{children:e.jsxs("div",{children:[e.jsxs("h2",{children:[h?e.jsx(ue,{size:32}):y?e.jsx(he,{size:32}):j?e.jsx(ge,{size:32}):e.jsx(Qe,{size:32}),h?" Sanction Management":y?" Financial Status":j?" Student Assignments":" Manage Students"]}),e.jsx("p",{children:h?"Monitor and manage student disciplinary sanctions.":y?"Manage student payment statuses and financial balances.":j?"Assign student sections, semesters, and academic status.":"Manage student assignments, financial status, and sanctions."})]})}),B.show&&e.jsx(Ke,{message:B.message,type:B.type,onClose:()=>ne(s=>({...s,show:!1}))}),e.jsxs("div",{className:"row g-4 mb-5",children:[g&&c&&e.jsx("div",{className:"col-12",children:e.jsxs(G,{style:{overflow:"visible"},children:[e.jsxs(J,{children:[e.jsx(os,{size:20}),e.jsx("h3",{children:"Assign New Student"})]}),e.jsxs(ye,{className:"p-4 d-flex gap-3 align-items-end flex-wrap",children:[e.jsxs("div",{className:"flex-grow-1 position-relative",style:{minWidth:"300px"},children:[e.jsx(m,{children:"Search User"}),e.jsxs(cs,{children:[e.jsx(Ze,{size:18,className:"search-icon"}),e.jsx(U,{type:"text",placeholder:"Type name or username...",value:t.full_name,onChange:Pe,style:{paddingLeft:"38px"}})]}),ze&&re.length>0&&e.jsx(ds,{children:re.map(s=>e.jsxs(ms,{onClick:()=>Ue(s),children:[e.jsx("strong",{children:s.full_name||s.username}),e.jsx("small",{children:s.username})]},s.id))})]}),e.jsxs(_,{onClick:Fe,disabled:!t.full_name,children:["Continue ",e.jsx(pe,{size:18})]})]})]})}),e.jsx("div",{className:"col-12",children:e.jsxs(G,{children:[e.jsxs(J,{children:[e.jsx(us,{children:e.jsx(es,{size:20})}),e.jsx("h3",{children:"Filter Records"})]}),e.jsx(ye,{className:"p-4",children:e.jsxs("div",{className:"row g-3",children:[e.jsx("div",{className:"col-md-12",children:e.jsx(U,{type:"text",name:"query",placeholder:"Search by full name, section, department, or major...",value:r.query,onChange:k})}),e.jsx("div",{className:"col-md-3",children:e.jsxs(u,{name:"year",value:r.year,onChange:k,children:[e.jsx("option",{value:"",children:"All Years"}),Je.map(s=>e.jsxs("option",{value:s,children:[s," Year"]},s))]})}),e.jsx("div",{className:"col-md-3",children:e.jsxs(u,{name:"section",value:r.section,onChange:k,children:[e.jsx("option",{value:"",children:"All Sections"}),Ye.map(s=>e.jsx("option",{value:s,children:s},s))]})}),!j&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"col-md-3",children:e.jsxs(u,{name:"department",value:r.department,onChange:k,children:[e.jsx("option",{value:"",children:"All Departments"}),Be.map(s=>e.jsx("option",{value:s,children:s},s))]})}),e.jsx("div",{className:"col-md-3",children:e.jsxs(u,{name:"major",value:r.major,onChange:k,children:[e.jsx("option",{value:"",children:"All Majors"}),$e.map(s=>e.jsx("option",{value:s,children:s},s))]})})]}),e.jsxs("div",{className:"col-12 d-flex gap-4 pt-2",children:[Q&&e.jsxs("div",{style:{flex:1},children:[e.jsx(m,{children:"Payment Filter"}),e.jsxs(u,{name:"lacking_payment",value:r.lacking_payment,onChange:k,children:[e.jsx("option",{value:"all",children:"All Financial Status"}),e.jsx("option",{value:"paid",children:"Paid (No debt)"}),e.jsx("option",{value:"lacking",children:"Lacking Payment"})]})]}),Z&&e.jsxs("div",{style:{flex:1},children:[e.jsx(m,{children:"Sanction Filter"}),e.jsxs(u,{name:"has_sanctions",value:r.has_sanctions,onChange:k,children:[e.jsx("option",{value:"all",children:"All Disciplines"}),e.jsx("option",{value:"with",children:"Sanctioned Students"}),e.jsx("option",{value:"without",children:"Without Sanctions"})]})]})]})]})})]})}),e.jsx("div",{className:"col-12",children:e.jsxs(G,{children:[e.jsx(J,{children:e.jsxs("h3",{children:["User Assignments (",L.length,")"]})}),e.jsx("div",{className:"table-responsive",children:e.jsxs(hs,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Full Name"}),g&&c&&e.jsx("th",{children:"Brief Role"}),e.jsx("th",{children:"Year"}),e.jsx("th",{children:"Section"}),j&&e.jsx("th",{children:"Status"}),!j&&e.jsx("th",{children:"Department"}),y&&e.jsx("th",{children:"Payment"}),h&&e.jsx("th",{children:"Sanctions"}),c&&g&&e.jsx(e.Fragment,{children:e.jsx("th",{children:"Status"})}),e.jsx("th",{className:"text-end",children:"Actions"})]})}),e.jsx("tbody",{children:q&&!Y?e.jsx("tr",{children:e.jsxs("td",{colSpan:"10",className:"p-4",children:[e.jsx(me,{}),e.jsx(me,{})]})}):le.length===0?e.jsx("tr",{children:e.jsxs("td",{colSpan:"10",className:"text-center py-5 text-muted",children:[e.jsx(V,{className:"mb-2",size:32,style:{opacity:.5}}),e.jsx("div",{children:"No assignments found."})]})}):le.map(s=>e.jsxs("tr",{children:[e.jsx("td",{className:"fw-bold",children:s.username||s.full_name||"N/A"}),c&&g&&e.jsx("td",{children:e.jsx("span",{className:`badge ${s.user_role==="admin"?"bg-danger":s.user_role==="teacher"?"bg-info":"bg-success"}`,children:s.user_role||"student"})}),e.jsx("td",{children:s.year}),e.jsx("td",{children:s.section}),j&&e.jsx("td",{children:s.student_status||"Regular"}),!j&&e.jsx("td",{children:s.department}),Q&&e.jsx("td",{children:s.payment==="owing"?e.jsxs(je,{className:"warning",children:["₱",s.amount_lacking||"0"]}):e.jsx("span",{className:"text-success small",children:"Paid"})}),Z&&e.jsx("td",{children:s.sanctions===1||s.sanctions===!0?e.jsx(je,{className:"danger",children:"Sanctioned"}):e.jsx("span",{className:"text-muted small",children:"None"})}),c&&g&&e.jsx(e.Fragment,{children:e.jsx("td",{children:s.student_status||"Regular"})}),e.jsx("td",{className:"text-end",children:e.jsx("div",{style:{display:"flex",gap:"8px",justifyContent:"flex-end"},children:h&&r.has_sanctions==="without"?e.jsxs(_,{style:{padding:"6px 12px",height:"auto",fontSize:"0.8rem"},onClick:()=>{v(n=>({...n,id:s.id,full_name:s.full_name,has_sanction:"yes"})),f(!0)},children:[e.jsx(ue,{size:14})," Add Sanction"]}):y&&r.lacking_payment==="paid"?e.jsxs(_,{style:{padding:"6px 12px",height:"auto",fontSize:"0.8rem",background:"#f59e0b"},onClick:()=>{v(n=>({...n,id:s.id,full_name:s.full_name,lacking_payment:"yes"})),R(!0)},children:[e.jsx(he,{size:14})," Add Debt"]}):y&&r.lacking_payment==="lacking"?e.jsxs(_,{style:{padding:"6px 12px",height:"auto",fontSize:"0.8rem",background:"#10b981"},onClick:()=>Te(s.id),children:[e.jsx(ge,{size:14})," Mark Paid"]}):h&&r.has_sanctions==="with"?e.jsxs(_,{style:{padding:"6px 12px",height:"auto",fontSize:"0.8rem",background:"#10b981"},onClick:()=>Ie(s.id),children:[e.jsx(pe,{size:14})," Clear Sanction"]}):e.jsxs(e.Fragment,{children:[e.jsx(K,{style:{color:"var(--accent-primary)",borderColor:"var(--accent-primary)"},onClick:()=>Re(s),title:"Edit Details",children:e.jsx(ts,{size:16})}),(c||h)&&(s.sanctions===1||s.sanctions===!0)&&e.jsx(K,{style:{color:"#f59e0b",borderColor:"#f59e0b"},onClick:()=>De(s),title:"View/Edit Sanction",children:e.jsx(V,{size:16})}),g&&c&&s.id&&e.jsx(K,{onClick:()=>Ee(s.id),title:"Remove Assignment",children:e.jsx(ss,{size:16})})]})})})]},s.id))})]})}),W>1&&e.jsxs(gs,{children:[e.jsx(we,{disabled:M===1,onClick:()=>H(s=>s-1),children:"Previous"}),e.jsxs(ys,{children:["Page ",M," of ",W]}),e.jsx(we,{disabled:M===W,onClick:()=>H(s=>s+1),children:"Next"})]})]})})]}),Y&&e.jsx(fe,{onClick:E,children:e.jsxs(ve,{onClick:s=>s.stopPropagation(),children:[e.jsxs(be,{children:[e.jsx("h3",{children:Ce?"Full Assignment Details":h?"Update Sanction":y?"Update Payment Info":"Update Academic Status"}),e.jsx(_e,{onClick:E,children:e.jsx(ce,{size:24})})]}),e.jsxs("form",{onSubmit:Oe,children:[e.jsxs(Se,{children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("label",{className:"d-block mb-1 font-weight-bold",children:"Selected User"}),e.jsx(ps,{children:e.jsx("h4",{children:t.full_name})})]}),e.jsxs("div",{className:"row g-3",children:[(c||j)&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"col-12",children:[e.jsx(m,{children:"Section"}),e.jsxs(u,{name:"section",value:t.section,onChange:A,required:!0,children:[e.jsx("option",{value:"",children:"Select Section"}),He.map(s=>e.jsxs("option",{value:s.section_name,children:[s.section_name," (",ie(s.grade_level)," - ",s.course||s.department||"Gen",")"]},s.id))]})]}),e.jsxs("div",{className:"col-md-6",children:[e.jsx(m,{children:"Semester"}),e.jsxs(u,{name:"semester",value:t.semester,onChange:A,children:[e.jsx("option",{value:"1st Semester",children:"1st Semester"}),e.jsx("option",{value:"2nd Semester",children:"2nd Semester"})]})]}),e.jsxs("div",{className:"col-md-6",children:[e.jsx(m,{children:"Student Status"}),e.jsxs(u,{name:"student_status",value:t.student_status,onChange:A,children:[e.jsx("option",{value:"Regular",children:"Regular"}),e.jsx("option",{value:"Irregular",children:"Irregular"})]})]})]}),(c||y)&&e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"row g-3",children:[e.jsxs("div",{className:"col-md-6",children:[e.jsx(m,{children:"Lacking Payment?"}),e.jsxs(u,{name:"lacking_payment",value:t.lacking_payment,onChange:A,children:[e.jsx("option",{value:"no",children:"No (Paid/OK)"}),e.jsx("option",{value:"yes",children:"Yes (Lacking)"})]})]}),t.lacking_payment==="yes"&&e.jsxs("div",{className:"col-md-6 fade-in",children:[e.jsx(m,{children:"Amount Lacking (₱)"}),e.jsx(U,{type:"number",name:"amount_lacking",placeholder:"e.g. 500",value:t.amount_lacking,onChange:A,required:!0})]})]})}),(c||h)&&e.jsxs("div",{className:"col-12",children:[e.jsx(m,{children:"Has Sanction?"}),e.jsxs(u,{name:"has_sanction",value:t.has_sanction,onChange:A,children:[e.jsx("option",{value:"no",children:"No"}),e.jsx("option",{value:"yes",children:"Yes"})]})]})]})]}),e.jsxs(ke,{children:[e.jsx(xs,{type:"button",onClick:E,children:"Cancel"}),e.jsx(_,{type:"submit",disabled:q,children:q?"Saving...":e.jsxs(e.Fragment,{children:[e.jsx(xe,{size:18})," Update Record"]})})]})]})]})}),Ae&&e.jsx(fe,{onClick:()=>f(!1),children:e.jsxs(ve,{onClick:s=>s.stopPropagation(),children:[e.jsxs(be,{children:[e.jsxs("h3",{children:[e.jsx(V,{size:24})," Sanction Details"]}),e.jsx(_e,{onClick:()=>f(!1),children:e.jsx(ce,{size:20})})]}),e.jsxs(Se,{children:[e.jsx("p",{className:"text-muted mb-4",children:"Enter the sanction duration and reason below"}),e.jsxs("div",{className:"row g-3",children:[e.jsxs("div",{className:"col-md-4",children:[e.jsx(m,{children:"Days Remaining*"}),e.jsx(U,{type:"number",min:"1",placeholder:"e.g. 3",value:C.days,onChange:s=>N(n=>({...n,days:s.target.value})),autoFocus:!0})]}),e.jsxs("div",{className:"col-md-8",children:[e.jsx(m,{children:"Reason*"}),e.jsx(U,{type:"text",placeholder:"e.g. no haircut, improper uniform",value:C.reason,onChange:s=>N(n=>({...n,reason:s.target.value}))})]})]})]}),e.jsxs(ke,{children:[e.jsx(_,{type:"button",style:{background:"#6c757d"},onClick:()=>f(!1),children:"Cancel"}),e.jsxs(_,{type:"button",onClick:Le,children:[e.jsx(xe,{size:18})," Save Sanction"]})]})]})}),e.jsx(Xe,{isOpen:D.isOpen,onClose:oe,onConfirm:qe,title:"Remove Student Assignment",message:"Are you sure you want to remove this student's assignment record?"})]})},is=a.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`,ls=a.div`
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
`,G=a.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`,J=a.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 16px 16px 0 0;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,ye=a.div`
    color: var(--text-secondary);
`,m=a.label`
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
`,cs=a.div`
    position: relative;
    .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-tertiary);
        z-index: 5;
    }
`,U=a.input`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
    &::placeholder { color: var(--text-secondary); opacity: 0.7; }
`,u=a.select`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
`,ds=a.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-top: 4px;
    box-shadow: var(--shadow-md);
    z-index: 50;
    max-height: 250px;
    overflow-y: auto;
`,ms=a.div`
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    color: var(--text-primary);
    transition: background 0.2s;
    &:hover { background: var(--hover-color); }
    &:last-child { border-bottom: none; }
    strong { font-size: 0.9rem; }
    small { color: var(--text-secondary); font-size: 0.8rem; }
`;a.div`
    display: flex;
    align-items: center;
    gap: 8px;
    input { width: 16px; height: 16px; accent-color: var(--accent-primary); cursor: pointer; }
    label { cursor: pointer; color: var(--text-primary); font-size: 0.9rem; }
`;const _=a.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: 44px;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,K=a.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 6px;
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
    &:hover { background: var(--bg-tertiary); border-color: var(--accent-primary); }
`,us=a.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--bg-primary); 
    border-radius: 6px;
    border: 1px solid var(--border-color);
    color: var(--text-tertiary);
`,hs=a.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    th {
        text-align: left;
        padding: 1rem 1.5rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
`,je=a.span`
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    &.warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    &.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
`,fe=a.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
  display: flex; padding: 20px; z-index: 1000;
  overflow-y: auto;
`,ve=a.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 900px;
  margin: auto; 
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
`,be=a.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg-tertiary);
  h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
`,_e=a.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-secondary); }
`,Se=a.div`
  padding: 2rem;
`,ps=a.div`
    padding: 1rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    h4 { margin: 0; color: var(--accent-primary); font-weight: 700; }
`,ke=a.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`,xs=a(_)`
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--border-color);
  &:hover { background: var(--border-color); transform: translateY(-1px); }
`,gs=a.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    gap: 1rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-tertiary);
`,we=a.button`
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    &:hover:not(:disabled) {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
    }
`,ys=a.span`
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
`;export{Fs as default};
