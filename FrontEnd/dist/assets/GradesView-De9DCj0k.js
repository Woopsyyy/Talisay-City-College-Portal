import{c as U,r as d,S as z,j as e,P as F,X as H,d as r}from"./index-G8dAaOpg.js";import{A as V}from"./award-C-798qRU.js";import{C as J}from"./calendar-CG0mXhiR.js";import{B as W,G as X}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{U as q}from"./user-DNE8y8gH.js";import{D as K}from"./download-BQ6YnnDK.js";const Q=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Z=U("eye",Q),He=({currentUser:i})=>{const[m,_]=d.useState({}),[l,$]=d.useState([]),[O,A]=d.useState(!0),[N,Y]=d.useState(null),[c,P]=d.useState(null),[L,D]=d.useState(null),[s,y]=d.useState(null);d.useEffect(()=>{M()},[]);const M=async()=>{try{A(!0);const[t,o,n]=await Promise.all([z.getGrades().catch(p=>(console.error("Grades fetch error:",p),[])),z.getStudyLoad("all").catch(p=>(console.error("Study load fetch error:",p),[])),z.getAssignment().catch(p=>(console.error("Assignment fetch error:",p),null))]);console.log("Debug - Study Load Received:",o),console.log("Debug - Assignment Received:",n);const a=Array.isArray(o)?o:o?[o]:[];$(a);const x=Array.isArray(n)&&n.length>0?n[0]:n;P(x);const f={};(Array.isArray(t)?t:[]).forEach(p=>{const u=p.year||"unknown";f[u]||(f[u]={label:R(u),subjects:[]}),f[u].subjects.push(p)}),_(f)}catch(t){console.error("fetchData overall error:",t),Y(t.message||"Failed to load academic records")}finally{A(!1)}},B=t=>{D(t),setTimeout(()=>{window.print(),D(null)},500)},G=t=>{if(t=parseInt(t),t<=0)return"";const o=["th","st","nd","rd","th","th","th","th","th","th"],n=t%100;return n>=11&&n<=13?t+"th":t+(o[t%10]||"th")},R=t=>{const o=String(t).trim();if(o==="unknown"||o==="")return"Academic Records";if(o.toLowerCase().includes("year"))return o;if(!isNaN(o)){const n=parseInt(o);if(n>0&&n<=10)return G(n)+" Year"}return o},h=t=>{const o=String(t||"").trim().toLowerCase();return o===""?"N/A":o.includes("1")||o.includes("first")?"1st Semester":o.includes("2")||o.includes("second")?"2nd Semester":o.includes("summer")?"Summer":o},v=["1","2","3","4"],E=d.useMemo(()=>Object.keys(m).sort((t,o)=>{const n=v.indexOf(t),a=v.indexOf(o);return n!==-1&&a!==-1?n-a:n!==-1?-1:a!==-1?1:t.localeCompare(o)}),[m,v]),j=d.useMemo(()=>l.filter(t=>h(t.semester)==="1st Semester"),[l]),w=d.useMemo(()=>l.filter(t=>h(t.semester)==="2nd Semester"),[l]),S=d.useMemo(()=>l.filter(t=>{const o=h(t.semester);return o!=="1st Semester"&&o!=="2nd Semester"}),[l]);console.log("Subjects Categorized:",{total:l.length,first:j.length,second:w.length,other:S.length});const k=(t,o,n)=>e.jsxs("div",{className:`printable-section ${L&&L!==o?"hidden-print":""}`,children:[e.jsxs(De,{className:"no-print",children:[e.jsx(Ee,{children:n}),e.jsxs(Ie,{onClick:()=>B(o),disabled:t.length===0,children:[e.jsx(K,{size:18})," Download ",n]})]}),e.jsxs(_e,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:"120px"},children:"Subject Code"}),e.jsx("th",{children:"Descriptive Title"}),e.jsx("th",{style:{width:"80px",textAlign:"center"},children:"Units"})]})}),e.jsxs("tbody",{children:[t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"3",className:"text-center empty",children:"No subjects enrolled for this semester."})}):t.map((a,x)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx($e,{children:a.subject_code})}),e.jsx("td",{className:"subject-title-cell",children:a.subject_title}),e.jsx("td",{style:{textAlign:"center"},children:e.jsx("strong",{children:a.units})})]},x)),t.length>0&&e.jsxs(ke,{children:[e.jsx("td",{colSpan:"2",style:{textAlign:"right",paddingRight:"2rem"},children:e.jsx("strong",{children:"TOTAL UNITS ENROLLED:"})}),e.jsx("td",{style:{textAlign:"center"},children:e.jsx("strong",{children:t.reduce((a,x)=>a+parseFloat(x.units||0),0)})})]})]})]})]});return O?e.jsx(F,{variant:"table",columns:3}):N?e.jsx(I,{children:e.jsxs("div",{className:"alert alert-danger",children:["Error loading grades: ",N]})}):e.jsxs(I,{children:[e.jsxs(ee,{children:[e.jsx("h2",{children:"Academic Records"}),e.jsx("p",{children:"Track your grades and enrollment status"})]}),E.length===0?e.jsxs(xe,{children:[e.jsx(V,{size:48}),e.jsx("p",{children:"No academic records found."})]}):E.map(t=>{const o=m[t];return e.jsxs(re,{children:[e.jsxs(te,{children:[e.jsx(J,{size:20})," ",o.label]}),e.jsx(oe,{children:o.subjects.map((n,a)=>e.jsxs(ne,{onClick:()=>y(n),children:[e.jsx(ie,{children:e.jsx(W,{size:24})}),e.jsxs(ae,{children:[e.jsx(se,{children:n.subject_code||"SUBJ"}),e.jsx(de,{children:n.subject||"Unknown Subject"}),e.jsxs(le,{children:[e.jsx(Z,{size:14})," View Grades"]})]})]},a))})]},t)}),e.jsxs(Pe,{children:[e.jsxs(pe,{className:"no-print",children:[e.jsxs(ce,{style:{marginTop:"4rem"},children:[e.jsx(X,{size:24})," Study Load Management"]}),e.jsx(me,{children:e.jsx("img",{src:"/images/tcc-logo.png",alt:"TCC Logo",onError:t=>t.target.style.display="none"})})]}),e.jsxs(ze,{id:"study-load-printable",children:[e.jsxs(Ce,{children:[e.jsx(Te,{children:e.jsx("img",{src:"/images/tcc-logo.png",alt:"TCC Logo",onError:t=>t.target.style.display="none"})}),e.jsxs(Ae,{children:[e.jsx("h1",{children:"Talisay City College"}),e.jsx("p",{children:"Poblacion, Talisay City, Cebu, Philippines 6045"}),e.jsx("p",{children:"Tel. No. (032) 272-6804 | Email: talisaycitycollege@gmail.com"}),e.jsx("h3",{children:"Office of the Registrar"})]})]}),e.jsx(Ne,{children:e.jsx("h2",{children:"CERTIFICATE OF ENROLLMENT (STUDY LOAD)"})}),e.jsxs(Le,{children:[e.jsxs(g,{$span:2,children:[e.jsx("label",{children:"Student Name"}),e.jsx("span",{children:i?.full_name||"N/A"})]}),e.jsxs(g,{children:[e.jsx("label",{children:"Student ID"}),e.jsx("span",{children:i?.school_id||"N/A"})]}),e.jsxs(g,{children:[e.jsx("label",{children:"Gender"}),e.jsx("span",{children:i?.sex||i?.gender||"-"})]}),e.jsxs(g,{$span:2,children:[e.jsx("label",{children:"Course / Program"}),e.jsx("span",{children:c?.department||c?.section_course||"N/A"})]}),e.jsxs(g,{children:[e.jsx("label",{children:"Year & Section"}),e.jsxs("span",{children:[c?.year_level||c?.grade_level||"1"," - ",c?.section_full_name||c?.section_name||c?.section_code||"N/A"]})]}),e.jsxs(g,{children:[e.jsx("label",{children:"Academic Year"}),e.jsx("span",{children:c?.school_year||"2025-2026"})]})]}),j.length>0&&k(j,"1st Semester","1ST SEMESTER STUDY LOAD"),w.length>0&&k(w,"2nd Semester","2ND SEMESTER STUDY LOAD"),S.length>0&&k(S,"Other","ADDITIONAL SUBJECTS"),l.length===0&&e.jsxs("div",{style:{padding:"2rem",textAlign:"center",color:"#666",fontStyle:"italic",background:"rgba(0,0,0,0.02)",borderRadius:"8px",border:"1px dashed #ddd"},children:[e.jsx("p",{children:"No study load subjects found for your current assignment."}),e.jsx("p",{style:{fontSize:"0.8rem"},children:"Check if your year level and section are correctly assigned."})]}),e.jsxs(Oe,{children:[e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{className:"line"}),e.jsx("span",{children:"Student's Signature"})]}),e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{className:"line"}),e.jsx("span",{children:"Registrar's Signature"})]})]}),e.jsx(Ye,{children:e.jsx("p",{children:"NOT VALID WITHOUT OFFICIAL SEAL"})})]})]}),s&&e.jsx(be,{onClick:()=>y(null),children:e.jsxs(he,{onClick:t=>t.stopPropagation(),children:[e.jsxs(fe,{children:[e.jsxs("div",{children:[e.jsx(ue,{children:s.subject}),e.jsxs(ye,{children:[s.subject_code," • ",h(s.semester)]})]}),e.jsx(ve,{onClick:()=>y(null),children:e.jsx(H,{size:24})})]}),e.jsxs(je,{children:[e.jsxs(we,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Term"}),e.jsx("th",{children:"Grade"}),e.jsx("th",{children:"Status"})]})}),e.jsxs("tbody",{children:[e.jsxs("tr",{children:[e.jsx("td",{children:"Prelim"}),e.jsx("td",{children:e.jsx(T,{children:s.prelim_grade||"—"})}),e.jsx("td",{children:C(s.prelim_grade)})]}),e.jsxs("tr",{children:[e.jsx("td",{children:"Midterm"}),e.jsx("td",{children:e.jsx(T,{children:s.midterm_grade||"—"})}),e.jsx("td",{children:C(s.midterm_grade)})]}),e.jsxs("tr",{children:[e.jsx("td",{children:"Finals"}),e.jsx("td",{children:e.jsx(T,{children:s.finals_grade||"—"})}),e.jsx("td",{children:C(s.finals_grade)})]})]})]}),s.instructor&&e.jsxs(Se,{children:[e.jsx(q,{size:16}),"Instructor: ",e.jsx("strong",{children:s.instructor})]})]})]})})]})},C=i=>{if(!i)return e.jsx(b,{$type:"pending",children:"Pending"});const m=parseFloat(i);return isNaN(m)?e.jsx(b,{$type:"neutral",children:i}):m<=3?e.jsx(b,{$type:"pass",children:"Passed"}):m>3?e.jsx(b,{$type:"fail",children:"Failed"}):e.jsx(b,{$type:"neutral",children:"—"})},I=r.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 4rem;
`,ee=r.div`
  margin-bottom: 2.5rem;
  h2 { font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`,re=r.div`
    margin-bottom: 3rem;
`,te=r.h3`
    display: flex; align-items: center; gap: 0.75rem; font-size: 1.4rem; color: var(--accent-primary); margin-bottom: 1.5rem;
`,oe=r.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;
`,ne=r.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;
    cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 1rem; position: relative; overflow: hidden;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
    &:hover button { color: var(--accent-primary); background: var(--bg-tertiary); }
`,ie=r.div`
    width: 48px; height: 48px; border-radius: 12px; background: var(--bg-tertiary); color: var(--accent-primary);
    display: flex; align-items: center; justify-content: center;
`,ae=r.div`
    display: flex; flex-direction: column; gap: 0.25rem;
`,se=r.span`
    font-family: monospace; font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-tertiary); 
    padding: 2px 6px; border-radius: 4px; align-self: flex-start;
`,de=r.h4`
    font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0; line-height: 1.4;
`,le=r.button`
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);
    background: transparent; border: none; padding: 0.5rem 0; margin-top: auto; cursor: pointer; transition: color 0.2s;
`,ce=r.h3`
  display: flex; align-items: center; gap: 10px; font-size: 1.5rem; color: var(--text-primary); margin: 3rem 0 1.5rem 0;
`,pe=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`,me=r.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img { width: 48px; height: 48px; object-fit: contain; }
`;r.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`;r.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`;r.div` padding: 0; `;r.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  th { background: var(--bg-tertiary); color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
  td { color: var(--text-primary); font-size: 0.95rem; }
  tr:last-child td { border-bottom: none; }
`;r.span`
  font-family: monospace; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;
`;r.div`
    display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); svg { color: var(--text-secondary); }
`;r.tr`
  background: var(--bg-tertiary); td { font-weight: 700; color: var(--text-primary); }
`;const ge=r.div`
    padding: 3rem; text-align: center; color: var(--text-secondary);
`,xe=r(ge)`
    background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; gap: 1rem; svg { opacity: 0.5; }
`,be=r.div`
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;
    display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); animation: fadeIn 0.2s;
`,he=r.div`
    background: var(--bg-secondary); width: 90%; max-width: 500px; border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`,fe=r.div`
    padding: 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start;
`,ue=r.h3` margin: 0; font-size: 1.25rem; color: var(--text-primary); line-height: 1.2; `,ye=r.p` margin: 0.25rem 0 0 0; font-size: 0.9rem; color: var(--text-secondary); `,ve=r.button`
    background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0; margin-left: 1rem;
    &:hover { color: var(--text-primary); }
`,je=r.div` padding: 1.5rem; `,we=r.table`
    width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem;
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
    th { background: var(--bg-tertiary); font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); }
    tr:last-child td { border-bottom: none; }
`,T=r.span` font-weight: 700; color: var(--text-primary); font-size: 1rem; `,b=r.span`
    padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    background: ${i=>i.$type==="pass"?"rgba(16, 185, 129, 0.1)":i.$type==="fail"?"rgba(239, 68, 68, 0.1)":"var(--bg-tertiary)"};
    color: ${i=>i.$type==="pass"?"#10b981":i.$type==="fail"?"#ef4444":"var(--text-secondary)"};
`,Se=r.div`
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); padding-top: 1rem; border-top: 1px solid var(--border-color);
    strong { color: var(--text-primary); }
`;r.div`
    background: var(--bg-secondary);
    border-radius: 20px;
    border: 1px solid var(--border-color);
    padding: 2rem;
    box-shadow: var(--shadow-md);
    margin-top: 1rem;
    margin-bottom: 2rem;
`;r.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
`;r.div`
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    transition: all 0.2s;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
        border-color: var(--accent-primary);
    }
`;r.div`
    font-size: 0.8rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    letter-spacing: 0.5px;
`;r.div`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    word-break: break-word;
`;r.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-tertiary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
`;r.div`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
`;r.div`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`;r.div`
    flex: 1;
    min-width: 0;
`;r.div`
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
    letter-spacing: 0.5px;
`;r.div`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    word-break: break-word;
`;r.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    background: ${i=>i.$status==="Irregular"?"rgba(251, 191, 36, 0.15)":"rgba(34, 197, 94, 0.15)"};
    color: ${i=>i.$status==="Irregular"?"#f59e0b":"#22c55e"};
    border: 1px solid ${i=>i.$status==="Irregular"?"rgba(251, 191, 36, 0.3)":"rgba(34, 197, 94, 0.3)"};
`;r.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
`;r.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: 1rem;
    
    h4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        svg {
            color: var(--accent-primary);
        }
    }
`;r.div`
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
`;r.div`
    background: var(--bg-secondary);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    
    span {
        margin-right: 0.25rem;
    }
    
    strong {
        color: var(--accent-primary);
        font-size: 1.1rem;
    }
`;r.table`
    width: 100%;
    border-collapse: collapse;
    
    thead {
        background: var(--bg-tertiary);
        
        th {
            padding: 1rem 1.5rem;
            text-align: left;
            font-weight: 700;
            font-size: 0.85rem;
            text-transform: uppercase;
            color: var(--text-secondary);
            letter-spacing: 0.5px;
            border-bottom: 2px solid var(--border-color);
        }
    }
    
    tbody {
        tr {
            border-bottom: 1px solid var(--border-color);
            transition: background 0.15s;
            
            &:hover {
                background: var(--bg-tertiary);
            }
            
            &:last-child {
                border-bottom: none;
            }
            
            td {
                padding: 1.25rem 1.5rem;
                color: var(--text-primary);
                font-size: 0.95rem;
            }
        }
    }
`;r.span`
    display: inline-block;
    padding: 4px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-primary);
`;r.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 50%;
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--accent-primary);
`;const ke=r.tr`
    background: #f8fafc;
    td { border-top: 2px solid #0f172a !important; border-bottom: none !important; padding: 1rem !important; }
`,ze=r.div`
    background: white; 
    padding: 4rem; 
    border-radius: 12px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
    color: #1a1a1a;
    font-family: 'Inter', system-ui, sans-serif;
    border: 1px solid #eef0f2;
    position: relative;
    max-width: 900px;
    margin: 3rem auto;

    @media print { 
        box-shadow: none; 
        padding: 0; 
        border: none;
        max-width: 100%;
        margin: 0;
    }
`,Ce=r.div`
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 3px double #0056b3;
`,Te=r.div`
    background: #f8fafc;
    width: 90px;
    height: 90px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #e2e8f0;
    
    img { width: 70px; height: 70px; object-fit: contain; }
`,Ae=r.div`
    h1 { font-size: 2rem; font-weight: 900; margin: 0; color: #003366; letter-spacing: -0.5px; }
    p { font-size: 0.85rem; color: #64748b; margin: 3px 0; font-weight: 600; }
    h3 { font-size: 1rem; font-weight: 700; margin: 8px 0 0 0; color: #0056b3; text-transform: uppercase; letter-spacing: 2px; }
`,Ne=r.div`
    text-align: center;
    margin-bottom: 3rem;
    h2 { font-size: 1.6rem; font-weight: 900; color: #1e293b; margin: 0; border-bottom: 2px solid #334155; display: inline-block; padding-bottom: 5px; }
`,Le=r.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    margin-bottom: 3rem;
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;

    @media print { background: none; border: 1px solid #eef0f2; }
`,g=r.div`
    grid-column: span ${i=>i.$span||1};
    display: flex;
    flex-direction: column;
    gap: 3px;
    
    label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    span { font-size: 1rem; font-weight: 700; color: #0f172a; }
`,De=r.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    
    @media print { display: none; }
`,Ee=r.h3`
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
    position: relative;
    padding-left: 15px;
    &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 80%;
        background: #0056b3;
        border-radius: 2px;
    }
`,Ie=r.button`
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0056b3;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 86, 179, 0.2);

    &:hover { background: #004494; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 86, 179, 0.3); }
    &:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
`,_e=r.table`
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3rem;
    
    th {
        background: #f1f5f9;
        text-align: left;
        padding: 1rem;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
    }

    td {
        padding: 1rem;
        font-size: 0.95rem;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
    }

    .subject-title-cell {
        font-weight: 600;
        color: #0f172a;
    }
`,$e=r.span`
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.85rem;
    color: #0056b3;
    border: 1px solid #e2e8f0;
`,Oe=r.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4rem;
    margin-top: 4rem;
    padding-top: 2rem;

    .sig-block {
        text-align: center;
        .line { border-bottom: 2px solid #1e293b; margin-bottom: 10px; }
        span { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #475569; }
    }
`,Ye=r.div`
    margin-top: 4rem;
    text-align: center;
    p { 
        display: inline-block;
        border: 2px dashed #cbd5e1;
        padding: 15px 30px;
        color: #94a3b8;
        font-weight: 800;
        font-size: 0.75rem;
        letter-spacing: 2px;
    }
`,Pe=r.div`
    @media print {
        body * { visibility: hidden; pointer-events: none; }
        #study-load-printable, #study-load-printable * { visibility: visible; }
        #study-load-printable { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
        }
        .no-print { display: none !important; }
        .hidden-print { display: none !important; }
        @page { size: auto; margin: 15mm; }
    }
`;export{He as default};
