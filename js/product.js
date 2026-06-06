/* ============================================================
   CHStore — product.js
   ============================================================ */
'use strict';

/* ── Cart Badge ─────────────────────────────────────────────── */
const CART_KEY = 'chstore_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function updateCartBadge() {
  const total = getCart().reduce((s, i) => s + (i.qty || 1), 0);
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = total || '';
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

/* ── Toast ──────────────────────────────────────────────────── */
function showToast(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}

function fmt(price) {
  if (typeof formatRupiah === 'function') return formatRupiah(price);
  return 'Rp\u00A0' + Number(price).toLocaleString('id-ID');
}

function getImg(p) {
  return p.product_images?.find(i => i.is_primary)?.image_url
    || p.product_images?.[0]?.image_url || '';
}

function setFooterYear() {
  const el = document.getElementById('footerYear'); if (el) el.textContent = new Date().getFullYear();
}

/* ── Stars ──────────────────────────────────────────────────── */
function starsHtml(avg, count) {
  const filled = Math.round(avg || 0);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span style="color:${i <= filled ? '#F59E0B' : '#E8E8E8'};font-size:11px;">★</span>`;
  }
  const label = count > 0
    ? `${avg.toFixed(1)} <span style="color:var(--g400)">(${count})</span>`
    : `<span style="color:var(--g400)">Belum ada ulasan</span>`;
  return `<div class="product-rating">${stars} ${label}</div>`;
}

/* ── Nav Active ─────────────────────────────────────────────── */
function setNavActive(cat) {
  const map = { mac:'nav-mac', ipad:'nav-ipad', iphone:'nav-iphone', aksesoris:'nav-aksesoris', services:'nav-services' };
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const id = map[cat] || 'nav-home';
  document.getElementById(id)?.classList.add('active');
}

/* ── Supabase Wishlist Helpers ──────────────────────────────── */
let wishlistedIds = new Set();

async function loadWishlistedIds() {
  const { data } = await supabaseClient
    .from('wishlists')
    .select('product_id');
  wishlistedIds = new Set((data || []).map(r => String(r.product_id)));
}

async function toggleWishlistProduct(productId, btn) {
  btn.disabled = true;
  const sid    = String(productId);
  const inWish = wishlistedIds.has(sid);
  const svg    = btn.querySelector('svg');

  try {
    if (inWish) {
      await supabaseClient
        .from('wishlists')
        .delete()
        .eq('product_id', productId);
      wishlistedIds.delete(sid);
      btn.classList.remove('active');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      btn.setAttribute('aria-label', 'Tambah ke wishlist');
      showToast('Dihapus dari wishlist');
    } else {
      await supabaseClient
        .from('wishlists')
        .insert({ product_id: productId });
      wishlistedIds.add(sid);
      btn.classList.add('active');
      svg.setAttribute('fill', '#FF3B30');
      svg.setAttribute('stroke', '#FF3B30');
      btn.setAttribute('aria-label', 'Hapus dari wishlist');
      showToast('Ditambahkan ke wishlist ❤️', 'success');
    }
  } catch (err) {
    console.error('toggleWishlistProduct error:', err);
    showToast('Gagal update wishlist', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ── Build Card ─────────────────────────────────────────────── */
function buildCard(product, imgUrl, ratingMap = {}) {
  const img   = imgUrl || 'https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image';
  const price = fmt(product.price);
  const name  = (product.name || '').replace(/</g, '&lt;');
  const r     = ratingMap[product.id] || { avg: 0, count: 0 };
  const condMap = { baru: 'Baru', second: 'Second', baru_second: 'Baru/Second' };
  const condLabel = condMap[product.condition] || 'Baru';
  const inWish = wishlistedIds.has(String(product.id));

  return `
    <article class="product-card" role="listitem" tabindex="0"
      onclick="window.location.href='product-detail.html?id=${product.id}'"
      onkeydown="if(event.key==='Enter')window.location.href='product-detail.html?id=${product.id}'">
      <div class="product-img-area">
        <img src="${img}" alt="${name}" loading="lazy" width="200" height="160"
             onerror="this.src='https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image'">
        <span class="product-badge-img">${condLabel}</span>
        <button class="wishlist-btn ${inWish ? 'active' : ''}"
          onclick="event.stopPropagation();toggleWishlistProduct('${product.id}',this)"
          aria-label="${inWish ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}">
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill="${inWish ? '#FF3B30' : 'none'}"
            stroke="${inWish ? '#FF3B30' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="product-info-area">
        <div class="product-badge-lbl">${condLabel}</div>
        <div class="product-name">${name}</div>
        ${starsHtml(r.avg, r.count)}
        <div class="product-price-lbl">Mulai dari</div>
        <div class="product-price">${price}</div>
        <div class="product-detail-link">Detail Produk →</div>
      </div>
    </article>`;
}

/* ── Load Products ──────────────────────────────────────────── */
async function loadProducts(cat) {
  const grid  = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = Array(6).fill('<div class="prod-skeleton"></div>').join('');
  empty.style.display = 'none';

  try {
    let query = supabaseClient
      .from('products')
      .select('*, product_images(image_url, is_primary), categories(id, slug, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (cat) {
      const { data: catData } = await supabaseClient
        .from('categories').select('id').eq('slug', cat).single();
      if (!catData) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      query = query.eq('category_id', catData.id);
    }

    const { data: prods, error } = await query;
    if (error) throw error;

    if (!prods || !prods.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    // Rating
    const ids = prods.map(p => p.id);
    const { data: reviews } = await supabaseClient
      .from('reviews').select('product_id, rating').in('product_id', ids);

    const ratingMap = {};
    (reviews || []).forEach(r => {
      if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
      ratingMap[r.product_id].sum   += r.rating;
      ratingMap[r.product_id].count += 1;
    });
    Object.keys(ratingMap).forEach(id => {
      ratingMap[id].avg = ratingMap[id].sum / ratingMap[id].count;
    });

    grid.innerHTML = prods.map(p => buildCard(p, getImg(p), ratingMap)).join('');

  } catch (err) {
    console.error('loadProducts error:', err);
    grid.innerHTML = '';
    empty.style.display = 'block';
  }
}

/* ── Meta ───────────────────────────────────────────────────── */
async function updateMeta(cat) {
  let lbl = 'Semua Produk';
  if (cat) {
    const { data } = await supabaseClient
      .from('categories').select('name').eq('slug', cat).single();
    lbl = data?.name || cat;
  }
  document.getElementById('pageTitle').textContent    = `${lbl} — CHStore Apple Premium Reseller Jakarta`;
  document.getElementById('pageHeading').textContent  = lbl;
  document.getElementById('bcCurrent').textContent    = lbl;
  document.getElementById('pageSubtitle').textContent = cat
    ? `Menampilkan semua produk ${lbl}`
    : 'Menampilkan semua produk';
}

/* ── Search ─────────────────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('searchInput'); if (!input) return;
  let t;
  input.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = this.value.trim();
      if (q.length >= 2) window.location.href = `product.html?search=${encodeURIComponent(q)}`;
    }, 500);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.trim())
      window.location.href = `product.html?search=${encodeURIComponent(this.value.trim())}`;
  });
}

/* ── INIT ───────────────────────────────────────────────────── */
const urlParams = new URLSearchParams(location.search);
const activeCat = urlParams.get('category') || '';

document.addEventListener('DOMContentLoaded', async () => {
  setFooterYear();
  initSearch();
  setNavActive(activeCat);
  updateCartBadge();
  await loadWishlistedIds();
  await updateMeta(activeCat);
  loadProducts(activeCat);
});