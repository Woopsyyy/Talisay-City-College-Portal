import{r as o,o as l,j as e,P as oe,d as r}from"./index-G8dAaOpg.js";import{T as ne}from"./Toast-CfYD9-5b.js";import{A as ie}from"./arrow-left-DhUokZpI.js";import{G as B,B as F}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{C as ae}from"./circle-plus-BofdGSWu.js";import{C as de}from"./circle-alert-QpU8jh7N.js";import{L as ce}from"./layers-CqdCGdQ0.js";import{D as le}from"./download-BQ6YnnDK.js";import{T as pe}from"./trash-2-D6PG7ToH.js";import"./circle-check-big-BkBU9BDV.js";import"./triangle-alert-DHUh_5GK.js";const it=()=>{const[n,H]=o.useState([]),[M,C]=o.useState(!0),[i,k]=o.useState(null),[p,m]=o.useState([]),[L,z]=o.useState(!1),[x,T]=o.useState("All"),[b,d]=o.useState(null),[D,P]=o.useState([]),[E,f]=o.useState(""),[N,j]=o.useState([]),[U,y]=o.useState(""),g=o.useRef(null),G={day:"Monday",time_start:"00:00",time_end:"00:00",building:"",room:""};o.useEffect(()=>{_()},[]),o.useEffect(()=>()=>{g.current&&clearTimeout(g.current)},[]);const _=async()=>{try{C(!0);const t=await l.getSectionsWithLoad();H(Array.isArray(t)?t:[])}catch(t){console.error("Error loading sections:",t)}finally{C(!1)}},V=async()=>{try{const t=await l.getSubjects();console.log("Fetched Subjects:",t),P(Array.isArray(t)?t:[])}catch(t){console.error("Error loading subjects:",t)}},W=async t=>{k(t),z(!0),D.length===0&&V();try{const s=await l.getSectionLoadDetails(t.id);m(Array.isArray(s)?s:[])}catch(s){console.error("Error details:",s)}finally{z(!1)}},J=()=>{k(null),m([]),_()},q=t=>{const s=t.target.value;if(f(s),y(""),g.current&&clearTimeout(g.current),s.length===0){j([]);return}g.current=setTimeout(()=>{const a=D.filter(c=>c.subject_code.toLowerCase().includes(s.toLowerCase())||c.subject_name.toLowerCase().includes(s.toLowerCase()));j(a.slice(0,10))},200)},K=t=>{f(`${t.subject_code} - ${t.subject_name}`),y(t.subject_code),j([])},Q=async()=>{const t=U||E;if(!t){d({message:"Please enter or select a subject.",type:"error"});return}try{let s=t.split(" - ")[0].trim().toUpperCase();await l.createSchedule({subject:s,section:i.section_name,...G});const a=await l.getSectionLoadDetails(i.id);m(Array.isArray(a)?a:[]),f(""),y(""),d({message:"Subject added successfully!",type:"success"})}catch(s){console.error(s),s.message&&(s.message.includes("already assigned")||s.status===409)?d({message:"Warning: Subject already assigned to this section.",type:"warning"}):d({message:"Error adding subject: "+(s.message||"Unknown error"),type:"error"})}},X=async()=>{if(window.confirm("Are you sure you want to CLEAR ALL subjects from this section's study load? This cannot be undone."))try{await l.clearSectionLoad(i.id),m([]),d({message:"Study load cleared successfully!",type:"success"})}catch(t){d({message:"Failed to clear: "+t.message,type:"error"})}},Z=async t=>{if(window.confirm("Remove this subject from study load?"))try{await l.deleteStudyLoad(t);const s=await l.getSectionLoadDetails(i.id);m(Array.isArray(s)?s:[]),d({message:"Subject removed successfully",type:"success"})}catch(s){d({message:"Failed to delete: "+s.message,type:"error"})}},I=o.useMemo(()=>x==="All"?n:n.filter(t=>String(t.grade_level)===String(x)),[x,n]),ee=o.useMemo(()=>["1","2","3","4"],[]),v=t=>{const s=["th","st","nd","rd"],a=t%100;return s[(a-20)%10]||s[a]||s[0]},[u,O]=o.useState(null),te=t=>{O(t),setTimeout(()=>{window.print(),O(null)},500)},re=o.useMemo(()=>p.filter(t=>t.semester==="First Semester"||t.semester==="1st Semester"),[p]),se=o.useMemo(()=>p.filter(t=>t.semester==="Second Semester"||t.semester==="2nd Semester"),[p]),R=o.useMemo(()=>p.filter(t=>!["First Semester","1st Semester","Second Semester","2nd Semester"].includes(t.semester)),[p]),S=(t,s,a)=>e.jsxs("div",{className:`printable-section ${u&&u!==s?"hidden-print":""}`,children:[e.jsxs(Ee,{className:"no-print",children:[e.jsx(Ne,{children:a}),e.jsxs(_e,{onClick:()=>te(s),disabled:t.length===0,children:[e.jsx(le,{size:18})," Download ",a]})]}),e.jsxs(Ie,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{style:{width:"120px"},children:"Subject Code"}),e.jsx("th",{children:"Descriptive Title"}),e.jsx("th",{style:{width:"80px",textAlign:"center"},children:"Units"}),e.jsx("th",{className:"no-print",style:{width:"60px"}})]})}),e.jsxs("tbody",{children:[L?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center",children:"Loading Data..."})}):t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center empty",children:"No subjects enrolled for this semester."})}):t.map((c,w)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(Oe,{children:c.subject_code})}),e.jsx("td",{className:"subject-title-cell",children:c.subject_title}),e.jsx("td",{style:{textAlign:"center"},children:e.jsx("strong",{children:c.units})}),e.jsx("td",{className:"no-print",children:e.jsx(Re,{onClick:()=>Z(c.id),title:"Remove Subject",children:e.jsx(pe,{size:16})})})]},w)),!L&&t.length>0&&e.jsxs(Be,{children:[e.jsx("td",{colSpan:"2",style:{textAlign:"right",paddingRight:"2rem"},children:e.jsx("strong",{children:"TOTAL UNITS ENROLLED:"})}),e.jsx("td",{style:{textAlign:"center"},children:e.jsx("strong",{children:t.reduce((c,w)=>c+parseFloat(w.units||0),0)})}),e.jsx("td",{className:"no-print"})]})]})]})]});return i?e.jsxs(Se,{children:[e.jsx(we,{className:"no-print",children:e.jsxs(Ae,{onClick:J,children:[e.jsx(ie,{size:20})," Back to Sections"]})}),e.jsxs(Ce,{id:"study-load-printable",children:[e.jsxs(ke,{children:[e.jsx(Le,{children:e.jsx(B,{size:48,color:"#0056b3"})}),e.jsxs(ze,{children:[e.jsx("h1",{children:"Talisay City College"}),e.jsx("p",{children:"Poblacion, Talisay City, Cebu, 6045"}),e.jsx("h3",{children:"OFFICE OF THE REGISTRAR"})]})]}),e.jsxs(Te,{children:[e.jsx("h2",{children:"OFFICIAL STUDY LOAD"}),u&&e.jsx("div",{className:"semester-badge",children:u})]}),e.jsxs(De,{children:[e.jsxs(h,{children:[e.jsx("label",{children:"STUDENT SECTION"}),e.jsx("span",{children:i.section_name})]}),e.jsxs(h,{children:[e.jsx("label",{children:"YEAR LEVEL"}),e.jsxs("span",{children:[i.grade_level,v(i.grade_level)," Year"]})]}),e.jsxs(h,{$span:2,children:[e.jsx("label",{children:"COURSE & MAJOR"}),e.jsxs("span",{children:[i.course," ",i.major?`• ${i.major}`:""]})]}),e.jsxs(h,{children:[e.jsx("label",{children:"ACADEMIC YEAR"}),e.jsx("span",{children:"2025 - 2026"})]}),e.jsxs(h,{children:[e.jsx("label",{children:"DATE ISSUED"}),e.jsx("span",{children:new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})})]})]}),e.jsxs(Ye,{className:"no-print",children:[e.jsxs(He,{children:[e.jsx(ae,{size:20}),e.jsx("span",{children:"Assign Subjects"})]}),e.jsxs(Me,{children:[e.jsxs(Pe,{children:[e.jsx(Ue,{placeholder:"Enter Subject Code (e.g. GE 101)",value:E,onChange:q}),N.length>0&&e.jsx(Ge,{children:N.map(t=>e.jsxs(Ve,{onClick:()=>K(t),children:[e.jsx("strong",{children:t.subject_code})," - ",t.subject_name]},t.id))})]}),e.jsx(We,{onClick:Q,children:"Add Subject"}),e.jsx(Je,{onClick:X,style:{color:"#ef4444",borderColor:"#ef4444"},children:"Clear All"})]})]}),S(re,"First Semester","First Semester"),S(se,"Second Semester","Second Semester"),R.length>0&&S(R,"Other","Other Subjects"),e.jsxs(Fe,{children:[e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{className:"line"}),e.jsx("span",{children:"Registrar Signature"})]}),e.jsxs("div",{className:"sig-block",children:[e.jsx("div",{className:"line"}),e.jsx("span",{children:"Authorized Personnel"})]})]}),e.jsx($e,{children:e.jsx("p",{children:"NOT VALID WITHOUT OFFICIAL SEAL"})})]}),e.jsx("style",{children:`
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
                            box-shadow: none;
                            border: none;
                        }
                        .no-print { display: none !important; }
                        .hidden-print { display: none !important; }
                        @page { size: auto; margin: 15mm; }
                    }
                `})]}):e.jsxs(me,{children:[e.jsx(xe,{children:e.jsxs("div",{children:[e.jsxs("h2",{children:[e.jsx(F,{size:32})," Study Load Management"]}),e.jsx("p",{children:"Manage and view study loads by section"})]})}),e.jsxs(ge,{children:[e.jsx($,{active:x==="All",onClick:()=>T("All"),children:"All Levels"}),ee.map(t=>e.jsxs($,{active:x===t,onClick:()=>T(t),children:[t,v(t)," Year"]},t))]}),M?e.jsx(oe,{variant:"cards",count:4}):I.length===0?e.jsxs(ve,{children:[e.jsx(de,{size:48}),e.jsx("p",{children:"No sections found for this year level."})]}):e.jsx(he,{children:I.map(t=>e.jsxs(Y,{onClick:()=>W(t),children:[e.jsxs(ue,{children:[e.jsx(be,{children:t.section_name}),e.jsx(fe,{$assigned:t.status==="Assigned",children:t.status==="Assigned"?"Assigned":"Not Assigned"})]}),e.jsxs(je,{children:[e.jsxs(A,{children:[e.jsx(B,{size:16}),e.jsxs("span",{children:[t.course," ",t.major]})]}),e.jsxs(A,{children:[e.jsx(ce,{size:16}),e.jsxs("span",{children:[t.grade_level,v(t.grade_level)," Year"]})]}),e.jsxs(A,{children:[e.jsx(F,{size:16}),e.jsxs("span",{children:[t.subject_count," Subjects"]})]})]}),e.jsx(ye,{children:"Click to view details"})]},t.id))}),b&&e.jsx(ne,{message:b.message,type:b.type,onClose:()=>d(null)})]})},me=r.div`
  max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out;
`,xe=r.div`
  margin-bottom: 2rem;
  display: flex; align-items: center; justify-content: space-between;
  h2 { font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 12px; svg { color: var(--accent-primary); } }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`,ge=r.div`
    display: flex; gap: 10px; margin-bottom: 2rem; overflow-x: auto; padding-bottom: 5px;
`,$=r.button`
    padding: 8px 16px; border-radius: 20px; font-weight: 600; border: 1px solid var(--border-color); background: ${n=>n.active?"var(--accent-primary)":"var(--bg-secondary)"}; color: ${n=>n.active?"white":"var(--text-secondary)"}; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    &:hover { transform: translateY(-1px); }
`,he=r.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
`,Y=r.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`,ue=r.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
`,be=r.h3`
    margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);
`,fe=r.span`
    font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600;
    background: ${n=>n.$assigned?"rgba(16, 185, 129, 0.1)":"var(--bg-tertiary)"};
    color: ${n=>n.$assigned?"#10b981":"var(--text-secondary)"};
`,je=r.div`
    display: flex; flex-direction: column; gap: 0.75rem;
`,A=r.div`
    display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; svg { opacity: 0.7; }
`,ye=r.div`
    margin-top: 1.5rem; font-size: 0.8rem; color: var(--accent-primary); font-weight: 600; text-align: right; opacity: 0; transition: opacity 0.2s;
    ${Y}:hover & { opacity: 1; }
`,ve=r.div` padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-secondary); svg { opacity: 0.5; } `,Se=r.div`
    max-width: 1000px; margin: 0 auto; background: var(--bg-primary); min-height: 80vh;
`,we=r.div`
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
`,Ae=r.button`
    display: flex; align-items: center; gap: 8px; background: none; border: none; color: var(--text-secondary); font-weight: 600; cursor: pointer; font-size: 1rem;
    &:hover { color: var(--text-primary); }
`,Ce=r.div`
    background: white; 
    padding: 4rem; 
    border-radius: 12px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
    color: #1a1a1a;
    font-family: 'Inter', system-ui, sans-serif;
    border: 1px solid #eef0f2;
    position: relative;
    max-width: 900px;
    margin: 0 auto;

    @media print { 
        box-shadow: none; 
        padding: 0; 
        border: none;
        max-width: 100%;
    }
`,ke=r.div`
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 3px double #0056b3;
`,Le=r.div`
    background: #f8fafc;
    width: 90px;
    height: 90px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #e2e8f0;
`,ze=r.div`
    h1 { font-size: 2.2rem; font-weight: 900; margin: 0; color: #003366; letter-spacing: -0.5px; }
    p { font-size: 0.9rem; color: #64748b; margin: 5px 0; font-weight: 500; }
    h3 { font-size: 1.1rem; font-weight: 700; margin: 10px 0 0 0; color: #0056b3; text-transform: uppercase; letter-spacing: 2px; }
`,Te=r.div`
    text-align: center;
    margin-bottom: 3rem;
    h2 { font-size: 1.8rem; font-weight: 900; color: #1e293b; margin: 0; border-bottom: 2px solid #334155; display: inline-block; padding-bottom: 5px; }
    .semester-badge { 
        margin-top: 15px; 
        font-size: 1rem; 
        font-weight: 700; 
        color: #007bff; 
        text-transform: uppercase;
    }
`,De=r.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 4rem;
    background: #f8fafc;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
`,h=r.div`
    grid-column: span ${n=>n.$span||1};
    display: flex;
    flex-direction: column;
    gap: 5px;
    
    label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    span { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
`,Ee=r.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
`,Ne=r.h3`
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
`,_e=r.button`
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0056b3;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 86, 179, 0.2);

    &:hover { background: #004494; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 86, 179, 0.3); }
    &:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
`,Ie=r.table`
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3rem;
    
    th {
        background: #f1f5f9;
        text-align: left;
        padding: 1rem;
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
    }

    td {
        padding: 1.25rem 1rem;
        font-size: 1rem;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
    }

    .subject-title-cell {
        font-weight: 600;
        color: #0f172a;
    }
`,Oe=r.span`
    background: #f1f5f9;
    padding: 5px 10px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.9rem;
    color: #0056b3;
    border: 1px solid #e2e8f0;
`,Re=r.button`
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    transition: all 0.2s;
    &:hover { background: #fee2e2; transform: scale(1.1); }
`,Be=r.tr`
    background: #f8fafc;
    td { border-top: 2px solid #0f172a !important; border-bottom: none !important; }
`,Fe=r.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4rem;
    margin-top: 5rem;
    padding-top: 2rem;

    .sig-block {
        text-align: center;
        .line { border-bottom: 2px solid #1e293b; margin-bottom: 10px; }
        span { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: #475569; }
    }
`,$e=r.div`
    margin-top: 4rem;
    text-align: center;
    p { 
        display: inline-block;
        border: 2px dashed #cbd5e1;
        padding: 15px 30px;
        color: #94a3b8;
        font-weight: 800;
        font-size: 0.8rem;
        letter-spacing: 2px;
    }
`,Ye=r.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;
    box-shadow: var(--shadow-sm);
`,He=r.div`
    display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; color: var(--text-primary); font-weight: 700; font-size: 1.1rem;
`,Me=r.div`
    display: flex; align-items: center; gap: 10px;
`,Pe=r.div`
    flex: 1; position: relative;
`,Ue=r.input`
    width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);
`,Ge=r.div`
    position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); 
    border: 1px solid var(--border-color); border-radius: 8px; 
    margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`,Ve=r.div`
    padding: 10px 15px; cursor: pointer; color: var(--text-primary); border-bottom: 1px solid var(--border-color);
    &:hover { background: var(--bg-tertiary); }
    &:last-child { border-bottom: none; }
`,We=r.button`
    padding: 12px 20px; border-radius: 8px; border: none; background: var(--accent-primary); color: white; font-weight: 600; cursor: pointer; white-space: nowrap;
    &:hover { background: var(--accent-highlight); }
`,Je=r.button`
    padding: 12px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); font-weight: 600; cursor: pointer; white-space: nowrap;
    &:hover { background: var(--bg-tertiary); }
`;export{it as default};
