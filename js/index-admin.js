/* ============================================================
   CHStore — index-admin.js
   Dashboard admin. Bergantung pada supabase.js
   (supabaseClient, getCurrentUser, getCurrentProfile, formatRupiah)
   ============================================================ */
'use strict';

/* ── Helpers ────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmt(price) {
  if (typeof formatRupiah === 'function') return formatRupiah(price);
  return 'Rp\u00A0' + Number(price).toLocaleString('id-ID');
}

function showToast(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}

/* ── Auth Guard ─────────────────────────────────────────────── */
async function requireAdmin() {
  try {
    const user    = await getCurrentUser();
    if (!user) { window.location.href = 'login-admin.html'; return false; }
    const profile = await getCurrentProfile();
    if (profile?.role !== 'admin') {
      await supabaseClient.auth.signOut();
      window.location.href = 'login-admin.html';
      return false;
    }

    // Isi info sidebar
    const name = profile.full_name || profile.username || user.email?.split('@')[0] || 'Admin';
    const nameEl   = document.getElementById('sidebarName');
    const avatarEl = document.getElementById('sidebarAvatar');
    if (nameEl)   nameEl.textContent   = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

    return true;
  } catch {
    window.location.href = 'login-admin.html';
    return false;
  }
}

/* ── Logout ─────────────────────────────────────────────────── */
async function doLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login-admin.html';
}

/* ── Sidebar Toggle (mobile) ────────────────────────────────── */
function initSidebarToggle() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Close saat klik di luar
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('open')
      && !sidebar.contains(e.target)
      && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

/* ── Greeting ───────────────────────────────────────────────── */
function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Selamat pagi' : h < 18 ? 'Selamat siang' : 'Selamat malam';
  const el = document.getElementById('greetLine');
  if (el) el.textContent = greet;
}

/* ── Load Stats ─────────────────────────────────────────────── */
async function loadStats() {
  const [
    { count: total },
    { count: active },
    { data: cats },
    { count: low }
  ] = await Promise.all([
    supabaseClient.from('products').select('*', { count: 'exact', head: true }),
    supabaseClient.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseClient.from('categories').select('id'),
    supabaseClient.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5).gt('stock', 0),
  ]);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
  };
  set('statTotal',  total);
  set('statActive', active);
  set('statCats',   cats?.length);
  set('statLow',    low);
}

/* ── Recent Products ────────────────────────────────────────── */
async function loadRecentProducts() {
  const el = document.getElementById('recentProductsList');
  if (!el) return;

  const { data, error } = await supabaseClient
    .from('products')
    .select('id, name, price, stock, is_active, created_at, product_images(image_url, is_primary), categories(name)')
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !data?.length) {
    el.innerHTML = `
      <div class="admin-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <p>Belum ada produk. <a href="add-product.html" style="color:var(--ink);font-weight:600">Tambahkan sekarang</a></p>
      </div>`;
    return;
  }

  const getImg = p => p.product_images?.find(i => i.is_primary)?.image_url
    || p.product_images?.[0]?.image_url || '';

  el.innerHTML = data.map(p => {
    const img        = getImg(p);
    const stockColor = p.stock === 0 ? '#EF4444' : p.stock < 5 ? '#F97316' : '#22C55E';
    const badgeHtml  = p.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-gray">Nonaktif</span>';

    return `
      <div class="product-list-item">
        ${img
          ? `<img src="${escHtml(img)}" alt="${escHtml(p.name)}" class="product-thumb"
               onerror="this.style.display='none'">`
          : `<div class="product-thumb-placeholder">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                 <polyline points="21 15 16 10 5 21"/>
               </svg>
             </div>`}
        <div class="product-list-info">
          <div class="product-list-name">${escHtml(p.name)}</div>
          <div class="product-list-cat">
            ${p.categories?.name ? `<span class="badge badge-info">${escHtml(p.categories.name)}</span>` : ''}
            <span style="font-size:11px;color:${stockColor};font-weight:600">Stok: ${p.stock}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="product-list-price">${fmt(p.price)}</div>
          <div style="margin-top:4px">${badgeHtml}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Low Stock ──────────────────────────────────────────────── */
async function loadLowStock() {
  const el = document.getElementById('lowStockList');
  if (!el) return;

  const { data } = await supabaseClient
    .from('products')
    .select('id, name, stock, product_images(image_url, is_primary)')
    .lt('stock', 5)
    .order('stock', { ascending: true })
    .limit(6);

  if (!data?.length) {
    el.innerHTML = `
      <div class="stock-ok">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <p>Semua stok aman</p>
      </div>`;
    return;
  }

  const getImg = p => p.product_images?.find(i => i.is_primary)?.image_url
    || p.product_images?.[0]?.image_url || '';

  el.innerHTML = data.map(p => {
    const img       = getImg(p);
    const badgeCls  = p.stock === 0 ? 'badge-danger' : 'badge-warn';
    const badgeTxt  = p.stock === 0 ? 'Habis' : `${p.stock} unit`;

    return `
      <div class="product-list-item">
        ${img
          ? `<img src="${escHtml(img)}" alt="${escHtml(p.name)}" class="product-thumb"
               onerror="this.style.display='none'">`
          : `<div class="product-thumb-placeholder">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                 <polyline points="21 15 16 10 5 21"/>
               </svg>
             </div>`}
        <div class="product-list-info">
          <div class="product-list-name">${escHtml(p.name)}</div>
          <a href="edit-product.html?id=${p.id}"
             style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:11.5px;font-weight:600;color:var(--ink);border:1px solid var(--g200);padding:2px 8px;border-radius:var(--r-full);transition:var(--ease)"
             onmouseover="this.style.borderColor='var(--ink)'"
             onmouseout="this.style.borderColor='var(--g200)'">
            Edit stok
          </a>
        </div>
        <span class="badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
  }).join('');
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin();
  if (!ok) return;

  setGreeting();
  initSidebarToggle();

  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  await Promise.all([loadStats(), loadRecentProducts(), loadLowStock()]);
});