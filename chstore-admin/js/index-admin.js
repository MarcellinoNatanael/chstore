/* ============================================================
   CHStore — index-admin.js
   ============================================================ */
'use strict';

/* ── Helpers ────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(price) {
  return typeof formatRupiah === 'function' ? formatRupiah(price) : 'Rp\u00A0' + Number(price).toLocaleString('id-ID');
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function showToast(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}
function starsHtml(r) {
  return Array.from({length:5},(_,i)=>`<span style="color:${i<r?'#F59E0B':'#E8E8E8'};font-size:12px">★</span>`).join('');
}

/* ── Auth Guard ─────────────────────────────────────────────── */
async function requireAdmin() {
  try {
    const user = await getCurrentUser();
    if (!user) { window.location.href = 'login-admin.html'; return false; }
    const profile = await getCurrentProfile();
    if (profile?.role !== 'admin') {
      await supabaseClient.auth.signOut();
      window.location.href = 'login-admin.html';
      return false;
    }
    const name = profile.full_name || profile.username || user.email?.split('@')[0] || 'Admin';
    const n = document.getElementById('sidebarName'), a = document.getElementById('sidebarAvatar');
    if (n) n.textContent = name;
    if (a) a.textContent = name.charAt(0).toUpperCase();
    return true;
  } catch { window.location.href = 'login-admin.html'; return false; }
}

/* ── Logout + Sidebar ───────────────────────────────────────── */
async function doLogout() { await supabaseClient.auth.signOut(); window.location.href = 'login-admin.html'; }

function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle'), sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target))
      sidebar.classList.remove('open');
  });
}

/* ── Greeting ───────────────────────────────────────────────── */
function setGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById('greetLine');
  if (el) el.textContent = h < 12 ? 'Selamat pagi' : h < 18 ? 'Selamat siang' : 'Selamat malam';
}

/* ── KPI ────────────────────────────────────────────────────── */
async function loadKPI() {
  const [{ count: total }, { count: low }, { count: reviews }] = await Promise.all([
    supabaseClient.from('products').select('*', { count: 'exact', head: true }),
    supabaseClient.from('products').select('*', { count: 'exact', head: true }).lt('stock', 5),
    supabaseClient.from('reviews').select('*', { count: 'exact', head: true }),
  ]);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
  set('kpiTotal', total); set('kpiLow', low); set('kpiReviews', reviews);
}

/* ── Bar Chart ──────────────────────────────────────────────── */
function renderBarChart(containerId, wishByMonth, revByMonth) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const maxVal = Math.max(...wishByMonth, ...revByMonth, 1);

  const barW = 28, gap = 8, groupW = barW * 2 + gap, groupGap = 14;
  const W = MONTHS.length * (groupW + groupGap) + 40;
  const H = 200, padT = 16, padB = 32, padL = 32, padR = 8;
  const chartH = H - padT - padB;

  let bars = '', xLabels = '', gridLines = '';

  // Grid
  for (let t = 0; t <= 4; t++) {
    const v = Math.round(maxVal * t / 4);
    const y = padT + chartH * (1 - t / 4);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#F0F0F0" stroke-width="1"/>
    <text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#AEAEB2">${v}</text>`;
  }

  MONTHS.forEach((m, i) => {
    const xBase = padL + i * (groupW + groupGap);
    const wVal = wishByMonth[i] || 0;
    const rVal = revByMonth[i] || 0;
    const wH = Math.max((wVal / maxVal) * chartH, wVal > 0 ? 3 : 0);
    const rH = Math.max((rVal / maxVal) * chartH, rVal > 0 ? 3 : 0);

    bars += `
      <rect x="${xBase}" y="${padT + chartH - wH}" width="${barW}" height="${wH}" fill="#3B82F6" rx="3" opacity="0.85">
        <title>Wishlist ${m}: ${wVal}</title>
      </rect>
      <rect x="${xBase + barW + gap}" y="${padT + chartH - rH}" width="${barW}" height="${rH}" fill="#F59E0B" rx="3" opacity="0.85">
        <title>Review ${m}: ${rVal}</title>
      </rect>`;

    // Value labels on top
    if (wVal > 0) bars += `<text x="${xBase + barW/2}" y="${padT + chartH - wH - 4}" text-anchor="middle" font-size="9" fill="#3B82F6" font-weight="700">${wVal}</text>`;
    if (rVal > 0) bars += `<text x="${xBase + barW + gap + barW/2}" y="${padT + chartH - rH - 4}" text-anchor="middle" font-size="9" fill="#F59E0B" font-weight="700">${rVal}</text>`;

    xLabels += `<text x="${xBase + barW + gap/2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8E8E93">${m}</text>`;
  });

  wrap.innerHTML = `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <svg viewBox="0 0 ${W} ${H}" style="min-width:${W}px;height:${H}px;display:block">
        ${gridLines}${bars}${xLabels}
      </svg>
    </div>`;
}

/* ── Analytics ──────────────────────────────────────────────── */
async function loadAnalytics(year, filterCatId = '') {
  const periodEl = document.getElementById('analyticsPeriodLabel');
  if (periodEl) periodEl.textContent = year;

  const wrap = document.getElementById('barChartWrap');
  if (wrap) wrap.innerHTML = '<div class="chart-loading"><div class="admin-spinner"></div><span>Memuat data...</span></div>';

  const startDate = `${year}-01-01`, endDate = `${year + 1}-01-01`;

  const [{ data: allCats }, { data: wishData }, { data: revData }, { data: prodCats }] = await Promise.all([
    supabaseClient.from('categories').select('id, name, slug').order('name'),
    supabaseClient.from('wishlists').select('product_id, created_at').gte('created_at', startDate).lt('created_at', endDate),
    supabaseClient.from('reviews').select('product_id, created_at').gte('created_at', startDate).lt('created_at', endDate),
    supabaseClient.from('products').select('id, category_id'),
  ]);

  // Populate dropdowns
  const catSel = document.getElementById('analyticsCategory');
  if (catSel && catSel.options.length <= 1) {
    (allCats || []).forEach(c => {
      const o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
      catSel.appendChild(o);
    });
  }

  const prodCatMap = {};
  (prodCats || []).forEach(p => { prodCatMap[p.id] = p.category_id; });

  // Filter by category if selected
  const filterFn = filterCatId
    ? (item) => prodCatMap[item.product_id] === filterCatId
    : () => true;

  const wishByMonth = Array(12).fill(0);
  const revByMonth  = Array(12).fill(0);

  (wishData || []).filter(filterFn).forEach(w => {
    wishByMonth[new Date(w.created_at).getUTCMonth()]++;
  });
  (revData || []).filter(filterFn).forEach(r => {
    revByMonth[new Date(r.created_at).getUTCMonth()]++;
  });

  renderBarChart('barChartWrap', wishByMonth, revByMonth);
}

/* ── Review per Kategori/Produk ─────────────────────────────── */
let allReviewsData = [];
let allProductsData = [];
let allCatsData = [];
let expandedProductId = null;
let currentReplyReviewId = null;

async function loadReviewSection() {
  const el = document.getElementById('reviewProductList');
  if (!el) return;

  const [{ data: products }, { data: cats }, { data: reviews }] = await Promise.all([
    supabaseClient.from('products').select('id, name, category_id, product_images(image_url, is_primary)').eq('is_active', true).order('name'),
    supabaseClient.from('categories').select('id, name, slug').order('name'),
    supabaseClient.from('reviews').select('*').order('created_at', { ascending: false }),
  ]);

  allProductsData = products || [];
  allCatsData     = cats || [];
  allReviewsData  = reviews || [];

  // Populate review cat filter
  const catSel = document.getElementById('reviewCatFilter');
  if (catSel && catSel.options.length <= 1) {
    (cats || []).forEach(c => {
      const o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
      catSel.appendChild(o);
    });
    catSel.addEventListener('change', () => renderReviewProductList(catSel.value));
  }

  renderReviewProductList('');
}

function renderReviewProductList(filterCatId) {
  const el = document.getElementById('reviewProductList');
  if (!el) return;

  const filtered = filterCatId
    ? allProductsData.filter(p => p.category_id === filterCatId)
    : allProductsData;

  // Only show products that have reviews
  const withReviews = filtered.filter(p => allReviewsData.some(r => r.product_id === p.id));

  if (!withReviews.length) {
    el.innerHTML = `<div class="admin-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada produk dengan ulasan</p></div>`;
    return;
  }

  el.innerHTML = withReviews.map(p => {
    const img = p.product_images?.find(i => i.is_primary)?.image_url || p.product_images?.[0]?.image_url || '';
    const reviews = allReviewsData.filter(r => r.product_id === p.id);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
    const isExpanded = expandedProductId === p.id;
    const cat = allCatsData.find(c => c.id === p.category_id);

    return `
      <div class="review-product-row" id="rpr_${p.id}">
        <div class="review-product-header" onclick="toggleProductReviews('${p.id}')">
          ${img ? `<img src="${escHtml(img)}" class="product-thumb" onerror="this.style.display='none'" alt="">` : `<div class="product-thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
          <div class="product-list-info">
            <div class="product-list-name">${escHtml(p.name)}</div>
            <div class="product-list-cat">
              ${cat ? `<span class="badge badge-info">${escHtml(cat.name)}</span>` : ''}
              <span style="font-size:11px;color:var(--g500)">${reviews.length} ulasan · ★ ${avg}</span>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;transition:transform 0.2s;transform:rotate(${isExpanded?'180':'0'}deg)"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        ${isExpanded ? `<div class="review-product-detail">${renderProductReviews(reviews, p.id)}</div>` : ''}
      </div>`;
  }).join('');
}

function renderProductReviews(reviews, productId) {
  if (!reviews.length) return `<div style="padding:16px 20px;color:var(--g400);font-size:13px">Belum ada ulasan</div>`;

  return reviews.map((r, i) => {
    const names = ['Pembeli Terverifikasi','Pelanggan Setia','Pengguna CHStore','Pembeli CHStore','Member CHStore'];
    const avatarChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const name   = names[i % names.length];
    const avatar = avatarChars[i % 26];
    const imgs   = r.image_urls || [];
    const adminReply = r.admin_reply;

    return `
      <div class="review-detail-item">
        <div class="review-item-top">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="review-avatar">${avatar}</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--ink)">${name}</div>
              <div style="font-size:11px;color:var(--g400)">${fmtDate(r.created_at)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div>${starsHtml(r.rating)}</div>
            <button class="btn-reply" onclick="openReplyModal('${r.id}', '${escHtml((r.comment||'').replace(/'/g,"\\'"))}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              Balas
            </button>
          </div>
        </div>
        ${r.comment ? `<div style="font-size:13px;color:var(--g600);line-height:1.6;margin-top:6px">${escHtml(r.comment)}</div>` : ''}
        ${imgs.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${imgs.map(url=>`<img src="${escHtml(url)}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--g200)" onclick="window.open('${escHtml(url)}','_blank')">`).join('')}</div>` : ''}
        ${adminReply ? `
          <div class="admin-reply-box">
            <div style="font-size:11px;font-weight:700;color:var(--ink);margin-bottom:4px">Balasan Admin CHStore</div>
            <div style="font-size:12.5px;color:var(--g600);line-height:1.6">${escHtml(adminReply)}</div>
          </div>` : ''}
      </div>`;
  }).join('');
}

function toggleProductReviews(productId) {
  expandedProductId = expandedProductId === productId ? null : productId;
  const catSel = document.getElementById('reviewCatFilter');
  renderReviewProductList(catSel?.value || '');
}

/* ── Reply Modal ────────────────────────────────────────────── */
function openReplyModal(reviewId, reviewText) {
  currentReplyReviewId = reviewId;
  document.getElementById('replyModalReview').textContent = reviewText || '(tidak ada komentar)';
  document.getElementById('replyText').value = '';
  document.getElementById('replyModal').style.display = 'flex';
}

async function submitReply() {
  const text = document.getElementById('replyText').value.trim();
  if (!text) { showToast('Tulis balasan terlebih dahulu', 'error'); return; }

  const btn = document.getElementById('replyConfirm');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  const { error } = await supabaseClient
    .from('reviews')
    .update({ admin_reply: text })
    .eq('id', currentReplyReviewId);

  btn.disabled = false;
  btn.textContent = 'Kirim Balasan';

  if (error) { showToast('Gagal mengirim: ' + error.message, 'error'); return; }

  showToast('Balasan berhasil dikirim ✅', 'success');
  document.getElementById('replyModal').style.display = 'none';

  // Update local data
  const idx = allReviewsData.findIndex(r => r.id === currentReplyReviewId);
  if (idx !== -1) allReviewsData[idx].admin_reply = text;

  const catSel = document.getElementById('reviewCatFilter');
  renderReviewProductList(catSel?.value || '');
}

/* ── Recent Reviews ─────────────────────────────────────────── */
async function loadRecentReviews() {
  const el = document.getElementById('recentReviewsList');
  if (!el) return;

  const { data } = await supabaseClient
    .from('reviews')
    .select('id, rating, comment, created_at, product_id, products(name), profiles(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data?.length) {
    el.innerHTML = `<div class="admin-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada review masuk</p></div>`;
    return;
  }

  el.innerHTML = data.map(r => {
    const name    = r.profiles?.full_name || r.profiles?.username || 'Pengguna';
    const initial = name.charAt(0).toUpperCase();
    const product = r.products?.name || '—';
    return `
      <div class="review-item">
        <div class="review-avatar">${initial}</div>
        <div class="review-body">
          <div class="review-header">
            <span class="review-name">${escHtml(name)}</span>
            <span class="review-product">${escHtml(product)}</span>
            <div class="review-stars">${starsHtml(r.rating)}</div>
          </div>
          ${r.comment ? `<div class="review-text">${escHtml(r.comment)}</div>` : ''}
          <div class="review-date">${fmtDate(r.created_at)}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin(); if (!ok) return;

  setGreeting();
  initSidebarToggle();
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  // Analytics filter
  const now = new Date();
  const yearSel = document.getElementById('analyticsYear');
  if (yearSel) yearSel.value = now.getFullYear();

  document.getElementById('analyticsApplyBtn')?.addEventListener('click', () => {
    const year  = parseInt(document.getElementById('analyticsYear').value);
    const catId = document.getElementById('analyticsCategory')?.value || '';
    loadAnalytics(year, catId);
  });

  // Reply modal
  document.getElementById('replyConfirm')?.addEventListener('click', submitReply);
  document.getElementById('replyCancel')?.addEventListener('click', () => {
    document.getElementById('replyModal').style.display = 'none';
  });

  await Promise.all([
    loadKPI(),
    loadRecentReviews(),
    loadReviewSection(),
    loadAnalytics(now.getFullYear()),
  ]);
});