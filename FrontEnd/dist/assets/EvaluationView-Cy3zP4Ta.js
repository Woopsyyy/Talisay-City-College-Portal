import{c as Z,g as X,r as l,j as e,P as ee,h as te,S as h,d as t}from"./index-G8dAaOpg.js";import{C as I}from"./Home-DVUrccTW.js";import{T as re}from"./triangle-alert-DHUh_5GK.js";import{I as D}from"./info-JkjM17ht.js";import{A as ae}from"./arrow-left-DhUokZpI.js";import{C as O}from"./circle-check-big-BkBU9BDV.js";import{U as R}from"./user-DNE8y8gH.js";import{S as ie}from"./star-CLif_3to.js";import{C as se}from"./clock-DTlNUsPA.js";import"./UnifiedRoleSwitcher-DzaCjurU.js";import"./settings-DNNACGN9.js";import"./megaphone-fcxJ3P3Z.js";import"./award-C-798qRU.js";const ne=[["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",key:"emmmcr"}],["path",{d:"M7 10v12",key:"1qc93n"}]],oe=Z("thumbs-up",ne),Qe=()=>{const[s,v]=X(),[M,j]=l.useState(!0),[U,V]=l.useState(!0),[S,z]=l.useState(null),[C,Y]=l.useState([]),[d,Q]=l.useState(null),[Ae,W]=l.useState(null),[A,N]=l.useState(!1),[p,E]=l.useState(null),[o,k]=l.useState(!1),m=s.get("teacher_id"),f=s.get("teacher_name"),L=s.get("subject");l.useEffect(()=>{(async()=>{j(!0);try{const n=await h.getEvaluationSettings().catch(()=>({enabled:!0}));if(n.enabled===!1){V(!1),j(!1);return}Q(n.template);const a=await h.getAssignment().catch(()=>null);let i=null;if(Array.isArray(a)&&a.length>0?a[0].section?i=a[0].section:a[0].section_name&&(i=a[0].section_name):a&&(a.section?i=a.section:a.section_name&&(i=a.section_name)),!i){z(null),j(!1);return}if(z(i),m){const c=await h.getEvaluation(m).catch(()=>null);c&&c.success?(E(c.data),k(!0)):(E(null),k(!1))}else{E(null),k(!1);const c=await h.getEvaluationTeachers().catch(()=>({teachers:[]}));Y(Array.isArray(c.teachers)?c.teachers:[])}}catch(n){console.error("Evaluation init error:",n),W(n.message)}finally{j(!1)}})()},[m]);const q=l.useMemo(()=>[{label:"O (4) Outstanding",value:4},{label:"VS (3) Very Satisfactory",value:3},{label:"S (2) Satisfactory",value:2},{label:"NI (1) Needs Improvement",value:1}],[]),H=l.useMemo(()=>[{id:"part1",title:"PART I: My Teacher",questions:["Knows his/her subject matter well and organizes presentation of subject matter with clarity and coherence","Is proficient in English/Filipino/Japanese","Employs appropriate teaching methods/strategies whether in-person or online","Makes good use of visual aids/instructional materials","Manages the class well and commands respect","Utilizes class period productively","Engages us with questions to deepen our understanding","Gives subject requirements that are relevant","Gives learning tasks that are well-paced","Behaves professionally"]},{id:"part2",title:"PART II: As a Student",questions:["With my teacher's guidance, I can demonstrate the intended knowledge and skills.","With my teacher's guidance, I can connect theory and practical knowledge.","I have improved my problem-solving skills.","I am happy that he/she is my teacher.","I can feel the teacher's concern.","I look up to my teacher as a role model.","I like to be in his/her class again.","I notice that my teacher extends help to struggling students."]}],[]),J=async r=>{r.preventDefault(),N(!0);const n=new FormData(r.target),a=Object.fromEntries(n.entries());try{const i=await h.submitEvaluation(a);i.success?v({view:"evaluation"}):alert("Error: "+(i.message||"Failed to submit evaluation"))}catch(i){console.error("Submit error:",i),alert("An error occurred while submitting. Please try again.")}finally{N(!1)}};return M?e.jsx(ee,{variant:"form"}):U?S?m&&f?e.jsxs(y,{children:[e.jsxs(w,{children:[e.jsxs(le,{onClick:()=>v({view:"evaluation"}),children:[e.jsx(ae,{size:20})," Back"]}),e.jsx("h2",{children:o?"View Evaluation":d?.title||"Evaluation Form"}),e.jsx("p",{children:o?`Reviewing evaluation for ${f}`:d?.subtitle||`Evaluate ${f} - ${L}`})]}),o&&e.jsxs(ce,{children:[e.jsx(O,{size:20}),e.jsxs("div",{children:[e.jsx("strong",{children:"Evaluation Submitted"}),e.jsx("p",{children:"You have already evaluated this teacher. Below is your submitted response."})]})]}),e.jsxs(de,{onSubmit:J,children:[e.jsx("input",{type:"hidden",name:"teacher_id",value:m}),e.jsx("input",{type:"hidden",name:"teacher_name",value:f}),e.jsx("input",{type:"hidden",name:"subject",value:L||""}),e.jsx("input",{type:"hidden",name:"student_section",value:S}),e.jsxs(b,{children:[e.jsxs(u,{children:[e.jsx(R,{size:20}),e.jsx("h3",{children:"Student Information"})]}),e.jsx(x,{children:e.jsxs("div",{className:"row g-3",children:[e.jsxs("div",{className:"col-md-6",children:[e.jsx(g,{children:"STATUS *"}),e.jsxs(F,{name:"student_status",required:!0,disabled:o,defaultValue:p?.student_status||"",children:[e.jsx("option",{value:"",children:"Select Status"}),e.jsx("option",{value:"REGULAR",children:"REGULAR"}),e.jsx("option",{value:"IRREGULAR",children:"IRREGULAR"})]})]}),e.jsxs("div",{className:"col-md-6",children:[e.jsx(g,{children:"GENDER *"}),e.jsxs(F,{name:"student_gender",required:!0,disabled:o,defaultValue:p?.student_gender||"",children:[e.jsx("option",{value:"",children:"Select Gender"}),e.jsx("option",{value:"Female",children:"Female"}),e.jsx("option",{value:"Male",children:"Male"}),e.jsx("option",{value:"LGBTQIA++",children:"LGBTQIA++"}),e.jsx("option",{value:"Prefer not to say",children:"Prefer not to say"})]})]})]})})]}),e.jsxs(pe,{children:[e.jsxs(u,{children:[e.jsx(D,{size:20}),e.jsx("h3",{children:"Evaluation Information"})]}),e.jsxs(x,{children:[d?.description?d.description.split(`
`).map((r,n)=>e.jsx("p",{className:n===0?"highlight":"",children:r},n)):e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"highlight",children:e.jsx("strong",{children:"This Evaluation Form will be part of your REQUIREMENTS for CLEARANCE."})}),e.jsxs("p",{children:[e.jsx("strong",{children:"Directions:"})," Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating:"]})]}),e.jsx(me,{children:(d?.scale||q).map((r,n)=>e.jsx(he,{children:r.label},n))})]})]}),(d?.sections||H).map(r=>e.jsxs(b,{children:[e.jsxs(u,{children:[r.id==="part1"?e.jsx(R,{size:20}):e.jsx(ie,{size:20}),e.jsx("h3",{children:r.title})]}),e.jsx(x,{children:r.questions.map((n,a)=>e.jsxs(ue,{children:[e.jsxs(xe,{children:[e.jsxs("span",{className:"num",children:[a+1,"."]}),n]}),e.jsx(ge,{children:(d?.scale||q).map(i=>{const c=typeof i=="object"?i.value:i,K=typeof i=="object"?i.label.split("(")[0].trim():i,B=`${r.id}_q${a+1}`;return e.jsxs(T,{children:[e.jsx("input",{type:"radio",name:B,value:c,required:!0,disabled:o,defaultChecked:Number(p?.ratings?.[B])===c}),e.jsxs("span",{children:[K," (",c,")"]})]},c)})})]},a))})]},r.id)),e.jsxs(b,{children:[e.jsxs(u,{children:[e.jsx(oe,{size:20}),e.jsx("h3",{children:"Overall Satisfaction"})]}),e.jsxs(x,{children:[e.jsxs(_,{children:[e.jsx(g,{children:d?.satisfaction_question||"In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences?"}),e.jsxs(be,{children:[e.jsxs(ve,{children:[e.jsx("span",{children:"NOT SATISFIED (1)"}),e.jsx("span",{children:"VERY SATISFIED (10)"})]}),e.jsx(je,{children:Array.from({length:10},(r,n)=>n+1).map(r=>e.jsxs(fe,{children:[e.jsx("input",{type:"radio",name:"satisfaction_rating",value:r,required:!0,disabled:o,defaultChecked:Number(p?.ratings?.satisfaction_rating)===r}),e.jsx("div",{className:"box",children:r})]},r))})]})]}),e.jsxs(_,{children:[e.jsx(g,{children:d?.recommend_question||"Will you recommend the subject/s under the present teacher?"}),e.jsxs(ye,{children:[e.jsxs(T,{children:[e.jsx("input",{type:"radio",name:"recommend_teacher",value:"YES",required:!0,disabled:o,defaultChecked:p?.ratings?.recommend_teacher==="YES"}),e.jsx("span",{children:"YES"})]}),e.jsxs(T,{children:[e.jsx("input",{type:"radio",name:"recommend_teacher",value:"NO",required:!0,disabled:o,defaultChecked:p?.ratings?.recommend_teacher==="NO"}),e.jsx("span",{children:"NO"})]})]})]}),e.jsxs(_,{children:[e.jsx(g,{htmlFor:"comments",children:d?.comments_label||"COMMENTS"}),e.jsx(we,{id:"comments",name:"comments",rows:"5",placeholder:"Enter your comments here...",disabled:o,defaultValue:p?.comments||""})]})]})]}),e.jsxs(Se,{children:[e.jsx($,{type:"button",$secondary:!0,onClick:()=>v({view:"evaluation"}),children:o?"Back to List":"Cancel"}),!o&&e.jsxs($,{type:"submit",disabled:A,children:[A?"Submitting...":"Submit Evaluation"," ",e.jsx(te,{size:18})]})]})]})]}):e.jsxs(y,{children:[e.jsxs(w,{children:[e.jsxs("h2",{children:[e.jsx(I,{size:28})," Teacher Evaluation"]}),e.jsx("p",{children:"Select a teacher to evaluate"})]}),e.jsxs(b,{children:[e.jsxs(u,{children:[e.jsx(R,{size:20}),e.jsxs("h3",{children:["Teachers in Section: ",S]})]}),e.jsx(x,{children:C.length===0?e.jsx(Ce,{children:"No teachers found for your section."}):e.jsx(Ee,{children:C.map(r=>{const n=r.image_path?r.image_path.startsWith("http")?r.image_path:`/TCC/public/${r.image_path.replace(/^\//,"")}`:"/images/sample.jpg";return e.jsxs(ke,{children:[e.jsx(Ie,{children:e.jsx(Re,{src:n,onError:a=>{a.target.src="/images/sample.jpg"},alt:r.name})}),e.jsxs(Te,{children:[e.jsx("h4",{children:r.name}),e.jsxs($e,{children:[e.jsx("strong",{children:"Subjects:"}),e.jsx("ul",{children:(r.subjects||[]).map((a,i)=>e.jsx("li",{title:typeof a=="object"?`${a.code} - ${a.title}`:a,children:typeof a=="object"?`${a.code} - ${a.title}`:a},i))})]})]}),e.jsx(_e,{}),e.jsx(ze,{children:r.evaluated?e.jsxs(G,{$success:!0,children:[e.jsx(O,{size:18})," Done"]}):e.jsxs(G,{$pending:!0,children:[e.jsx(se,{size:16})," Pending"]})}),e.jsx($,{onClick:()=>v({view:"evaluation",teacher_id:r.id,teacher_name:r.name,subject:(r.subjects||[]).map(a=>typeof a=="object"?a.title:a).join(", ")}),$secondary:r.evaluated,style:{width:"100%",justifyContent:"center",marginTop:"auto"},children:r.evaluated?"View Evaluation":"Evaluate Teacher"})]},r.id)})})})]})]}):e.jsxs(y,{children:[e.jsxs(w,{children:[e.jsxs("h2",{children:[e.jsx(I,{size:28})," Teacher Evaluation"]}),e.jsx("p",{children:"Select a teacher to evaluate"})]}),e.jsxs(P,{$type:"info",children:[e.jsx(D,{size:24}),e.jsxs("div",{children:[e.jsx("h4",{children:"No Section Information"}),e.jsx("p",{children:"Your section information is not available. Please contact the administrator."})]})]})]}):e.jsxs(y,{children:[e.jsxs(w,{children:[e.jsxs("h2",{children:[e.jsx(I,{size:28})," Teacher Evaluation"]}),e.jsx("p",{children:"Select a teacher to evaluate"})]}),e.jsxs(P,{$type:"warning",children:[e.jsx(re,{size:24}),e.jsxs("div",{children:[e.jsx("h4",{children:"Evaluations Disabled"}),e.jsx("p",{children:"Teacher evaluations are currently disabled by the administrator."})]})]})]})},y=t.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 900px;
  margin: 0 auto;
`,w=t.div`
  margin-bottom: 2rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 12px; margin: 0; }
  p { color: var(--text-secondary); font-size: 1.1rem; margin: 0; }
`,le=t.button`
  background: transparent; border: none; color: var(--accent-primary);
  display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;
  margin-bottom: 0.5rem; padding: 0;
  &:hover { text-decoration: underline; }
`,ce=t.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #059669;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  
  strong { display: block; margin-bottom: 2px; }
  p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
`,P=t.div`
  background: ${s=>s.$type==="warning"?"rgba(234,179,8,0.1)":"rgba(59,130,246,0.1)"};
  border: 1px solid ${s=>s.$type==="warning"?"rgba(234,179,8,0.3)":"rgba(59,130,246,0.3)"};
  padding: 1.5rem; border-radius: 12px; display: flex; gap: 1rem; align-items: flex-start;
  color: ${s=>s.$type==="warning"?"#ca8a04":"#2563eb"};
  h4 { margin: 0 0 4px 0; font-weight: 700; color: inherit; }
  p { margin: 0; opacity: 0.9; color: inherit; }
`,de=t.form`
  display: flex; flex-direction: column; gap: 2rem;
`,b=t.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`,pe=t(b)`
  border-left: 4px solid var(--accent-primary);
  .highlight { color: var(--text-primary); margin-bottom: 1rem; }
`,u=t.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`,x=t.div`
  padding: 1.5rem;
`,me=t.div`
  display: flex; flex-wrap: wrap; gap: 1rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-top: 1rem;
`,he=t.div`
  font-size: 0.9rem; color: var(--text-secondary);
  strong { color: var(--text-primary); margin-right: 4px; }
`,ue=t.div`
  padding: 1.5rem 0; border-bottom: 1px solid var(--border-color);
  &:last-child { border-bottom: none; }
`,xe=t.p`
  margin: 0 0 1rem 0; font-weight: 500; color: var(--text-primary);
  .num { font-weight: 700; opacity: 0.7; margin-right: 8px; }
`,ge=t.div`
  display: flex; flex-wrap: wrap; gap: 1.5rem;
`,T=t.label`
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  input { accent-color: var(--accent-primary); width: 18px; height: 18px; }
  span { font-size: 0.95rem; color: var(--text-secondary); }
  &:hover span { color: var(--text-primary); }
`,_=t.div`
  margin-bottom: 2rem;
  &:last-child { margin-bottom: 0; }
`,g=t.label`
  display: block; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);
`,be=t.div`
  background: var(--bg-primary); padding: 1.5rem; border-radius: 12px;
`,ve=t.div`
  display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;
`,je=t.div`
  display: flex; justify-content: space-between; gap: 4px; overflow-x: auto;
`,fe=t.label`
  cursor: pointer; position: relative;
  input { position: absolute; opacity: 0; }
  .box { 
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; 
    border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); font-weight: 600;
    transition: all 0.2s;
  }
  input:checked + .box { background: var(--accent-primary); color: white; border-color: var(--accent-primary); transform: scale(1.1); }
`,ye=t.div`
  display: flex; gap: 2rem;
`,F=t.select`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-family: inherit;
  &:focus { outline: none; border-color: var(--accent-primary); }
`,we=t.textarea`
  width: 100%; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-family: inherit; resize: vertical;
  &:focus { outline: none; border-color: var(--accent-primary); ring: 2px solid var(--accent-primary); }
`,Se=t.div`
  display: flex; gap: 1rem; justify-content: flex-end;
`,$=t.button`
  padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s;
  background: ${s=>s.$secondary?"transparent":"var(--accent-primary)"};
  color: ${s=>s.$secondary?"var(--text-secondary)":"white"};
  border: ${s=>s.$secondary?"1px solid var(--border-color)":"none"};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${s=>s.$secondary?"var(--bg-tertiary)":"var(--accent-highlight)"};
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`,Ee=t.div`
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`,ke=t.div`
  background: var(--bg-primary); 
  border: 1px solid var(--border-color); 
  border-radius: 12px; 
  padding: 1.5rem;
  display: flex; 
  flex-direction: column; 
  gap: 1rem; 
  transition: all 0.2s; 
  align-items: center; 
  text-align: center;
  height: 100%;
  &:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
`,Ie=t.div`
  width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid var(--bg-tertiary);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 0.5rem;
`,Re=t.img`
  width: 100%; height: 100%; object-fit: cover;
`,Te=t.div`
  width: 100%;
  h4 { margin: 0 0 0.5rem 0; font-size: 1.15rem; color: var(--text-primary); font-weight: 700; }
`,_e=t.div`
  height: 1px; width: 100%; background: var(--border-color); opacity: 0.5;
`,$e=t.div`
  font-size: 0.85rem; color: var(--text-secondary);
  strong { display: block; margin-bottom: 4px; color: var(--text-primary); }
  ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
  li { 
      background: var(--bg-tertiary); 
      padding: 4px 8px; 
      border-radius: 4px; 
      border: 1px solid var(--border-color);
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }
`,ze=t.div`
  display: flex; justify-content: center; width: 100%;
`,G=t.span`
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600;
  color: ${s=>s.$success?"#16a34a":"#ea580c"};
`,Ce=t.p`
  text-align: center; color: var(--text-secondary); padding: 2rem;
`;export{Qe as default};
