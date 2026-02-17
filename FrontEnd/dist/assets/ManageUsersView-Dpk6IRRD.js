import{c as X,r as c,o as S,j as r,P as ce,X as de,i as pe,d as n,p as xe}from"./index-G8dAaOpg.js";import{T as ue}from"./Toast-CfYD9-5b.js";import{D as he}from"./DeleteModal-BwSZan_D.js";import{u as ge}from"./useDebouncedValue-hUueIzrg.js";import{U as W}from"./AdminDashboard-8gIRKhHb.js";import{U as Q}from"./users-CneqRZry.js";import{S as me,C as be}from"./search-DDp6GwTl.js";import{T as fe}from"./trash-2-D6PG7ToH.js";import{a as L,S as ve,B as ye,G as je}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{A as we}from"./award-C-798qRU.js";import"./circle-check-big-BkBU9BDV.js";import"./circle-alert-QpU8jh7N.js";import"./triangle-alert-DHUh_5GK.js";import"./layout-dashboard-BfKp-c8E.js";import"./settings-DNNACGN9.js";const $e=[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]],ke=X("banknote",$e);const Se=[["path",{d:"M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762",key:"17lmqv"}]],Re=X("heart-handshake",Se),R=5,Ae=28,q=6,V=R*Ae+(R-1)*q,Z=`${V}px`,Ce=2500,H=(t,A,m=[])=>{const C=(Array.isArray(t)?t:t?[t]:[]).map(p=>String(p||"").trim().toLowerCase()).map(p=>p==="go"?"nt":p).filter(p=>A.includes(p)),f=Array.from(new Set(C));return f.length?f:["student"]},Y=t=>{switch(t){case"student":return r.jsx(je,{size:16});case"teacher":return r.jsx(ye,{size:16});case"admin":return r.jsx(ve,{size:16});case"nt":return r.jsx(L,{size:16});default:return r.jsx(Q,{size:16})}},u=t=>{switch(t){case"student":return"var(--accent-info, #3b82f6)";case"teacher":return"var(--accent-success, #10b981)";case"admin":return"var(--accent-danger, #ef4444)";case"nt":return"var(--accent-warning, #f59e0b)";default:return"var(--text-secondary)"}},G=t=>{switch(t){case"dean":return r.jsx(we,{size:14});case"osas":return r.jsx(Re,{size:14});case"treasury":return r.jsx(ke,{size:14});default:return r.jsx(L,{size:14})}},g=t=>{switch(t){case"dean":return"#eab308";case"osas":return"#ec4899";case"treasury":return"#10b981";default:return"var(--text-secondary)"}},Cr=()=>{const t=["student","teacher","admin","nt"],A=["dean","osas","treasury"],[m,b]=c.useState([]),[C,f]=c.useState(!0),[p,J]=c.useState(""),[k,K]=c.useState(""),_=ge(p,300),[E,ee]=c.useState({}),[U,h]=c.useState({show:!1,message:"",type:"success"}),z=c.useRef({}),d=c.useRef({}),[v,M]=c.useState(null),[re,O]=c.useState(!1),[y,T]=c.useState(null);c.useEffect(()=>{I()},[]);const x=v?m.find(e=>e.id===v):null,j=c.useMemo(()=>{if(!_)return m;const e=_.toLowerCase();return m.filter(o=>o.username&&o.username.toLowerCase().includes(e)||o.full_name&&o.full_name.toLowerCase().includes(e)||o.school_id&&String(o.school_id).includes(e))},[_,m]),w=c.useMemo(()=>j.filter(e=>{const o=Array.isArray(e.roles)&&e.roles.length?e.roles:[e.role].filter(Boolean);return!(k&&!o.includes(k))}),[j,k]);c.useEffect(()=>{let e=!0;const o=async()=>{const s=j.filter(i=>i.image_path&&!E[i.id]);if(s.length===0)return;const a={},l=10;for(let i=0;i<s.length;i+=l){if(!e)return;const le=s.slice(i,i+l);await Promise.all(le.map(async $=>{try{const D=await pe($.id,$.image_path);a[$.id]=D}catch(D){console.error("Failed to load avatar for",$.id,D),a[$.id]="/images/sample.jpg"}}))}e&&Object.keys(a).length>0&&ee(i=>({...i,...a}))};return j.length>0&&o(),()=>{e=!1}},[j,E]),c.useEffect(()=>{const e=new Set(w.map(o=>String(o.id)));return Object.keys(d.current).forEach(o=>{e.has(o)||(clearInterval(d.current[o]),delete d.current[o])}),w.forEach(o=>{const s=N(o);if(Math.ceil(s.length/R)<=1){P(o.id);return}B(o.id)}),()=>{Object.keys(d.current).forEach(o=>{clearInterval(d.current[o]),delete d.current[o]})}},[w]);const I=async()=>{try{f(!0);const e=await S.getUsers();console.log("Fetched users data:",e);const o=Array.isArray(e)?e:[];b(o.map(s=>({...s,roles:H(Array.isArray(s.roles)&&s.roles.length?s.roles:s.role?[s.role]:[],t),sub_roles:Array.isArray(s.sub_roles)?s.sub_roles:s.sub_role?[s.sub_role]:[]})))}catch(e){console.error("Error fetching users:",e),h({show:!0,message:`Failed to load users: ${e.message||"Unknown error"}`,type:"error"})}finally{f(!1)}},te=async(e,o)=>{try{const s=H(o,t);b(a=>a.map(l=>l.id===e?{...l,roles:s,role:s[0]}:l)),await S.updateUserRoles(e,s),h({show:!0,message:"User roles updated successfully",type:"success"})}catch(s){h({show:!0,message:`Error updating roles: ${s.message}`,type:"error"}),I()}},N=e=>{const o=Array.isArray(e.roles)?e.roles:[],s=Array.isArray(e.sub_roles)?e.sub_roles:[];return[...o.map(a=>({type:"role",value:a})),...s.map(a=>({type:"sub",value:a}))]},oe=(e,o)=>{const s=[];for(let a=0;a<e.length;a+=o)s.push(e.slice(a,a+o));return s},P=e=>{const o=String(e);d.current[o]&&(clearInterval(d.current[o]),delete d.current[o])},B=e=>{const o=String(e);if(d.current[o])return;const s=z.current[o];if(!s)return;const a=V;d.current[o]=setInterval(()=>{if(s.matches(":hover"))return;const l=s.scrollWidth-s.clientWidth;if(l<=0)return;const i=s.scrollLeft+a;s.scrollTo({left:i>l+4?0:i,behavior:"smooth"})},Ce)},se=(e,o)=>{const s=z.current[String(e)];if(!s)return;const a=Math.abs(o.deltaX)>Math.abs(o.deltaY)?o.deltaX:o.deltaY;a!==0&&(s.scrollLeft+=a,o.preventDefault())},ae=e=>{T(e),O(!0)},F=()=>{O(!1),T(null)},ne=async(e,o)=>{try{const s=o.length>0?o[0]:null;b(a=>a.map(l=>l.id===e?{...l,sub_role:s,sub_roles:o}:l)),await S.updateUserSubRole(e,s,o),h({show:!0,message:"Functional roles updated successfully",type:"success"})}catch(s){h({show:!0,message:`Error updating functional roles: ${s.message}`,type:"error"}),I()}},ie=async()=>{if(y)try{await S.deleteUser(y.id),b(e=>e.filter(o=>o.id!==y.id)),h({show:!0,message:"User deleted successfully",type:"success"}),F()}catch(e){console.error("Error deleting user:",e),h({show:!0,message:`Failed to delete user: ${e.message}`,type:"error"})}};return r.jsxs(Ee,{children:[r.jsx(Ue,{children:r.jsxs("div",{children:[r.jsxs("h2",{children:[r.jsx(W,{size:32})," Manage User Roles"]}),r.jsx("p",{children:"Manage user permissions and assign roles across the system."})]})}),U.show&&r.jsx(ue,{message:U.message,type:U.type,onClose:()=>h(e=>({...e,show:!1}))}),r.jsxs(ze,{children:[r.jsxs(Me,{children:[r.jsxs("div",{className:"d-flex align-items-center gap-2",children:[r.jsx(Q,{size:20}),r.jsx("h3",{children:"System Users"})]}),r.jsxs(De,{children:[r.jsx(me,{size:16}),r.jsx(Te,{type:"text",placeholder:"Search by name, username or ID...",value:p,onChange:e=>J(e.target.value)})]}),r.jsx(Le,{children:r.jsxs(Oe,{value:k,onChange:e=>K(e.target.value),children:[r.jsx("option",{value:"",children:"All Roles"}),r.jsx("option",{value:"student",children:"Student"}),r.jsx("option",{value:"teacher",children:"Teacher"}),r.jsx("option",{value:"admin",children:"Admin"}),r.jsx("option",{value:"nt",children:"Non-Teaching"})]})})]}),r.jsx(Ie,{children:r.jsx("div",{className:"table-responsive",style:{position:"relative",minHeight:"400px"},children:r.jsxs(Ne,{children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{children:"User Profile"}),r.jsx("th",{children:"School ID"}),r.jsx("th",{children:"Assigned Roles"}),r.jsx("th",{children:"Actions"})]})}),r.jsx("tbody",{children:C?r.jsx("tr",{children:r.jsx("td",{colSpan:"4",children:r.jsx(ce,{variant:"table",compact:!0})})}):w.length===0?r.jsx("tr",{children:r.jsx("td",{colSpan:"4",className:"text-center py-5 text-muted",children:"No users found matching your filters."})}):w.map(e=>{const o=N(e),s=oe(o,R);return r.jsxs("tr",{children:[r.jsx("td",{children:r.jsxs(Pe,{children:[r.jsx(Be,{src:E[e.id]||"/images/sample.jpg",onError:a=>{a.target.src="/images/sample.jpg"}}),r.jsxs("div",{children:[r.jsx(Fe,{children:e.full_name||e.username}),r.jsx(We,{children:e.username})]})]})}),r.jsx("td",{children:e.school_id?r.jsx(He,{children:e.school_id}):r.jsx("span",{className:"text-muted fst-italic text-sm",children:"N/A"})}),r.jsx("td",{children:r.jsx("div",{style:{position:"relative"},children:r.jsxs(Ge,{onClick:a=>{a.stopPropagation(),M(v===e.id?null:e.id)},$active:v===e.id,children:[o.length===0?r.jsx("span",{className:"text-muted text-xs",children:"No roles"}):r.jsx(Xe,{ref:a=>{a&&(z.current[String(e.id)]=a)},onMouseEnter:()=>P(e.id),onMouseLeave:()=>B(e.id),onWheel:a=>se(e.id,a),children:s.map((a,l)=>r.jsx(Qe,{"data-role-page":!0,children:a.map(i=>i.type==="role"?r.jsx(qe,{$role:i.value,title:i.value==="nt"?"Non-Teaching":i.value.charAt(0).toUpperCase()+i.value.slice(1),children:Y(i.value)},`role-${e.id}-${i.value}`):r.jsx(Ve,{$subRole:i.value,title:i.value.toUpperCase(),children:G(i.value)},`sub-${e.id}-${i.value}`))},`${e.id}-page-${l}`))}),r.jsx(Ze,{$active:v===e.id,children:r.jsx(W,{size:14})})]})})}),r.jsx("td",{children:r.jsx(Ye,{children:r.jsx(xr,{onClick:()=>ae(e),title:"Delete User",children:r.jsx(fe,{size:16})})})})]},e.id)})})]})})})]}),x&&r.jsx(Je,{onClick:()=>M(null),children:r.jsxs(Ke,{onClick:e=>e.stopPropagation(),children:[r.jsxs(er,{children:[r.jsx("span",{children:"Assign Roles"}),r.jsx(rr,{onClick:()=>M(null),children:r.jsx(de,{size:16})})]}),r.jsxs(tr,{children:[r.jsx(or,{children:"Main Access Role"}),r.jsx(sr,{children:t.map(e=>{const o=x.roles&&x.roles.includes(e);return r.jsxs(ar,{$selected:o,$role:e,onClick:()=>{const s=x.roles||[],a=o?s.filter(l=>l!==e):[...s,e];te(x.id,a)},children:[r.jsx("div",{className:"icon-box",children:Y(e)}),r.jsx("div",{className:"label",children:e==="nt"?"Non-Teaching":e.charAt(0).toUpperCase()+e.slice(1)}),o&&r.jsx(nr,{size:14})]},e)})}),r.jsx(ir,{}),r.jsxs(lr,{children:[r.jsxs(cr,{children:[r.jsx(L,{size:12})," Functional Sub-Roles"]}),r.jsx(dr,{children:A.map(e=>{const o=x.sub_roles&&x.sub_roles.includes(e);return r.jsx(pr,{$selected:o,$subRole:e,onClick:()=>{const s=x.sub_roles||[],a=o?s.filter(l=>l!==e):[...s,e];ne(x.id,a)},title:e.toUpperCase(),children:G(e)},e)})})]})]})]})}),r.jsx(he,{isOpen:re,onClose:F,onConfirm:ie,title:"Confirm Account Deletion",message:"Are you sure you want to delete this user? This action cannot be undone and will remove all their data.",itemName:y?.full_name||y?.username,isLoading:!1})]})},_e=xe`
  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`,Ee=n.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`,Ue=n.div`
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
`,ze=n.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: visible; 
`,Me=n.div`
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,Ie=n.div`
   padding: 0; 
`,De=n.div`
    position: relative;
    width: 300px;
    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
    }
`,Le=n.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`,Oe=n.select`
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.85rem;
    min-width: 160px;
    cursor: pointer;
    &:focus { border-color: var(--accent-primary); outline: none; }
`,Te=n.input`
    width: 100%;
    padding: 10px 10px 10px 36px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9rem;
    &:focus { border-color: var(--accent-primary); outline: none; }
`,Ne=n.table`
    width: 100%;
    border-collapse: collapse;
    th {
        text-align: left;
        padding: 1rem 1.5rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-tertiary); }
`,Pe=n.div`
    display: flex;
    align-items: center;
    gap: 12px;
`,Be=n.img`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
`,Fe=n.div`
    font-weight: 600;
    color: var(--text-primary);
`,We=n.div`
    font-size: 0.85rem;
    color: var(--text-secondary);
`,He=n.span`
    background: var(--bg-tertiary);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
`,Ye=n.div`
    display: flex;
    align-items: center;
    gap: 16px;
`,Ge=n.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    background: ${t=>t.$active?"var(--bg-tertiary)":"transparent"};
    
    &:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-color);
        
        // Show edit icon on hover
        div:last-child {
            opacity: 1;
            transform: translateX(0);
        }
    }
`,Xe=n.div`
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    max-width: ${Z};
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) transparent;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
        height: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 999px;
    }

    &:hover::-webkit-scrollbar-thumb {
        background: var(--border-color);
    }
`,Qe=n.div`
    display: flex;
    align-items: center;
    gap: ${q}px;
    scroll-snap-align: start;
    flex: 0 0 auto;
    min-width: ${Z};
`,qe=n.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: ${t=>`${u(t.$role)}15`};
    color: ${t=>u(t.$role)};
    border: 1px solid ${t=>`${u(t.$role)}30`};
    transition: all 0.2s;
    
    &:hover {
        background: ${t=>`${u(t.$role)}25`};
        transform: scale(1.1);
    }
    
    svg { opacity: 0.9; }
`,Ve=n.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${t=>`${g(t.$subRole)}15`};
    color: ${t=>g(t.$subRole)};
    border: 1px solid ${t=>`${g(t.$subRole)}30`};
    
    svg { opacity: 0.9; }
`,Ze=n.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent-primary);
    color: white;
    opacity: ${t=>t.$active?1:0};
    transform: ${t=>t.$active?"translateX(0)":"translateX(-5px)"};
    transition: all 0.2s;
    margin-left: 4px;
`,Je=n.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 2000;
`,Ke=n.div`
    width: 360px;
    max-width: 95vw;
    max-height: 85vh;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    animation: ${_e} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
`,er=n.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
`,rr=n.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    &:hover { background: rgba(0,0,0,0.05); color: var(--text-primary); }
`,tr=n.div`
    padding: 16px;
    overflow-y: auto;
`,or=n.div`
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 600;
    margin-bottom: 8px;
    text-transform: uppercase;
`,sr=n.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`,ar=n.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 10px;
    border: 2px solid ${t=>t.$selected?u(t.$role):"var(--border-color)"};
    background: ${t=>t.$selected?`${u(t.$role)}10`:"var(--bg-primary)"};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${t=>t.$selected?u(t.$role):"var(--text-secondary)"};
        transform: translateY(-2px);
    }

    .icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${t=>t.$selected?u(t.$role):"var(--bg-tertiary)"};
        color: ${t=>t.$selected?"white":"var(--text-secondary)"};
        transition: all 0.2s;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 600;
        color: ${t=>t.$selected?u(t.$role):"var(--text-primary)"};
    }
`,nr=n(be)`
    position: absolute;
    top: 8px;
    right: 8px;
    color: currentColor;
`,ir=n.div`
    height: 1px;
    background: var(--border-color);
    margin: 16px 0;
`,lr=n.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`,cr=n.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    letter-spacing: 0.5px;
`,dr=n.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-start;
`,pr=n.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 2px solid ${t=>t.$selected?g(t.$subRole):"var(--border-color)"};
    background: ${t=>t.$selected?`${g(t.$subRole)}20`:"var(--bg-primary)"};
    color: ${t=>t.$selected?g(t.$subRole):"var(--text-secondary)"};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: ${t=>g(t.$subRole)};
        transform: translateY(-2px);
        box-shadow: 0 4px 12px ${t=>`${g(t.$subRole)}20`};
    }

    svg {
        width: 20px;
        height: 20px;
        transition: transform 0.2s;
    }

    &:active {
        transform: scale(0.95);
    }
`,xr=n.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #dc2626;
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
    }
    
    &:active {
        transform: translateY(0);
    }
`;export{Cr as default};
