/* ============================================================
   CHStore — wishlist.js
   Wishlist berbasis Supabase, tanpa login (localStorage)
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
  const box = document.getElementById('toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}

/* ── Format Harga ───────────────────────────────────────────── */
function fmt(price) {
  if (typeof formatRupiah === 'function') return formatRupiah(price);
  return 'Rp\u00A0' + Number(price).toLocaleString('id-ID');
}

function getImg(p) {
  return p.product_images?.find(i => i.is_primary)?.image_url
    || p.product_images?.[0]?.image_url
    || '';
}

/* ── Footer Year ────────────────────────────────────────────── */
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── Search ─────────────────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
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

/* ── Supabase Wishlist Helpers ──────────────────────────────── */
async function getWishlistIds() {
  const { data, error } = await supabaseClient
    .from('wishlists')
    .select('product_id');
  if (error) { console.error('getWishlistIds error:', error); return []; }
  return (data || []).map(r => String(r.product_id));
}

async function isWishlisted(productId) {
  const { data } = await supabaseClient
    .from('wishlists')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle();
  return !!data;
}

async function addToWishlist(productId) {
  const { error } = await supabaseClient
    .from('wishlists')
    .insert({ product_id: productId });
  if (error) { console.error('addToWishlist error:', error); return false; }
  return true;
}

async function removeFromWishlist(productId) {
  const { error } = await supabaseClient
    .from('wishlists')
    .delete()
    .eq('product_id', productId);
  if (error) { console.error('removeFromWishlist error:', error); return false; }
  return true;
}

async function toggleWishlistSupabase(productId) {
  const inWish = await isWishlisted(productId);
  if (inWish) {
    await removeFromWishlist(productId);
    return false;
  } else {
    await addToWishlist(productId);
    return true;
  }
}

/* ── Build Product Card ─────────────────────────────────────── */
function buildCard(product, inWish = false) {
  const img   = getImg(product) || 'https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image';
  const price = fmt(product.price);
  const name  = (product.name || '').replace(/</g, '&lt;');
  const condMap = { baru: 'Baru', second: 'Second', baru_second: 'Baru/Second' };
  const condLabel = condMap[product.condition] || 'Baru';

  return `
    <article class="product-card" role="listitem" tabindex="0"
      onclick="window.location.href='product-detail.html?id=${product.id}'"
      onkeydown="if(event.key==='Enter')window.location.href='product-detail.html?id=${product.id}'">
      <div class="product-img-area">
        <img src="${img}" alt="${name}" loading="lazy" width="200" height="160"
             onerror="this.src='https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image'">
        <span class="product-badge-img">${condLabel}</span>
        <button class="wishlist-btn ${inWish ? 'active' : ''}"
          onclick="event.stopPropagation();toggleCard('${product.id}',this)"
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
        <div class="product-price-lbl">Mulai dari</div>
        <div class="product-price">${price}</div>
        <div class="product-detail-link">Detail Produk →</div>
      </div>
    </article>`;
}

/* ── Toggle dari card ───────────────────────────────────────── */
async function toggleCard(productId, btn) {
  btn.disabled = true;
  const svg = btn.querySelector('svg');

  try {
    const added = await toggleWishlistSupabase(productId);

    if (!added) {
      const card = btn.closest('.product-card');
      if (card) {
        card.style.transition = 'opacity 0.25s, transform 0.25s';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.95)';
        setTimeout(() => { card.remove(); updateCount(); }, 260);
      }
      showToast('Dihapus dari wishlist');
    } else {
      btn.classList.add('active');
      svg.setAttribute('fill', '#FF3B30');
      svg.setAttribute('stroke', '#FF3B30');
      btn.setAttribute('aria-label', 'Hapus dari wishlist');
      showToast('Ditambahkan ke wishlist ❤️', 'success');
    }
  } catch (err) {
    console.error('toggleCard error:', err);
    showToast('Gagal update wishlist', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ── Update Count ───────────────────────────────────────────── */
function updateCount() {
  const grid    = document.querySelector('.wish-grid');
  const countEl = document.getElementById('wishCount');
  if (!grid) return;
  const remaining = grid.querySelectorAll('.product-card').length;
  if (remaining === 0) {
    document.getElementById('wishlistContent').innerHTML = buildEmpty();
    if (countEl) countEl.textContent = 'Belum ada produk di wishlist';
  } else {
    if (countEl) countEl.textContent = `${remaining} produk tersimpan`;
  }
}

/* ── Empty State ────────────────────────────────────────────── */
function buildEmpty() {
  return `
    <div class="wish-empty">
      <div class="wish-empty-icon">♡</div>
      <div class="wish-empty-title">Wishlist masih kosong</div>
      <div class="wish-empty-desc">Temukan produk Apple favoritmu dan tambahkan ke wishlist!</div>
      <a href="product.html" class="wish-empty-btn">Mulai Belanja</a>
    </div>`;
}

/* ── Load Wishlist dari Supabase ────────────────────────────── */
async function loadWishlist() {
  const content = document.getElementById('wishlistContent');
  const countEl = document.getElementById('wishCount');

  content.innerHTML = `
    <div class="wish-skeleton-grid">
      <div class="prod-skeleton"></div>
      <div class="prod-skeleton"></div>
      <div class="prod-skeleton"></div>
      <div class="prod-skeleton"></div>
    </div>`;

  try {
    const { data: wishRows, error } = await supabaseClient
      .from('wishlists')
      .select('product_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!wishRows || !wishRows.length) {
      if (countEl) countEl.textContent = 'Belum ada produk di wishlist';
      content.innerHTML = buildEmpty();
      return;
    }

    const productIds = wishRows.map(r => r.product_id);
    const { data: prods, error: prodError } = await supabaseClient
      .from('products')
      .select('*, product_images(image_url, is_primary)')
      .in('id', productIds)
      .eq('is_active', true);

    if (prodError) throw prodError;

    if (!prods || !prods.length) {
      if (countEl) countEl.textContent = 'Belum ada produk di wishlist';
      content.innerHTML = buildEmpty();
      return;
    }

    const ordered = wishRows
      .map(r => prods.find(p => String(p.id) === String(r.product_id)))
      .filter(Boolean);

    if (countEl) countEl.textContent = `${ordered.length} produk tersimpan`;

    content.innerHTML = `
      <div class="wish-grid">
        ${ordered.map(p => buildCard(p, true)).join('')}
      </div>`;

  } catch (err) {
    console.error('loadWishlist error:', err);
    content.innerHTML = buildEmpty();
    if (countEl) countEl.textContent = 'Gagal memuat wishlist';
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initSearch();
  updateCartBadge();
  loadWishlist();
});