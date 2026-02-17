import{r as i,j as e,P as F,S as I,d as r}from"./index-G8dAaOpg.js";import{B as N}from"./building-2-BmFCJ1tq.js";import{a as E}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{C as u}from"./circle-check-big-BkBU9BDV.js";import{C as j}from"./clock-DTlNUsPA.js";import{D as b,T as v,P as H}from"./target-D4UFUtOT.js";import{C as V}from"./calendar-CG0mXhiR.js";const ce=()=>{const[o,S]=i.useState([]),[$,k]=i.useState(!0),[h,D]=i.useState(null);i.useEffect(()=>{(async()=>{try{const n=await I.getCampusProjects();S(Array.isArray(n)?n:[])}catch(n){console.error("Load transparency error:",n),D(n.message||"Failed to load projects")}finally{k(!1)}})()},[]);const p=t=>{if(!t)return"N/A";const n=String(t).replace(/[₱,]/g,""),s=parseFloat(n);return isNaN(s)?t:"₱"+s.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})},L=t=>{if(!t)return"N/A";try{return new Date(t).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return t}},B=t=>{const n=(t||"").toLowerCase();return n==="completed"?{icon:u,label:"Completed",color:"#10b981",bg:"rgba(16, 185, 129, 0.1)"}:n==="ongoing"?{icon:j,label:"Ongoing",color:"#3b82f6",bg:"rgba(59, 130, 246, 0.1)"}:n==="paused"?{icon:H,label:"Paused",color:"#f59e0b",bg:"rgba(245, 158, 11, 0.1)"}:{icon:v,label:"Planned",color:"#8b5cf6",bg:"rgba(139, 92, 246, 0.1)"}},c=i.useMemo(()=>{const t=o.reduce((a,T)=>{const A=String(T.budget||"0").replace(/[₱,]/g,""),f=parseFloat(A);return a+(isNaN(f)?0:f)},0),n=o.filter(a=>(a.status||"").toLowerCase()==="completed").length,s=o.filter(a=>(a.status||"").toLowerCase()==="ongoing").length;return{totalBudget:t,completed:n,ongoing:s,total:o.length}},[o]);return $?e.jsx(Z,{children:e.jsx(F,{variant:"cards",count:4})}):h?e.jsxs(ee,{children:[e.jsx(AlertCircle,{size:48}),e.jsx("h3",{children:"Failed to Load Projects"}),e.jsx("p",{children:h})]}):e.jsxs(Y,{children:[e.jsx(G,{children:e.jsxs(O,{children:[e.jsx(N,{size:32}),e.jsxs("div",{children:[e.jsx("h2",{children:"Campus Transparency"}),e.jsx("p",{children:"View ongoing and completed campus projects with budget allocation"})]})]})}),e.jsxs(U,{children:[e.jsxs(l,{$color:"#3b82f6",children:[e.jsx(d,{children:e.jsx(E,{size:24})}),e.jsxs(m,{children:[e.jsx(g,{children:"Total Projects"}),e.jsx(x,{children:c.total})]})]}),e.jsxs(l,{$color:"#10b981",children:[e.jsx(d,{children:e.jsx(u,{size:24})}),e.jsxs(m,{children:[e.jsx(g,{children:"Completed"}),e.jsx(x,{children:c.completed})]})]}),e.jsxs(l,{$color:"#f59e0b",children:[e.jsx(d,{children:e.jsx(j,{size:24})}),e.jsxs(m,{children:[e.jsx(g,{children:"Ongoing"}),e.jsx(x,{children:c.ongoing})]})]}),e.jsxs(l,{$color:"#8b5cf6",children:[e.jsx(d,{children:e.jsx(b,{size:24})}),e.jsxs(m,{children:[e.jsx(g,{children:"Total Budget"}),e.jsx(x,{children:p(c.totalBudget)})]})]})]}),o.length===0?e.jsxs(X,{children:[e.jsx(v,{size:64}),e.jsx("h3",{children:"No Projects Available"}),e.jsx("p",{children:"There are currently no campus projects to display."})]}):e.jsx(M,{children:o.map((t,n)=>{const s=B(t.status),a=s.icon;return e.jsxs(R,{children:[e.jsxs(_,{children:[e.jsx(q,{children:t.name||"Unnamed Project"}),e.jsxs(J,{$color:s.color,$bg:s.bg,children:[e.jsx(a,{size:16}),e.jsx("span",{children:s.label})]})]}),t.description&&e.jsx(K,{children:t.description}),e.jsxs(Q,{children:[e.jsxs(y,{children:[e.jsx(w,{children:e.jsx(b,{size:18})}),e.jsxs(C,{children:[e.jsx(z,{children:"Budget"}),e.jsx(P,{children:p(t.budget)})]})]}),e.jsxs(y,{children:[e.jsx(w,{children:e.jsx(V,{size:18})}),e.jsxs(C,{children:[e.jsx(z,{children:"Start Date"}),e.jsx(P,{children:L(t.start_date)})]})]})]}),e.jsx(W,{$color:s.color})]},t.id||n)})})]})},Y=r.div`
    animation: fadeIn 0.4s ease-out;
    max-width: 1400px;
    margin: 0 auto;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`,G=r.div`
    margin-bottom: 2rem;
`,O=r.div`
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
`,U=r.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
`,l=r.div`
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
        width: 100px;
        height: 100px;
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
`,d=r.div`
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`,m=r.div`
    flex: 1;
`,g=r.div`
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 0.25rem;
`,x=r.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
`,M=r.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
`,R=r.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
`,_=r.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
`,q=r.h3`
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    line-height: 1.4;
`,J=r.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 20px;
    background: ${o=>o.$bg};
    color: ${o=>o.$color};
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;

    svg {
        flex-shrink: 0;
    }
`,K=r.p`
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 1.25rem 0;
`,Q=r.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`,y=r.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`,w=r.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`,C=r.div`
    flex: 1;
`,z=r.div`
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 0.2rem;
`,P=r.div`
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
`,W=r.div`
    height: 4px;
    background: linear-gradient(90deg, ${o=>o.$color}, transparent);
    border-radius: 2px;
    margin: 1.25rem -1.5rem -1.5rem -1.5rem;
`,X=r.div`
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
    }
`,Z=r.div`
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
`,ee=r.div`
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
`;export{ce as default};
