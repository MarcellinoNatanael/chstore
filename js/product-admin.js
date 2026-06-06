/* ============================================================
   CHStore — product-admin.js  (Inventori)
   ============================================================ */
'use strict';

const PAGE_SIZE = 15;
let allProducts = [], filtered = [], currentPage = 1;

function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(p) { return typeof formatRupiah==='function'?formatRupiah(p):'Rp\u00A0'+Number(p).toLocaleString('id-ID'); }
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); }

function showToast(msg, type='default', ms=3000) {
  const box=document.getElementById('toastContainer'); if(!box) return;
  const t=document.createElement('div'); t.className='toast '+type; t.textContent=msg;
  box.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),320);},ms);
}

/* ── Auth ───────────────────────────────────────────────────── */
async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) { window.location.href='login-admin.html'; return false; }
  let role=null;
  try {
    const {data}=await supabaseClient.from('profiles').select('role,full_name,username').eq('id',session.user.id).maybeSingle();
    role=data?.role;
    if(role==='admin'){
      const name=data.full_name||data.username||'Admin';
      const n=document.getElementById('sidebarName'), a=document.getElementById('sidebarAvatar');
      if(n) n.textContent=name; if(a) a.textContent=name.charAt(0).toUpperCase();
    }
  } catch(_){}
  if(!role) role=session.user.user_metadata?.role;
  if(role!=='admin'){ await supabaseClient.auth.signOut(); window.location.href='login-admin.html'; return false; }
  return true;
}

/* ── Sidebar ────────────────────────────────────────────────── */
function initSidebar() {
  const t=document.getElementById('sidebarToggle'), s=document.getElementById('sidebar');
  if(!t||!s) return;
  t.addEventListener('click',()=>s.classList.toggle('open'));
  document.addEventListener('click',e=>{ if(s.classList.contains('open')&&!s.contains(e.target)&&!t.contains(e.target)) s.classList.remove('open'); });
}

/* ── Load ───────────────────────────────────────────────────── */
async function loadCategories() {
  const {data}=await supabaseClient.from('categories').select('id,name,slug').order('name');
  const sel=document.getElementById('filterCategory');
  (data||[]).forEach(c=>{ const o=document.createElement('option'); o.value=c.slug; o.textContent=c.name; sel.appendChild(o); });
  return data||[];
}

async function loadProducts() {
  const {data,error}=await supabaseClient
    .from('products')
    .select('id,name,price,stock,is_active,condition,created_at,category_id,product_images(image_url,is_primary),categories(name,slug)')
    .order('created_at',{ascending:false});
  if(error){ showToast('Gagal memuat: '+error.message,'error'); return; }
  allProducts=data||[];
  document.getElementById('productCountLine').textContent=`${allProducts.length} produk terdaftar`;
}

/* ── Filter ─────────────────────────────────────────────────── */
function initFilters() {
  const deb=(fn,d=300)=>{ let t; return(...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),d); }; };
  document.getElementById('searchInput').addEventListener('input', deb(applyFilters));
  ['filterCategory','filterStatus','filterStock'].forEach(id=>document.getElementById(id).addEventListener('change',applyFilters));
}

function applyFilters() {
  const search=document.getElementById('searchInput').value.toLowerCase().trim();
  const cat=document.getElementById('filterCategory').value;
  const status=document.getElementById('filterStatus').value;
  const stock=document.getElementById('filterStock').value;

  filtered=allProducts.filter(p=>{
    if(search && !p.name.toLowerCase().includes(search)) return false;
    if(cat && p.categories?.slug!==cat) return false;
    if(status==='active' && !p.is_active) return false;
    if(status==='inactive' && p.is_active) return false;
    if(stock==='low' && !(p.stock>0&&p.stock<5)) return false;
    if(stock==='empty' && p.stock!==0) return false;
    return true;
  });
  currentPage=1;
  renderTable();
  renderPagination();
}

/* ── Render ─────────────────────────────────────────────────── */
function renderTable() {
  const tbody=document.getElementById('productsTableBody');
  const start=(currentPage-1)*PAGE_SIZE;
  const page=filtered.slice(start,start+PAGE_SIZE);

  if(!page.length){
    tbody.innerHTML=`<tr><td colspan="6"><div class="table-empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      <p>Tidak ada produk ditemukan</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML=page.map(p=>{
    const img=p.product_images?.find(i=>i.is_primary)?.image_url||p.product_images?.[0]?.image_url||'';
    const stockBadge=p.stock===0
      ? `<span class="badge badge-danger">Habis</span>`
      : p.stock<5
        ? `<span class="badge badge-warn">${p.stock} unit</span>`
        : `<span style="font-weight:700;color:#22C55E">${p.stock}</span>`;
    return `<tr>
      <td>
        <div class="product-cell">
          ${img
            ? `<img src="${escHtml(img)}" alt="" class="product-thumb" onerror="this.style.display='none'">`
            : `<div class="product-thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
          <div>
            <div class="product-name-cell">${escHtml(p.name)}</div>
            <div class="product-date-cell">${fmtDate(p.created_at)}</div>
          </div>
        </div>
      </td>
      <td>${p.categories?.name?`<span class="badge badge-info">${escHtml(p.categories.name)}</span>`:'<span style="color:var(--g400)">—</span>'}</td>
      <td style="font-weight:700">${fmt(p.price)}</td>
      <td>${stockBadge}</td>
      <td>${p.is_active?'<span class="badge badge-success">Aktif</span>':'<span class="badge badge-gray">Nonaktif</span>'}</td>
      <td>
        <div class="table-actions">
          <a href="add-product.html?edit=${p.id}" class="btn-edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </a>
          <button class="btn-icon-sm" onclick="toggleActive('${p.id}',${p.is_active})" title="${p.is_active?'Nonaktifkan':'Aktifkan'}">
            ${p.is_active
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
              : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`}
          </button>
          <button class="btn-icon-sm danger" onclick="confirmDelete('${p.id}','${escHtml(p.name)}')" title="Hapus">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const total=filtered.length, pages=Math.ceil(total/PAGE_SIZE);
  const start=(currentPage-1)*PAGE_SIZE+1, end=Math.min(currentPage*PAGE_SIZE,total);
  document.getElementById('paginationInfo').textContent=total?`${start}–${end} dari ${total} produk`:'Tidak ada produk';
  const btns=document.getElementById('paginationBtns');
  if(pages<=1){ btns.innerHTML=''; return; }
  let html=`<button class="btn-page" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for(let i=1;i<=pages;i++){
    if(pages>7&&i>2&&i<pages-1&&Math.abs(i-currentPage)>1){ if(i===3||i===pages-2) html+='<span style="padding:0 4px;color:var(--g400)">…</span>'; continue; }
    html+=`<button class="btn-page ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html+=`<button class="btn-page" onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''}>›</button>`;
  btns.innerHTML=html;
}

function goPage(n){ const p=Math.ceil(filtered.length/PAGE_SIZE); if(n<1||n>p) return; currentPage=n; renderTable(); renderPagination(); window.scrollTo({top:0,behavior:'smooth'}); }

/* ── Actions ────────────────────────────────────────────────── */
async function toggleActive(id, cur) {
  const {error}=await supabaseClient.from('products').update({is_active:!cur}).eq('id',id);
  if(error){ showToast('Gagal mengubah status','error'); return; }
  const idx=allProducts.findIndex(p=>p.id===id);
  if(idx!==-1) allProducts[idx].is_active=!cur;
  showToast(cur?'Produk dinonaktifkan':'Produk diaktifkan','success');
  applyFilters();
}

function confirmDelete(id, name) {
  const modal=document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent='Hapus Produk';
  document.getElementById('confirmMessage').textContent=`Yakin ingin menghapus "${name}"? Tindakan tidak dapat dibatalkan.`;
  modal.style.display='flex';
  document.getElementById('cancelBtn').onclick=()=>modal.style.display='none';
  document.getElementById('confirmBtn').onclick=async()=>{
    modal.style.display='none';
    const {error}=await supabaseClient.from('products').delete().eq('id',id);
    if(error){ showToast('Gagal menghapus: '+error.message,'error'); return; }
    allProducts=allProducts.filter(p=>p.id!==id);
    showToast('Produk berhasil dihapus','success');
    applyFilters();
  };
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async()=>{
  const ok=await requireAdmin(); if(!ok) return;
  initSidebar();
  document.getElementById('logoutBtn')?.addEventListener('click',async()=>{ await supabaseClient.auth.signOut(); window.location.href='login-admin.html'; });
  // Read URL param
  const params=new URLSearchParams(location.search);
  if(params.get('stock')==='low') setTimeout(()=>{ document.getElementById('filterStock').value='low'; applyFilters(); },100);
  if(params.get('category')) setTimeout(()=>{ document.getElementById('filterCategory').value=params.get('category'); applyFilters(); },100);
  await loadCategories();
  await loadProducts();
  initFilters();
  applyFilters();
});