import{c as T,r as s,T as g,j as e,P as Y,d as t}from"./index-G8dAaOpg.js";import{B as C}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{A as H}from"./award-C-798qRU.js";import{U as N}from"./users-CneqRZry.js";const U=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],V=T("chevron-left",U),ye=({isReadOnly:n=!1})=>{const[y,A]=s.useState([]),[M,B]=s.useState(!0),[l,b]=s.useState(null),[h,E]=s.useState([]),[j,w]=s.useState({}),[I,S]=s.useState(!1),[i,c]=s.useState(null),[o,x]=s.useState({prelim:"",midterm:"",finals:""}),[m,k]=s.useState(!1);s.useEffect(()=>{F()},[]);const F=async()=>{try{const r=await g.getSections();A(Array.isArray(r)?r:[])}catch(r){console.error("Error fetching sections:",r)}finally{B(!1)}},P=async r=>{b(r),S(!0);try{let a=[],d={};try{a=await g.getStudentsBySection(r.name)}catch(p){console.error("Error fetching students:",p)}try{r.subjects&&r.subjects.length>0&&(d=await g.getGrades({section:r.name,subject:r.subjects[0]?.code}))}catch(p){console.error("Error fetching grades:",p)}E(Array.isArray(a)?a:[]),w(d||{})}catch(a){console.error(a)}finally{S(!1)}},D=r=>{const a=j[r.id]||{};x({prelim:a.prelim_grade||"",midterm:a.midterm_grade||"",finals:a.finals_grade||""}),c(r)},L=async()=>{if(!(!i||!l)){k(!0);try{const r={student_id:i.id,subject:l.subjects[0]?.code,prelim:o.prelim,midterm:o.midterm,finals:o.finals};await g.createGrade(r),w(a=>({...a,[i.id]:{...a[i.id],prelim_grade:o.prelim,midterm_grade:o.midterm,finals_grade:o.finals}})),c(null)}catch(r){alert("Failed to save grades: "+r.message)}finally{k(!1)}}};if(M)return e.jsx(Y,{variant:"cards"});if(!l)return e.jsxs(_,{children:[e.jsxs(q,{children:[e.jsxs("div",{children:[e.jsx(J,{children:n?"Grade Monitoring":"Grade Management"}),e.jsx(K,{children:n?"View student performance across sections":"Select a section to manage student grades"})]}),e.jsx(C,{size:32,color:"var(--accent-primary)"})]}),y.length===0?e.jsxs(z,{children:[e.jsx(H,{size:48}),e.jsx("p",{children:"No sections assigned to you yet."})]}):e.jsx(Q,{children:y.map((r,a)=>e.jsxs(W,{onClick:()=>P(r),children:[e.jsxs(X,{children:[e.jsxs(Z,{children:[r.year_level||"Yr"," - ",r.name]}),e.jsx(N,{size:20})]}),e.jsxs(O,{children:[e.jsx(R,{children:r.course||"General"}),e.jsx(ee,{children:r.subjects.map((d,p)=>e.jsxs(re,{children:[e.jsx(C,{size:14}),e.jsx("span",{children:d.name})]},p))})]})]},a))})]});const $=s.useMemo(()=>[...h].sort((r,a)=>r.full_name.localeCompare(a.full_name)),[h]);return e.jsxs(_,{children:[e.jsxs(te,{children:[e.jsxs(ae,{onClick:()=>b(null),children:[e.jsx(V,{size:20})," Back to Sections"]}),e.jsxs(oe,{children:[e.jsx("h2",{children:l.name}),e.jsxs("p",{children:[l.subjects[0]?.name," • ",n?"Monitoring":"Master List"]})]})]}),I?e.jsx(Loader,{}):e.jsxs(e.Fragment,{children:[e.jsx(ne,{children:$.map(r=>{const a=j[r.id];return e.jsxs(se,{onClick:()=>!n&&D(r),style:{cursor:n?"default":"pointer"},children:[e.jsx(ie,{children:r.image_path?e.jsx("img",{src:r.image_path,alt:r.full_name,onError:d=>d.target.style.display="none"}):r.full_name.charAt(0)}),e.jsxs(de,{children:[e.jsx("h3",{children:r.full_name}),e.jsx("span",{children:r.school_id||"No ID"})]}),e.jsxs(le,{children:[e.jsxs(u,{children:[e.jsx("label",{children:"Prelim"}),e.jsx("strong",{children:a?.prelim_grade||"-"})]}),e.jsxs(u,{children:[e.jsx("label",{children:"Midterm"}),e.jsx("strong",{children:a?.midterm_grade||"-"})]}),e.jsxs(u,{children:[e.jsx("label",{children:"Finals"}),e.jsx("strong",{children:a?.finals_grade||"-"})]})]})]},r.id)})}),h.length===0&&e.jsx(z,{children:"No students found in this section."})]}),i&&e.jsx(ce,{onClick:()=>!m&&c(null),children:e.jsxs(me,{onClick:r=>r.stopPropagation(),children:[e.jsxs(pe,{children:[e.jsxs("h3",{children:["Grading: ",i.full_name]}),e.jsx("button",{onClick:()=>c(null),disabled:m,children:"×"})]}),e.jsxs(xe,{children:[e.jsxs(f,{children:[e.jsx("label",{children:"Prelim Grade"}),e.jsx(v,{type:"text",value:o.prelim,onChange:r=>x({...o,prelim:r.target.value}),placeholder:"e.g. 1.0, 85, A"})]}),e.jsxs(f,{children:[e.jsx("label",{children:"Midterm Grade"}),e.jsx(v,{type:"text",value:o.midterm,onChange:r=>x({...o,midterm:r.target.value}),placeholder:"e.g. 1.0, 85, A"})]}),e.jsxs(f,{children:[e.jsx("label",{children:"Finals Grade"}),e.jsx(v,{type:"text",value:o.finals,onChange:r=>x({...o,finals:r.target.value}),placeholder:"e.g. 1.0, 85, A"})]})]}),e.jsxs(ge,{children:[e.jsx(G,{$secondary:!0,onClick:()=>c(null),disabled:m,children:"Cancel"}),e.jsx(G,{onClick:L,disabled:m,children:m?"Saving...":"Save Grades"})]})]})})]})},_=t.div`
    padding: 1rem;
    animation: fadeIn 0.3s ease-out;
    max-width: 1200px;
    margin: 0 auto;
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`,q=t.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;
`,J=t.h2`
    font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800;
`,K=t.p` color: var(--text-secondary); margin: 0; font-size: 1rem; `,Q=t.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
`,W=t.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; 
    overflow: hidden; cursor: pointer; transition: all 0.2s;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`,X=t.div`
    padding: 1.25rem; background: var(--bg-tertiary); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);
    svg { color: var(--text-secondary); }
`,Z=t.span`
    background: var(--accent-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;
`,O=t.div` padding: 1.25rem; `,R=t.h3` font-size: 1.1rem; margin: 0 0 1rem 0; color: var(--text-primary); `,ee=t.div` display: flex; flex-direction: column; gap: 0.5rem; `,re=t.div`
    display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;
    svg { color: var(--accent-primary); }
`,z=t.div`
    display: flex; flex-direction: column; align-items: center; padding: 4rem; color: var(--text-secondary); gap: 1rem;
    background: var(--bg-secondary); border-radius: 16px;
    svg { opacity: 0.5; }
`,te=t.div` margin-bottom: 2rem; `,ae=t.button`
    display: flex; align-items: center; gap: 0.5rem; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 600; margin-bottom: 1rem;
    &:hover { color: var(--accent-primary); }
`,oe=t.div`
    h2 { font-size: 2rem; margin: 0 0 0.25rem 0; color: var(--text-primary); }
    p { color: var(--text-secondary); font-size: 1.1rem; }
`,ne=t.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;
`,se=t.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; 
    display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s;
    &:hover { border-color: var(--accent-primary); box-shadow: var(--shadow-sm); }
`,ie=t.div`
    width: 48px; height: 48px; border-radius: 50%; background: var(--bg-tertiary); color: var(--accent-primary); 
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; }
`,de=t.div`
    flex: 1; min-width: 0;
    h3 { margin: 0 0 0.25rem 0; font-size: 1rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    span { font-size: 0.85rem; color: var(--text-secondary); }
`,le=t.div`
    display: flex; gap: 0.75rem; text-align: center;
`,u=t.div`
    display: flex; flex-direction: column;
    label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; }
    strong { font-size: 0.9rem; color: var(--accent-primary); }
`,ce=t.div`
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
`,me=t.div`
    background: var(--bg-secondary); width: 90%; max-width: 500px; border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: slideUp 0.3s ease-out;
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`,pe=t.div`
    padding: 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;
    h3 { margin: 0; color: var(--text-primary); }
    button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); &:hover { color: var(--text-primary); } }
`,xe=t.div` padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; `,f=t.div`
    display: flex; flex-direction: column; gap: 0.5rem;
    label { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
`,v=t.input`
    padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);
    &:focus { outline: none; border-color: var(--accent-primary); }
`,ge=t.div`
    padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem;
`,G=t.button`
    padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s;
    background: ${n=>n.$secondary?"transparent":"var(--accent-primary)"};
    color: ${n=>n.$secondary?"var(--text-secondary)":"white"};
    border: ${n=>n.$secondary?"1px solid var(--border-color)":"none"};
    &:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;export{ye as default};
