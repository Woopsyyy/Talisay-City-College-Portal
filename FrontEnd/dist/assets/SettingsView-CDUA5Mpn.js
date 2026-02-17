import{r as g,u as L,j as e,i as F,d as a,A as G}from"./index-G8dAaOpg.js";import{C as w}from"./circle-check-big-BkBU9BDV.js";import{T as B}from"./triangle-alert-DHUh_5GK.js";import{C as k,M as D,L as C}from"./mail-DGXc6b4k.js";import{U as h}from"./user-DNE8y8gH.js";import{S as E}from"./UnifiedRoleSwitcher-DzaCjurU.js";import{S as M}from"./save-ozLe3sfg.js";const ne=({currentUser:r})=>{const[b,y]=g.useState(!1),[x,n]=g.useState(null),[P,j]=g.useState("images/sample.jpg"),{checkAuth:S}=L(),[o,d]=g.useState({username:"",full_name:"",gender:"",password:"",confirmPassword:""});g.useEffect(()=>{r&&(d(s=>({...s,username:r.username||"",full_name:r.full_name||"",gender:(r.gender||"").toLowerCase()})),(async()=>{let s="images/sample.jpg";r.avatar_url?s=r.avatar_url:r.image_path&&(s=await F(r.id,r.image_path)),j(s)})())},[r]);const I=t=>{const s=t.target.files[0];if(s){const l=new FileReader;l.onload=i=>j(i.target.result),l.readAsDataURL(s)}},A=async t=>{if(t.preventDefault(),n(null),o.password||o.confirmPassword){if(o.password!==o.confirmPassword){n({type:"danger",text:"Passwords do not match"});return}if(o.password.length<8){n({type:"danger",text:"Password must be at least 8 characters"});return}}y(!0);const s=new FormData;s.append("username",o.username),s.append("full_name",o.full_name),o.gender&&s.append("gender",o.gender),o.password&&s.append("password",o.password);const l=document.getElementById("profileImageInput");l&&l.files[0]&&s.append("profile_image",l.files[0]);try{const i=await G.updateProfile(s);i.success?(await S(),n({type:"success",text:"Profile updated successfully!"})):n({type:"danger",text:i.error||"Failed to update profile"})}catch(i){console.error("Profile update error:",i),n({type:"danger",text:i.message||"An error occurred"})}finally{y(!1)}},_=()=>{n({type:"danger",text:"Google account linking is disabled in Supabase-only mode."})};return e.jsxs(q,{children:[e.jsxs(N,{children:[e.jsx("h2",{children:"Account Settings"}),e.jsx("p",{children:"Manage your profile information and security"})]}),x&&e.jsxs(R,{$type:x.type,children:[x.type==="success"?e.jsx(w,{size:20}):e.jsx(B,{size:20}),x.text]}),e.jsxs(T,{onSubmit:A,children:[e.jsxs(H,{children:[e.jsxs(W,{children:[e.jsxs(f,{children:[e.jsx(k,{size:20}),e.jsx("h3",{children:"Profile Picture"})]}),e.jsxs(v,{$center:!0,children:[e.jsxs(O,{onClick:()=>document.getElementById("profileImageInput").click(),children:[e.jsx(Q,{src:P,onError:t=>t.target.src="images/sample.jpg"}),e.jsx(V,{children:e.jsx(k,{size:24})})]}),e.jsx("input",{type:"file",id:"profileImageInput",accept:"image/*",onChange:I,hidden:!0}),e.jsx("p",{className:"hint",children:"Click to upload a new photo"}),e.jsx(z,{type:"button",$secondary:!0,onClick:()=>document.getElementById("profileImageInput").click(),children:"Choose Image"})]})]}),e.jsxs(Y,{children:[e.jsxs($,{children:[e.jsxs(f,{children:[e.jsx(h,{size:20}),e.jsx("h3",{children:"Personal Information"})]}),e.jsxs(v,{children:[e.jsxs(c,{children:[e.jsx(p,{children:"Full Name"}),e.jsxs(m,{children:[e.jsx(h,{size:18}),e.jsx(u,{type:"text",value:o.full_name,onChange:t=>d({...o,full_name:t.target.value}),required:!0})]})]}),e.jsxs(c,{children:[e.jsx(p,{children:"Username"}),e.jsxs(m,{children:[e.jsx(h,{size:18}),e.jsx(u,{type:"text",value:o.username,onChange:t=>d({...o,username:t.target.value}),required:!0})]})]}),e.jsxs(c,{children:[e.jsx(p,{children:"Gender"}),e.jsxs(J,{value:o.gender,onChange:t=>d({...o,gender:t.target.value}),children:[e.jsx("option",{value:"",children:"Select"}),e.jsx("option",{value:"male",children:"Male"}),e.jsx("option",{value:"female",children:"Female"}),e.jsx("option",{value:"lgbtq+",children:"LGBTQ+"})]})]})]})]}),e.jsxs($,{children:[e.jsxs(f,{children:[e.jsx(E,{size:20}),e.jsx("h3",{children:"Security"})]}),e.jsxs(v,{children:[e.jsxs(c,{children:[e.jsx(p,{children:"Google Account"}),e.jsxs(X,{type:"button",onClick:_,$linked:r?.google_linked,children:[e.jsx(D,{size:18}),r?.google_linked?"Connected to Google":"Connect Google Account",r?.google_linked&&e.jsx(w,{size:16})]})]}),e.jsx(K,{}),e.jsxs(c,{children:[e.jsx(p,{children:"New Password"}),e.jsxs(m,{children:[e.jsx(C,{size:18}),e.jsx(u,{type:"password",placeholder:"Leave blank to keep current",value:o.password,onChange:t=>d({...o,password:t.target.value})})]})]}),e.jsxs(c,{children:[e.jsx(p,{children:"Confirm Password"}),e.jsxs(m,{children:[e.jsx(C,{size:18}),e.jsx(u,{type:"password",placeholder:"Confirm new password",value:o.confirmPassword,onChange:t=>d({...o,confirmPassword:t.target.value})})]})]})]})]})]})]}),e.jsx(Z,{children:e.jsxs(z,{type:"submit",disabled:b,children:[e.jsx(M,{size:18})," ",b?"Saving Changes...":"Save Changes"]})})]})]})},q=a.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1000px;
  margin: 0 auto;
`,N=a.div`
  margin-bottom: 2rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`,R=a.div`
  background: ${r=>r.$type==="success"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)"};
  border: 1px solid ${r=>r.$type==="success"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"};
  color: ${r=>r.$type==="success"?"#16a34a":"#ef4444"};
  padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;
  display: flex; align-items: center; gap: 10px; font-weight: 500;
`,T=a.form`
  display: flex; flex-direction: column; gap: 2rem;
`,H=a.div`
  display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`,W=a.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; height: fit-content;
`,Y=a.div`
  display: flex; flex-direction: column; gap: 1.5rem;
`,$=a.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`,f=a.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`,v=a.div`
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1.5rem;
  ${r=>r.$center&&"align-items: center; text-align: center;"}
  .hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }
`,O=a.div`
  width: 120px; height: 120px; border-radius: 50%; position: relative; cursor: pointer; border: 3px solid var(--bg-tertiary);
  &:hover div { opacity: 1; }
`,Q=a.img`
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
`,V=a.div`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s; color: white;
`,c=a.div`
  display: flex; flex-direction: column; gap: 8px;
`,p=a.label`
  font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);
`,m=a.div`
  position: relative;
  svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none; }
`,u=a.input`
  width: 100%; padding: 10px 12px 10px 40px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-size: 0.95rem;
  &:focus { outline: none; border-color: var(--accent-primary); ring: 2px solid var(--accent-primary); }
`,J=a.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  &:focus { outline: none; border-color: var(--accent-primary); }
`,K=a.div`
  height: 1px; background: var(--border-color); margin: 0.5rem 0;
`,X=a.button`
  display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px;
  background: ${r=>r.$linked?"var(--bg-tertiary)":"white"};
  color: ${r=>r.$linked?"var(--text-primary)":"#333"};
  border: 1px solid var(--border-color); border-radius: 8px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--bg-tertiary); }
`,Z=a.div`
  display: flex; justify-content: flex-end;
`,z=a.button`
  padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s;
  background: ${r=>r.$secondary?"transparent":"var(--accent-primary)"};
  color: ${r=>r.$secondary?"var(--text-secondary)":"white"};
  border: ${r=>r.$secondary?"1px solid var(--border-color)":"none"};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${r=>r.$secondary?"var(--bg-tertiary)":"var(--accent-highlight)"};
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;export{ne as default};
