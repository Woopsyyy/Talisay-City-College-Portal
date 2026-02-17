import{c as N,r as o,j as e,o as j,d as a}from"./index-G8dAaOpg.js";import{T as ee}from"./Toast-CfYD9-5b.js";import{S as re}from"./settings-DNNACGN9.js";import{I as c}from"./info-JkjM17ht.js";import{T as v}from"./triangle-alert-DHUh_5GK.js";import{C as k}from"./circle-check-big-BkBU9BDV.js";import{D as se}from"./download-BQ6YnnDK.js";import{C as ae}from"./clock-DTlNUsPA.js";import{T as oe}from"./trash-2-D6PG7ToH.js";import"./circle-alert-QpU8jh7N.js";const te=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],$=N("database",te);const ie=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],ne=N("image",ie);const le=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],ce=N("upload",le),De=()=>{const B="This action should be configured in the Supabase dashboard.",[t,h]=o.useState(null),[C,D]=o.useState(!1),[A,M]=o.useState(!1),[I,T]=o.useState(!1),[g,i]=o.useState({show:!1,message:"",type:"success"}),[b,R]=o.useState([]),[l,f]=o.useState(null),[F,V]=o.useState(null),[y,O]=o.useState(!1),[_,W]=o.useState("daily"),[E,J]=o.useState("02:00"),L=r=>{const s=Number(r);if(!Number.isFinite(s)||s<=0)return"0 B";const d=1024,n=["B","KB","MB","GB"],P=Math.floor(Math.log(s)/Math.log(d));return Math.round(s/Math.pow(d,P)*100)/100+" "+n[P]},U=async()=>{M(!0);try{const r=await j.getBackups();R(Array.isArray(r)?r:[])}catch(r){R([]),i({show:!0,message:r?.message||"Failed to load backup files.",type:"error"})}finally{M(!1)}};o.useEffect(()=>{U()},[]);const K=async()=>{T(!0),f(null);try{const r=await j.createBackup();f(r),i({show:!0,message:"Backup created and uploaded to Supabase Storage.",type:"success"}),await U()}catch(r){const s=r?.message||"Backup creation failed.";f({error:s}),i({show:!0,message:s,type:"error"})}finally{T(!1)}},Q=async r=>{r.preventDefault();const s=F?.name?` Selected file: ${F.name}`:"";i({show:!0,message:`${B}${s}`,type:"info"})},Y=(r,s)=>{if(!r){i({show:!0,message:"Backup file URL is unavailable.",type:"error"});return}const d=r,n=document.createElement("a");n.href=d,n.setAttribute("download",s),document.body.appendChild(n),n.click(),document.body.removeChild(n)},X=()=>{O(r=>!r),i({show:!0,message:B,type:"info"})},Z=async()=>{D(!0),h(null);try{const r=await j.cleanupPictures();h(r);const s=Number(r?.deleted||0);i({show:!0,message:s>0?`Removed ${s} unused profile image${s===1?"":"s"}.`:"No unused profile images found.",type:s>0?"success":"info"})}catch(r){const s=r?.message||"Failed to clean up profile images.";h({error:s}),i({show:!0,message:s,type:"error"})}finally{D(!1)}};return e.jsxs(de,{children:[e.jsx(pe,{children:e.jsxs("div",{children:[e.jsxs("h2",{children:[e.jsx(re,{size:32})," Settings"]}),e.jsx("p",{children:"Manage database cleanup and maintenance tasks."})]})}),g.show&&e.jsx(ee,{message:g.message,type:g.type,onClose:()=>i(r=>({...r,show:!1}))}),e.jsxs(q,{style:{marginBottom:"1.5rem"},children:[e.jsxs(H,{children:[e.jsx($,{size:20}),e.jsx("h3",{children:"Database Backup"})]}),e.jsx(G,{children:e.jsxs("div",{className:"row g-4",children:[e.jsx("div",{className:"col-lg-6",children:e.jsxs(p,{children:[e.jsxs(m,{children:[e.jsxs("div",{children:[e.jsx("h4",{children:"Manual Backup"}),e.jsx("p",{children:"Create an instant backup of your database."})]}),e.jsx(u,{className:"blue",children:e.jsx($,{size:24})})]}),e.jsxs(x,{className:"blue",children:[e.jsx(c,{size:16}),"Create a JSON snapshot from Supabase tables and store it in Supabase Storage."]}),e.jsx(w,{onClick:K,className:"primary",disabled:I||A,children:I?"Creating Backup...":"Create Backup Now"}),l&&e.jsx(S,{children:l.error?e.jsxs("div",{className:"error",children:[e.jsx(v,{size:14})," ",l.error]}):e.jsxs("div",{className:"success",children:[e.jsxs("div",{children:[e.jsx(k,{size:14})," Backup created: ",l.filename]}),e.jsxs("div",{style:{fontSize:"0.8rem",opacity:.8},children:["Size: ",L(l.size)]})]})}),b.length>0&&e.jsxs(ue,{children:[e.jsxs("h5",{children:["Recent Backups (",b.length,")"]}),b.slice(0,5).map((r,s)=>e.jsxs(xe,{children:[e.jsxs("div",{className:"info",children:[e.jsx("strong",{children:r.filename}),e.jsx("small",{children:r.created_at||new Date(r.created*1e3).toLocaleString()}),e.jsx("div",{className:"size",children:L(r.size)})]}),e.jsx(he,{onClick:()=>Y(r.download_url,r.filename),children:e.jsx(se,{size:16})})]},s))]}),A&&e.jsx(S,{children:e.jsxs("div",{className:"info",children:[e.jsx(c,{size:14})," Loading backup history..."]})})]})}),e.jsx("div",{className:"col-lg-6",children:e.jsxs(p,{children:[e.jsxs(m,{children:[e.jsxs("div",{children:[e.jsx("h4",{children:"Import Database"}),e.jsx("p",{children:"Restore or upload a database file."})]}),e.jsx(u,{className:"orange",children:e.jsx(ce,{size:24})})]}),e.jsxs(x,{className:"orange",children:[e.jsx(v,{size:16}),e.jsx("strong",{children:"Caution:"})," Database imports should be executed from Supabase SQL tools."]}),e.jsxs(z,{style:{marginBottom:"1rem"},children:[e.jsx("label",{children:"Backup File (.sql / .json)"}),e.jsx("div",{className:"file-input-wrapper",children:e.jsx("input",{id:"db-import-file",type:"file",accept:".sql,.json",onChange:r=>V(r.target.files[0])})})]}),e.jsx(w,{onClick:Q,className:"warning",children:"Use Supabase Dashboard"})]})}),e.jsx("div",{className:"col-lg-12",children:e.jsxs(p,{style:{marginTop:"1.5rem"},children:[e.jsxs(m,{children:[e.jsxs("div",{children:[e.jsx("h4",{children:"Scheduled Backup"}),e.jsx("p",{children:"Automate database backups on a schedule."})]}),e.jsx(u,{className:"green",children:e.jsx(ae,{size:24})})]}),e.jsxs(x,{className:"green",children:[e.jsx(c,{size:16}),"Automatically create backups at scheduled intervals."]}),e.jsxs(ge,{children:[e.jsxs(be,{children:[e.jsx("input",{type:"checkbox",checked:y,onChange:X,id:"schedule-toggle"}),e.jsx("label",{htmlFor:"schedule-toggle",children:y?"Enabled":"Disabled"})]}),y&&e.jsxs("div",{className:"d-flex gap-3 flex-wrap",children:[e.jsxs(z,{style:{flex:1},children:[e.jsx("label",{children:"Frequency"}),e.jsxs("select",{value:_,onChange:r=>W(r.target.value),children:[e.jsx("option",{value:"hourly",children:"Hourly"}),e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"})]})]}),e.jsxs(z,{style:{flex:1},children:[e.jsx("label",{children:"Time"}),e.jsx("input",{type:"time",value:E,onChange:r=>J(r.target.value)})]}),e.jsx("div",{style:{flex:"100%"},children:e.jsxs(fe,{children:[e.jsx(k,{size:16}),"Next backup: ",_," at ",E]})})]})]})]})})]})})]}),e.jsxs(q,{children:[e.jsxs(H,{children:[e.jsx(oe,{size:20}),e.jsx("h3",{children:"System Maintenance"})]}),e.jsx(G,{children:e.jsx("div",{className:"row g-4",children:e.jsx("div",{className:"col-lg-6",children:e.jsxs(p,{children:[e.jsxs(m,{children:[e.jsxs("div",{children:[e.jsx("h4",{children:"Clean Up Unused Pictures"}),e.jsx("p",{children:"Remove profile pictures that are no longer in use."})]}),e.jsx(u,{className:"blue",children:e.jsx(ne,{size:24})})]}),e.jsxs(x,{className:"blue",children:[e.jsx(c,{size:16}),"Clean up unused profile files from the Supabase Storage bucket."]}),e.jsx(w,{onClick:Z,className:"primary",disabled:C,children:C?"Cleaning Up...":"Clean Up Images"}),t&&e.jsx(S,{children:t.error?e.jsxs("div",{className:"error",children:[e.jsx(v,{size:14})," ",t.error]}):t.deleted>0?e.jsxs("div",{className:"success",children:[e.jsxs("div",{children:[e.jsx(k,{size:14})," Deleted ",t.deleted," file(s). ",t.total_users," users in database."]}),t.files&&t.files.length>0&&e.jsxs(me,{children:[e.jsx("summary",{children:"View Details"}),e.jsx("ul",{children:t.files.map((r,s)=>e.jsx("li",{children:r},s))})]})]}):e.jsxs("div",{className:"info",children:[e.jsx(c,{size:14})," No unused pictures found."]})})]})})})})]})]})},de=a.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`,pe=a.div`
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
`,q=a.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`,H=a.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`,G=a.div`
   padding: 1.5rem;
`,p=a.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
`,m=a.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    h4 { margin: 0 0 4px; font-size: 1.1rem; font-weight: 700; }
    p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
`,u=a.div`
    width: 40px; height: 40px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    
    &.blue { background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); }
    &.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    &.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
`,x=a.div`
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 10px;
    align-items: flex-start;

    &.blue { background: rgba(59, 130, 246, 0.05); color: var(--accent-primary); border: 1px solid rgba(59, 130, 246, 0.1); }
    &.orange { background: rgba(249, 115, 22, 0.05); color: #c2410c; border: 1px solid rgba(249, 115, 22, 0.1); }
    &.green { background: rgba(16, 185, 129, 0.05); color: #059669; border: 1px solid rgba(16, 185, 129, 0.1); }

    code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
`,w=a.button`
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: auto;

    &.primary {
        background: var(--accent-primary);
        color: var(--text-inverse);
        &:hover { background: var(--accent-highlight); }
    }
    &.warning {
        background: #f97316;
        color: white;
        &:hover { background: #ea580c; }
    }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`,S=a.div`
    margin-top: 1rem;
    font-size: 0.9rem;
    
    .error { color: #ef4444; display: flex; align-items: center; gap: 6px; }
    .success { color: #10b981; display: flex; flex-direction: column; gap: 4px; }
    .info { color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
`,me=a.details`
    margin-top: 0.5rem;
    summary { cursor: pointer; font-size: 0.85rem; opacity: 0.8; }
    ul { margin: 0.5rem 0 0 1rem; font-size: 0.8rem; color: var(--text-secondary); max-height: 100px; overflow-y: auto; }
`,ue=a.div`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    h5 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary); }
`,xe=a.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
    &:last-child { border-bottom: none; }
    
    .info {
        flex-grow: 1;
        strong { display: block; color: var(--text-primary); font-size: 0.85rem; margin-bottom: 2px; }
        small { color: var(--text-secondary); font-size: 0.75rem; display: block; margin-bottom: 2px; }
        .size { font-size: 0.75rem; color: var(--accent-primary); font-weight: 600; }
    }
`,he=a.button`
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(59, 130, 246, 0.2);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: var(--accent-primary);
        color: white;
        transform: translateY(-1px);
    }
`,ge=a.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: auto;
`,be=a.div`
    display: flex;
    align-items: center;
    gap: 10px;
    
    input[type="checkbox"] {
        appearance: none;
        width: 50px;
        height: 26px;
        background: var(--border-color);
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s;
        
        &:checked {
            background: var(--accent-primary);
        }
        
        &::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            top: 3px;
            left: 3px;
            transition: all 0.3s;
        }
        
        &:checked::before {
            left: 27px;
        }
    }
    
    label {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }
`,z=a.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    select, input[type="time"] {
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.9rem;
        
        &:focus {
            outline: none;
            border-color: var(--accent-primary);
        }
    }
`,fe=a.div`
    padding: 0.75rem;
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.1);
    border-radius: 8px;
    color: #059669;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
`;export{De as default};
