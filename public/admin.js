const $=s=>document.querySelector(s);
let csrf="";
$("#year").textContent=new Date().getFullYear();
async function getCsrf(){const r=await fetch("/api/admin/csrf");const d=await r.json();csrf=d.token;}
async function api(url,opts={}){opts.headers={...(opts.headers||{}),"x-rts-csrf":csrf};return fetch(url,opts);}
function showDashboard(){ $("#login-panel").hidden=true;$("#dashboard").hidden=false;loadDocs();}
function showLogin(){ $("#login-panel").hidden=false;$("#dashboard").hidden=true;}
async function check(){await getCsrf();const r=await fetch("/api/admin/me");const d=await r.json();d.authenticated?showDashboard():showLogin();}
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();$("#login-error").textContent="";const f=new FormData(e.target);try{const r=await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:f.get("username"),password:f.get("password")})});const d=await r.json();if(!r.ok)throw Error(d.error);csrf=d.csrfToken;e.target.reset();showDashboard();}catch(err){$("#login-error").textContent=err.message;}});
async function loadDocs(){const r=await fetch("/api/documents");const docs=await r.json();const el=$("#admin-documents");if(!docs.length){el.innerHTML='<div class="empty-state">No documents uploaded yet.</div>';return;}el.innerHTML=docs.map(d=>`<div class="admin-doc-row"><div><strong>${esc(d.title)}</strong><small>${esc(d.originalName)} · ${size(d.size)}</small></div><button class="delete-btn" data-id="${d.id}">Delete</button></div>`).join("");el.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>removeDoc(b.dataset.id,b)));}
async function removeDoc(id,btn){if(!confirm("Delete this public document? This cannot be undone."))return;const r=await api("/api/admin/documents/"+id,{method:"DELETE"});const d=await r.json();if(!r.ok){alert(d.error);return;}loadDocs();}
$("#upload-form").addEventListener("submit",async e=>{e.preventDefault();const msg=$("#upload-message");msg.textContent="Uploading…";try{const r=await api("/api/admin/documents",{method:"POST",body:new FormData(e.target)});const d=await r.json();if(!r.ok)throw Error(d.error);msg.textContent="Document uploaded and published.";e.target.reset();loadDocs();}catch(err){msg.textContent=err.message;}});
$("#logout").addEventListener("click",async()=>{await api("/api/admin/logout",{method:"POST"});await getCsrf();showLogin();});
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function size(n){return n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(1)+" MB";}
check().catch(()=>showLogin());
