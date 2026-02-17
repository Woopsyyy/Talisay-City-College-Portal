import{c as h,r as f,j as a,d as u,u as k,a as w}from"./index-G8dAaOpg.js";const S=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]],$=h("book-open",S);const j=[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]],M=h("briefcase",j);const _=[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]],A=h("graduation-cap",_);const C=[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]],z=h("library",C);const N=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],Y=h("log-out",N);const T=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],L=h("moon",T);const R=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],B=h("shield-check",R);const E=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],D=h("sun",E),J=({className:t})=>{const[m,x]=f.useState(new Date);f.useEffect(()=>{const s=setInterval(()=>x(new Date),1e3);return()=>clearInterval(s)},[]);const l=s=>{let o=s.getHours();const e=s.getMinutes().toString().padStart(2,"0"),n=o>=12?"PM":"AM";return o=o%12,o=o||12,{time:`${o}:${e}`,ampm:n}},g=s=>{const o=s.getDate(),e=r=>{if(r>3&&r<21)return"th";switch(r%10){case 1:return"st";case 2:return"nd";case 3:return"rd";default:return"th"}},n=s.toLocaleDateString("en-US",{weekday:"long"}),i=s.toLocaleDateString("en-US",{month:"long"});return`${n}, ${i} ${o}${e(o)}`},{time:b,ampm:c}=l(m),y=g(m);return a.jsx(G,{className:t,children:a.jsxs("div",{className:"card",children:[a.jsxs("p",{className:"time-text",children:[a.jsx("span",{children:b}),a.jsx("span",{className:"time-sub-text",children:c})]}),a.jsx("p",{className:"day-text",children:y}),a.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"1em",height:"1em",viewBox:"0 0 16 16",strokeWidth:0,fill:"currentColor",stroke:"currentColor",className:"moon",children:[a.jsx("path",{d:"M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"}),a.jsx("path",{d:"M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"})]})]})})},G=u.div`
  .card {
    width: 280px;
    height: 150px;
    background: rgb(17, 4, 134);
    border-radius: 15px;
    box-shadow: rgb(0,0,0,0.7) 5px 10px 50px ,rgb(0,0,0,0.7) -5px 0px 250px;
    display: flex;
    color: white;
    justify-content: center;
    position: relative;
    flex-direction: column;
    background: linear-gradient(to right, rgb(20, 30, 48), rgb(36, 59, 85));
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    overflow: hidden;
  }

  .card:hover {
    box-shadow: rgb(0,0,0) 5px 10px 50px ,rgb(0,0,0) -5px 0px 250px;
  }

  .time-text {
    font-size: 50px;
    margin-top: 0px;
    margin-left: 15px;
    font-weight: 600;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  }

  .time-sub-text {
    font-size: 15px;
    margin-left: 5px;
  }

  .day-text {
    font-size: 18px;
    margin-top: 0px;
    margin-left: 15px;
    font-weight: 500;
    font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  }

  .moon {
    font-size: 20px;
    position: absolute;
    right: 15px;
    top: 15px;
    transition: all 0.3s ease-in-out;
  }

  .card:hover > .moon {
    font-size: 23px;
  }`,O=u.button`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 40px;
  height: 40px;
  border-radius: 50%; /* Circle shape matches profile */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  
  &:hover {
      background: var(--bg-tertiary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      color: var(--accent-primary);
  }
`,K=()=>{const[t,m]=f.useState(()=>{const l=localStorage.getItem("theme");return l||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")});f.useEffect(()=>{document.documentElement.setAttribute("data-theme",t),localStorage.setItem("theme",t)},[t]);const x=()=>{m(l=>l==="light"?"dark":"light")};return a.jsx(O,{onClick:x,title:`Switch to ${t==="light"?"dark":"light"} mode`,children:t==="light"?a.jsx(L,{size:20}):a.jsx(D,{size:20})})},v={admin:{icon:B,color:"#ef4444",path:"/admin/dashboard",label:"Admin"},student:{icon:A,color:"#3b82f6",path:"/home",label:"Student"},teacher:{icon:$,color:"#10b981",path:"/teachers",label:"Teacher"},nt:{icon:M,color:"#f59e0b",path:"/nt/dashboard/study_load",label:"Staff"},faculty:{icon:z,color:"#6366f1",path:"/teachers",label:"Faculty"}},U=["admin","student","teacher","nt","faculty"],V=["dean","osas","treasury"],Q=({label:t="Account Context"})=>{const{user:m,activeRole:x,switchRole:l}=k(),g=w(),c=(e=>{if(!e)return[];const i=[e.role,...Array.isArray(e.roles)?e.roles:[],e.sub_role,...Array.isArray(e.sub_roles)?e.sub_roles:[]].flatMap(r=>{if(!r)return[];if(typeof r=="string"){const p=r.trim();if(!p)return[];try{const d=JSON.parse(p);if(Array.isArray(d))return d;if(typeof d=="string"&&d.trim())return[d.trim()]}catch{}return p.includes(",")?p.split(",").map(d=>d.trim()).filter(Boolean):[p]}return[r]});return[...new Set(i.map(r=>String(r||"").toLowerCase().trim()))].filter(Boolean)})(m),y=c.some(e=>V.includes(e)),s=U.filter(e=>e==="faculty"?y:c.includes(e));if(s.length===0)return null;const o=e=>{const n=v[e];if(!n)return;l(e);let i=n.path;if(e==="faculty"){const r=c.includes("dean"),p=c.includes("osas")||c.includes("treasury");r?i="/teachers":p||c.includes("nt")?i="/nt/dashboard/study_load":c.includes("teacher")&&(i="/teachers")}i&&g(i)};return a.jsxs(F,{children:[a.jsx(H,{children:t}),a.jsx(I,{children:s.map(e=>{const n=v[e],i=n.icon,r=x===e;return a.jsxs(W,{$color:n.color,$active:r,onClick:()=>o(e),title:n.label,children:[a.jsx(i,{size:14}),r&&a.jsx(q,{$color:n.color})]},e)})})]})},F=u.div`
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: var(--accent-primary);
    }
`,H=u.div`
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    letter-spacing: 1px;
    text-align: center;
    opacity: 0.6;
`,I=u.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 2px 0;
`,W=u.button`
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid ${t=>t.$active?t.$color:"var(--border-color)"};
    background: ${t=>t.$active?`${t.$color}15`:"var(--bg-primary)"};
    color: ${t=>t.$active?t.$color:"var(--text-secondary)"};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.1);
        border-color: ${t=>t.$color};
        color: ${t=>t.$color};
        box-shadow: 0 4px 12px ${t=>`${t.$color}20`};
    }

    &:active {
        transform: scale(0.9);
    }
`,q=u.div`
    position: absolute;
    inset: -1px;
    border: 2px solid ${t=>t.$color};
    border-radius: 8px;
    animation: pulse 2s infinite;
    pointer-events: none;

    @keyframes pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(1.05); }
        100% { opacity: 0.0; transform: scale(1.1); }
    }
`;export{$ as B,J as C,A as G,Y as L,B as S,K as T,Q as U,M as a};
