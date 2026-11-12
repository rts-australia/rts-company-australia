const docsEl = document.getElementById("documents");
const searchEl = document.getElementById("search");
let allDocs = [];
document.getElementById("year").textContent = new Date().getFullYear();
function fmtSize(bytes){if(bytes<1024)return bytes+" B";if(bytes<1048576)return (bytes/1024).toFixed(1)+" KB";return (bytes/1048576).toFixed(1)+" MB";}
function renderDocs(){
  const q=searchEl.value.trim().toLowerCase();
  const docs=allDocs.filter(d=>d.title.toLowerCase().includes(q)||d.originalName.toLowerCase().includes(q));
  document.getElementById("doc-count").textContent=allDocs.length;
  if(!docs.length){docsEl.innerHTML=`<div class="empty-state">${allDocs.length?"No documents match your search.":"No documents have been published yet."}</div>`;return;}
  docsEl.innerHTML=docs.map(d=>`<article class="doc-card"><div class="file-icon">▤</div><div class="doc-info"><h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.originalName)} · ${fmtSize(d.size)}</p><a class="view-link" href="/api/documents/${d.id}/file" target="_blank" rel="noopener">View document ↗</a></div></article>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
searchEl.addEventListener("input",renderDocs);
fetch("/api/documents").then(r=>r.json()).then(d=>{allDocs=d;renderDocs();}).catch(()=>{docsEl.innerHTML='<div class="empty-state">Unable to load documents. Please refresh the page.</div>';});
