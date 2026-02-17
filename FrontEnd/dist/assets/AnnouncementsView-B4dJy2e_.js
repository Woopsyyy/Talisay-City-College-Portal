import{r as c,j as r,P as U,X as B,S as I,d as e}from"./index-G8dAaOpg.js";import{C as h}from"./circle-alert-QpU8jh7N.js";import{M as z}from"./megaphone-fcxJ3P3Z.js";import{B as k}from"./bell-BYINsMo2.js";import{C as S}from"./clock-DTlNUsPA.js";import{F as P}from"./funnel-FWZ3B0qw.js";import{C as _}from"./calendar-CG0mXhiR.js";import{T as H}from"./trending-up-DdPn23yC.js";import{U as u}from"./users-CneqRZry.js";const jr=()=>{const[o,A]=c.useState([]),[F,T]=c.useState(!0),[$,D]=c.useState(null),[a,d]=c.useState("all");c.useEffect(()=>{(async()=>{try{const n=await I.getAnnouncements();A(Array.isArray(n)?n:[])}catch(n){console.error("Error fetching announcements:",n),D(n.message||"Failed to load announcements")}finally{T(!1)}})()},[]);const x=t=>{try{if(!t)return"Date not specified";const n=new Date(t);return isNaN(n.getTime())?String(t):n.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return String(t)}},L=t=>{try{const n=new Date(t),s=new Date-n,l=Math.floor(s/(1e3*60*60*24)),m=Math.floor(s/(1e3*60*60)),p=Math.floor(s/(1e3*60));return l>7?x(t):l>0?`${l} day${l>1?"s":""} ago`:m>0?`${m} hour${m>1?"s":""} ago`:p>0?`${p} minute${p>1?"s":""} ago`:"Just now"}catch{return x(t)}},M=t=>{const n=(t||"medium").toLowerCase();return n==="high"?{icon:h,label:"Urgent",color:"#ef4444",bg:"rgba(239, 68, 68, 0.1)",order:1}:n==="medium"?{icon:H,label:"Important",color:"#f59e0b",bg:"rgba(245, 158, 11, 0.1)",order:2}:{icon:k,label:"Info",color:"#3b82f6",bg:"rgba(59, 130, 246, 0.1)",order:3}},E=t=>{const n=(t||"all").toLowerCase();return n==="all"?{icon:u,label:"All Users",color:"#8b5cf6"}:n==="student"?{icon:u,label:"Students",color:"#10b981"}:{icon:u,label:t,color:"#6b7280"}},f=c.useMemo(()=>{const t=o.filter(i=>(i.priority||"").toLowerCase()==="high").length,n=o.filter(i=>{const s=new Date(i.published_at);return(new Date-s)/(1e3*60*60*24)<=7}).length;return{total:o.length,urgent:t,recent:n}},[o]),C=c.useMemo(()=>o.filter(t=>a==="all"?!0:(t.priority||"medium").toLowerCase()===a),[o,a]);return F?r.jsx(dr,{children:r.jsx(U,{variant:"cards",count:4})}):$?r.jsxs(mr,{children:[r.jsx(h,{size:48}),r.jsx("h3",{children:"Failed to Load Announcements"}),r.jsx("p",{children:$})]}):r.jsxs(Y,{children:[r.jsx(N,{children:r.jsxs(G,{children:[r.jsx(z,{size:32}),r.jsxs("div",{children:[r.jsx("h2",{children:"Campus Announcements"}),r.jsx("p",{children:"Stay informed with the latest news and important updates"})]})]})}),r.jsxs(V,{children:[r.jsxs(b,{$color:"#3b82f6",children:[r.jsx(v,{children:r.jsx(k,{size:24})}),r.jsxs(y,{children:[r.jsx(j,{children:"Total"}),r.jsx(w,{children:f.total})]})]}),r.jsxs(b,{$color:"#ef4444",children:[r.jsx(v,{children:r.jsx(h,{size:24})}),r.jsxs(y,{children:[r.jsx(j,{children:"Urgent"}),r.jsx(w,{children:f.urgent})]})]}),r.jsxs(b,{$color:"#10b981",children:[r.jsx(v,{children:r.jsx(S,{size:24})}),r.jsxs(y,{children:[r.jsx(j,{children:"Recent (7 days)"}),r.jsx(w,{children:f.recent})]})]})]}),r.jsxs(J,{children:[r.jsxs(R,{children:[r.jsx(P,{size:16}),"Filter by Priority:"]}),r.jsxs(X,{children:[r.jsx(g,{$active:a==="all",onClick:()=>d("all"),children:"All"}),r.jsx(g,{$active:a==="high",$color:"#ef4444",onClick:()=>d("high"),children:"Urgent"}),r.jsx(g,{$active:a==="medium",$color:"#f59e0b",onClick:()=>d("medium"),children:"Important"}),r.jsx(g,{$active:a==="low",$color:"#3b82f6",onClick:()=>d("low"),children:"Info"}),a!=="all"&&r.jsxs(q,{onClick:()=>d("all"),children:[r.jsx(B,{size:14})," Clear"]})]})]}),C.length===0?r.jsxs(cr,{children:[r.jsx(z,{size:64}),r.jsx("h3",{children:"No Announcements Found"}),r.jsx("p",{children:a!=="all"?"No announcements match your current filter. Try changing the filter or clearing it.":"There are currently no announcements to display."})]}):r.jsx(K,{children:C.map((t,n)=>{const i=M(t.priority),s=E(t.target_role),l=i.icon,m=s.icon;return r.jsxs(O,{$priority:t.priority,children:[r.jsx(Q,{$color:i.color}),r.jsxs(W,{children:[r.jsxs(Z,{children:[r.jsx(rr,{children:t.title||"Untitled"}),r.jsx(er,{children:r.jsxs(tr,{children:[r.jsx(S,{size:14}),L(t.published_at)]})})]}),r.jsxs(or,{$color:i.color,$bg:i.bg,children:[r.jsx(l,{size:14}),r.jsx("span",{children:i.label})]})]}),r.jsx(nr,{children:r.jsx(ir,{dangerouslySetInnerHTML:{__html:(t.content||"").replace(/\n/g,"<br>")}})}),r.jsxs(ar,{children:[r.jsxs(sr,{$color:s.color,children:[r.jsx(m,{size:12}),r.jsx("span",{children:s.label})]}),t.expires_at&&r.jsxs(lr,{children:[r.jsx(_,{size:12}),r.jsxs("span",{children:["Expires: ",x(t.expires_at)]})]})]})]},t.id||n)})})]})},Y=e.div`
    animation: fadeIn 0.4s ease-out;
    max-width: 1400px;
    margin: 0 auto;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`,N=e.div`
    margin-bottom: 2rem;
`,G=e.div`
    display: flex;
    align-items: center;
    gap: 1rem;

    svg {
        color: var(--accent-primary);
        flex-shrink: 0;
    }

    h2 {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
    }

    p {
        color: var(--text-secondary);
        font-size: 1rem;
        margin: 0;
    }
`,V=e.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
`,b=e.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 80px;
        height: 80px;
        background: ${o=>o.$color};
        opacity: 0.05;
        border-radius: 50%;
        transform: translate(30%, -30%);
    }

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
        border-color: ${o=>o.$color};
    }
`,v=e.div`
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`,y=e.div`
    flex: 1;
`,j=e.div`
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 0.25rem;
`,w=e.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
`,J=e.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
`,R=e.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.9rem;

    svg {
        color: var(--accent-primary);
    }
`,X=e.div`
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
`,g=e.button`
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid ${o=>o.$active?o.$color||"var(--accent-primary)":"var(--border-color)"};
    background: ${o=>o.$active?o.$color||"var(--accent-primary)":"var(--bg-tertiary)"};
    color: ${o=>o.$active?"white":"var(--text-primary)"};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }
`,q=e.button`
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s;

    &:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
    }
`,K=e.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
`,O=e.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
`,Q=e.div`
    height: 4px;
    background: ${o=>o.$color};
`,W=e.div`
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
`,Z=e.div`
    flex: 1;
    min-width: 0;
`,rr=e.h3`
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
`,er=e.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
`,tr=e.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;

    svg {
        flex-shrink: 0;
    }
`,or=e.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 20px;
    background: ${o=>o.$bg};
    color: ${o=>o.$color};
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    svg {
        flex-shrink: 0;
    }
`,nr=e.div`
    padding: 0 1.5rem 1.25rem 1.5rem;
    flex: 1;
`,ir=e.div`
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.7;
    
    br {
        margin-bottom: 0.5rem;
    }
`,ar=e.div`
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
`,sr=e.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: 16px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: ${o=>o.$color};
    font-size: 0.75rem;
    font-weight: 600;

    svg {
        flex-shrink: 0;
    }
`,lr=e.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;

    svg {
        flex-shrink: 0;
    }
`,cr=e.div`
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    svg {
        opacity: 0.3;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    p {
        font-size: 1rem;
        margin: 0;
        max-width: 500px;
        margin: 0 auto;
    }
`,dr=e.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    p {
        margin-top: 1rem;
        font-size: 1rem;
    }
`,mr=e.div`
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    svg {
        color: #ef4444;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    p {
        font-size: 1rem;
        color: #ef4444;
        margin: 0;
    }
`;export{jr as default};
