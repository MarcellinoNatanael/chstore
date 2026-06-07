/* ============================================================
   CHStore — product-detail.js
   ============================================================ */
'use strict';

let product       = null;
let variants      = [];
let selectedColor = null;
let selectedSize  = null;
let reviewImages  = [];
let selectedRating = 0;
let allImages     = [];
let currentImgIdx = 0;

/* ── Cart ───────────────────────────────────────────────────── */
const CART_KEY = 'chstore_cart';
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
function addToCart(productData) {
  const cart = getCart();
  const existing = cart.find(i => String(i.id) === String(productData.id) && i.color === productData.color && i.size === productData.size);
  if (existing) { existing.qty = (existing.qty || 1) + 1; } else { cart.push({ ...productData, qty: 1 }); }
  saveCart(cart); updateCartBadge();
}
function updateCartBadge() {
  const total = getCart().reduce((s, i) => s + (i.qty || 1), 0);
  document.querySelectorAll('.cart-badge').forEach(el => { el.textContent = total || ''; el.style.display = total > 0 ? 'flex' : 'none'; });
}

/* ── Helpers ────────────────────────────────────────────────── */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(p) { return typeof formatRupiah === 'function' ? formatRupiah(p) : 'Rp\u00A0' + Number(p).toLocaleString('id-ID'); }
function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
function showToast(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t); requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}
function starsHtml(rating, size = 16) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<span class="pd-star ${i <= rating ? 'filled' : ''}" style="font-size:${size}px">★</span>`;
  return h;
}
function anonName(idx) { return ['Pembeli Terverifikasi','Pelanggan Setia','Pengguna CHStore','Pembeli CHStore','Member CHStore'][idx % 5]; }
function anonAvatar(idx) { return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[idx % 26]; }

/* ── Search ─────────────────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('searchInput'); if (!input) return;
  let t;
  input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(() => { const q = this.value.trim(); if (q.length >= 2) window.location.href = `product.html?search=${encodeURIComponent(q)}`; }, 500); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && this.value.trim()) window.location.href = `product.html?search=${encodeURIComponent(this.value.trim())}`; });
}

/* ── Footer Year ────────────────────────────────────────────── */
function setFooterYear() { const el = document.getElementById('footerYear'); if (el) el.textContent = new Date().getFullYear(); }

/* ── Lightbox ───────────────────────────────────────────────── */
function openLightbox(src) { const lb = document.getElementById('pdLightbox'); document.getElementById('lightboxImg').src = src; lb.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('pdLightbox').style.display = 'none'; document.body.style.overflow = ''; }

/* ── Gallery ────────────────────────────────────────────────── */
function setMainImage(src, idx) {
  document.getElementById('pdMainImg').src = src; currentImgIdx = idx;
  document.querySelectorAll('.pd-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}
function buildGallery(images) {
  allImages = images;
  const thumbsEl = document.getElementById('pdThumbs'), mainEl = document.getElementById('pdMainImg');
  if (!images.length) { mainEl.src = 'https://placehold.co/480x480/f5f5f5/1d1d1f?text=No+Image'; return; }
  const primary = images.find(i => i.is_primary) || images[0];
  mainEl.src = primary.image_url; mainEl.alt = product?.name || '';
  thumbsEl.innerHTML = images.map((img, i) => `
    <div class="pd-thumb ${i === 0 ? 'active' : ''}" onclick="setMainImage('${escHtml(img.image_url)}', ${i})" title="Foto ${i + 1}">
      <img src="${escHtml(img.image_url)}" alt="Foto ${i + 1}" loading="lazy">
    </div>`).join('');
  document.getElementById('pdMainImg').onclick = () => openLightbox(allImages[currentImgIdx]?.image_url || allImages[0]?.image_url);
}

/* ── Condition ──────────────────────────────────────────────── */
function setCondition(cond) {
  const map = { baru: { label:'Baru', cls:'badge-baru', tag:'✦ Baru' }, second: { label:'Second', cls:'badge-second', tag:'✦ Second' }, baru_second: { label:'Baru / Second', cls:'badge-baru-second', tag:'✦ Baru / Second' } };
  const c = map[cond] || map['baru'];
  const badge = document.getElementById('pdConditionBadge'), tag = document.getElementById('pdConditionTag');
  badge.className = 'pd-condition-badge ' + c.cls; badge.textContent = c.label; tag.textContent = c.tag;
}

/* ── Variants ───────────────────────────────────────────────── */
function buildVariants(vars) {
  variants = vars || []; if (!variants.length) return;
  const colors = [...new Map(variants.map(v => [v.color_hex, v])).values()];
  if (colors.length > 0) {
    document.getElementById('colorSection').style.display = 'flex';
    document.getElementById('pdColors').innerHTML = colors.map(v => `
      <button class="pd-color-btn" data-hex="${escHtml(v.color_hex)}" data-name="${escHtml(v.color_name || '')}"
        style="background:${escHtml(v.color_hex)}" title="${escHtml(v.color_name || v.color_hex)}"
        onclick="selectColor('${escHtml(v.color_hex)}','${escHtml(v.color_name || '')}')">
      </button>`).join('');
    const first = colors[0]; selectColor(first.color_hex, first.color_name || '');
  }
}
function selectColor(hex, name) {
  selectedColor = hex; document.getElementById('selectedColorName').textContent = name || hex;
  document.querySelectorAll('.pd-color-btn').forEach(b => b.classList.toggle('active', b.dataset.hex === hex));
  updatePrice();
}
function buildSizes(sizes) {
  if (!sizes?.length) return;
  document.getElementById('sizeSection').style.display = 'flex';
  document.getElementById('pdSizes').innerHTML = sizes.map((s, i) => `
    <button class="pd-size-btn ${i === 0 ? 'active' : ''}" data-size="${escHtml(s)}" onclick="selectSize('${escHtml(s)}', this)">${escHtml(s)}</button>`).join('');
  selectedSize = sizes[0];
}
function selectSize(size, btn) {
  selectedSize = size;
  document.querySelectorAll('.pd-size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); updatePrice();
}
function updatePrice() {
  if (!product) return;
  let price = product.price;
  if (selectedColor) { const v = variants.find(v => v.color_hex === selectedColor); if (v?.price_diff) price += v.price_diff; }
  document.getElementById('pdPrice').textContent = fmt(price);
}

/* ── Stock ──────────────────────────────────────────────────── */
function setStock(stock) {
  const el = document.getElementById('pdStock');
  if (stock === 0)    { el.textContent = 'Stok Habis';               el.className = 'pd-stock stock-out'; }
  else if (stock < 5) { el.textContent = `Stok Terbatas (${stock})`; el.className = 'pd-stock stock-low'; }
  else                { el.textContent = 'Tersedia';                  el.className = 'pd-stock stock-ok';  }
}

/* ── Rating Summary ─────────────────────────────────────────── */
function renderRatingSummary(reviews) {
  const starsRow = document.getElementById('pdStarsRow'), ratingCount = document.getElementById('pdRatingCount');
  const avgScore = document.getElementById('avgScore'), avgStars = document.getElementById('avgStars'), avgCount = document.getElementById('avgCount');
  if (!reviews?.length) {
    starsRow.innerHTML = ''; ratingCount.textContent = ''; avgScore.textContent = '—'; avgStars.innerHTML = ''; avgCount.textContent = 'Belum ada ulasan'; return;
  }
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const rounded = Math.round(avg * 10) / 10;
  starsRow.innerHTML = starsHtml(Math.round(avg), 15); ratingCount.textContent = `${rounded} (${reviews.length} ulasan)`;
  avgScore.textContent = rounded.toFixed(1); avgStars.innerHTML = starsHtml(Math.round(avg), 18); avgCount.textContent = `${reviews.length} ulasan`;
}

/* ── Wishlist (Supabase) ────────────────────────────────────── */
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
  return !error;
}

async function removeFromWishlist(productId) {
  const { error } = await supabaseClient
    .from('wishlists')
    .delete()
    .eq('product_id', productId);
  return !error;
}

function heartSVG(filled) {
  return `<svg width="16" height="16" viewBox="0 0 24 24"
    fill="${filled ? '#ffffff' : 'none'}"
    stroke="${filled ? '#ffffff' : 'currentColor'}" stroke-width="2.2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`;
}

async function initWishlistBtn(productId) {
  const btn = document.getElementById('pdBtnCart');
  if (!btn) return;

  let wishlisted = await isWishlisted(productId);
  let isProcessing = false;

  function updateBtn(state) {
    btn.innerHTML = heartSVG(state) + (state ? 'Tersimpan' : 'Add Wishlist');
    btn.classList.toggle('added', state);
    btn.style.background = state ? '#1c1c1c' : '';
    btn.style.borderColor = state ? '#1c1c1c' : '';
    btn.style.color = state ? '#ffffff' : '';
  }

  updateBtn(wishlisted);

  btn.onclick = async () => {
    if (isProcessing) return;
    isProcessing = true;
    btn.disabled = true;

    try {
      if (wishlisted) {
        const ok = await removeFromWishlist(productId);
        if (ok) {
          wishlisted = false;
          updateBtn(false);
          showToast('Dihapus dari wishlist');
        } else {
          showToast('Gagal menghapus wishlist', 'error');
        }
      } else {
        const ok = await addToWishlist(productId);
        if (ok) {
          wishlisted = true;
          updateBtn(true);
          showToast('Ditambahkan ke wishlist ❤️', 'success');
        } else {
          showToast('Gagal menambah wishlist', 'error');
        }
      }
    } catch (err) {
      console.error('wishlist toggle error:', err);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      isProcessing = false;
      btn.disabled = false;
    }
  };
}

/* ── WhatsApp ───────────────────────────────────────────────── */
function initWA() {
  const wa = product?.whatsapp_number || '6281234567890';
  const cleaned = wa.replace(/\D/g, '');
  const waNum = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
  const btnWA = document.getElementById('pdBtnWA');
  if (btnWA) {
    btnWA.onclick = () => {
      const color = selectedColor ? ' Warna: ' + (document.getElementById('selectedColorName')?.textContent || '') : '';
      const size = selectedSize ? ' Kapasitas: ' + selectedSize : '';
      const msg = `Halo CHStore, saya tertarik dengan *${product.name}*${color}${size}. Apakah masih tersedia? Berapa harganya?`;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
    };
  }
}

/* ── Reviews ────────────────────────────────────────────────── */
async function loadReviews(productId) {
  const { data: reviews, error } = await supabaseClient.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  renderRatingSummary(reviews || []);
  renderReviews(reviews || []);
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewList'), empty = document.getElementById('reviewEmpty');
  if (!reviews.length) { empty.style.display = 'flex'; return; }
  empty.style.display = 'none';
  list.innerHTML = reviews.map((r, i) => {
    const imgs = r.image_urls || [];
    return `
      <div class="pd-review-card">
        <div class="pd-review-card-top">
          <div class="pd-reviewer">
            <div class="pd-reviewer-avatar">${anonAvatar(i)}</div>
            <div>
              <div class="pd-reviewer-name">${anonName(i)}</div>
              <div class="pd-reviewer-date">${fmtDate(r.created_at)}</div>
            </div>
          </div>
          <div class="pd-review-stars">${starsHtml(r.rating || 0, 14)}</div>
        </div>
        ${r.comment ? `<div class="pd-review-text">${escHtml(r.comment)}</div>` : ''}
        ${imgs.length ? `<div class="pd-review-imgs">${imgs.map(url => `<img src="${escHtml(url)}" class="pd-review-img" alt="Foto review" loading="lazy" onclick="openLightbox('${escHtml(url)}')">`).join('')}</div>` : ''}
        ${r.admin_reply ? `
          <div class="pd-admin-reply">
            <div class="pd-admin-reply-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Balasan CHStore
            </div>
            <div class="pd-admin-reply-text">${escHtml(r.admin_reply)}</div>
          </div>` : ''}
      </div>`;
  }).join('');
}

/* ── Review Form ────────────────────────────────────────────── */
function initReviewForm(productId) {
  const starBtns = document.querySelectorAll('.pd-star-btn'), starLabel = document.getElementById('starValLabel');
  const labels = ['','Sangat buruk','Kurang bagus','Cukup','Bagus','Sangat bagus'];
  starBtns.forEach(btn => {
    btn.addEventListener('mouseover', () => { const val = parseInt(btn.dataset.val); starBtns.forEach((b, i) => b.classList.toggle('active', i < val)); });
    btn.addEventListener('mouseout', () => { starBtns.forEach((b, i) => b.classList.toggle('active', i < selectedRating)); });
    btn.addEventListener('click', () => { selectedRating = parseInt(btn.dataset.val); starBtns.forEach((b, i) => b.classList.toggle('active', i < selectedRating)); starLabel.textContent = labels[selectedRating]; });
  });
  const imgInput = document.getElementById('reviewImgInput');
  imgInput.addEventListener('change', () => {
    Array.from(imgInput.files).forEach(file => {
      if (reviewImages.length >= 4) { showToast('Maksimal 4 foto', 'error'); return; }
      const r = new FileReader(); r.onload = e => { reviewImages.push({ file, preview: e.target.result }); renderReviewImgPreview(); }; r.readAsDataURL(file);
    });
    imgInput.value = '';
  });
  document.getElementById('reviewSubmit').addEventListener('click', () => submitReview(productId));
}

function renderReviewImgPreview() {
  document.getElementById('reviewImgPreview').innerHTML = reviewImages.map((img, i) => `
    <div class="pd-review-img-thumb">
      <img src="${img.preview}" alt="">
      <button class="pd-review-img-thumb-remove" onclick="removeReviewImg(${i})">✕</button>
    </div>`).join('');
}
function removeReviewImg(i) { reviewImages.splice(i, 1); renderReviewImgPreview(); }

async function submitReview(productId) {
  const text = document.getElementById('reviewText').value.trim();
  if (!selectedRating) { showToast('Pilih rating bintang terlebih dahulu', 'error'); return; }
  const btn = document.getElementById('reviewSubmit'); btn.disabled = true;
  try {
    const imageUrls = [];
    for (const img of reviewImages) { const url = await uploadReviewImg(img.file); if (url) imageUrls.push(url); }
    const { error } = await supabaseClient.from('reviews').insert({ product_id: productId, rating: selectedRating, comment: text || null, image_urls: imageUrls.length ? imageUrls : null });
    if (error) throw error;
    showToast('Ulasan berhasil dikirim! Terima kasih ❤️', 'success');
    document.getElementById('reviewText').value = ''; selectedRating = 0; reviewImages = [];
    renderReviewImgPreview();
    document.querySelectorAll('.pd-star-btn').forEach(b => b.classList.remove('active'));
    const starLbl = document.getElementById('starValLabel');
    if (starLbl) starLbl.textContent = 'Pilih bintang';
    await loadReviews(productId);
  } catch (err) { showToast('Gagal mengirim ulasan: ' + err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function uploadReviewImg(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg','jpeg','png','webp'].includes(ext)) return null;
  if (file.size > 5 * 1024 * 1024) { showToast('Ukuran foto maks 5MB', 'error'); return null; }
  const filename = `reviews/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage.from('products').upload(filename, file, { cacheControl: '3600', upsert: false });
  if (error) return null;
  const { data } = supabaseClient.storage.from('products').getPublicUrl(filename);
  return data.publicUrl;
}

/* ── Load Product ───────────────────────────────────────────── */
async function loadProduct() {
  const params = new URLSearchParams(location.search), productId = params.get('id');
  if (!productId) { showError(); return; }
  try {
    const { data, error } = await supabaseClient.from('products')
      .select('*, product_images(id,image_url,is_primary), product_variants(id,color_name,color_hex,stock,price_diff), product_specs(id,spec_key,spec_value), categories(id,name,slug)')
      .eq('id', productId).eq('is_active', true).single();
    if (error || !data) { showError(); return; }
    product = data;
    document.getElementById('pageTitle').textContent = `${data.name} — CHStore`;
    document.getElementById('pageDesc').content = data.description || `${data.name} tersedia di CHStore Apple Premium Reseller Jakarta`;
    const cat = data.categories;
    if (cat) { const breadCat = document.getElementById('breadCat'); breadCat.textContent = cat.name; breadCat.href = `product.html?category=${cat.slug}`; }
    document.getElementById('breadName').textContent = data.name;
    setCondition(data.condition || 'baru');
    const images = (data.product_images || []).sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
    buildGallery(images);
    document.getElementById('pdName').textContent = data.name;
    document.getElementById('pdPrice').textContent = fmt(data.price);
    setStock(data.stock || 0);
    buildVariants(data.product_variants || []);
    if (data.description) { document.getElementById('descSection').style.display = 'block'; document.getElementById('pdDesc').textContent = data.description; }
    const specs = data.product_specs || [];
    if (specs.length) { document.getElementById('specsSection').style.display = 'block'; document.getElementById('pdSpecsTable').innerHTML = specs.map(s => `<tr><td>${escHtml(s.spec_key)}</td><td>${escHtml(s.spec_value)}</td></tr>`).join(''); }
    initWA();
    await initWishlistBtn(productId);
    updateCartBadge();
    await loadReviews(productId);
    initReviewForm(productId);
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('productContent').style.display = 'block';
  } catch (err) { console.error('loadProduct error:', err); showError(); }
}

function showError() { document.getElementById('loadingState').style.display = 'none'; document.getElementById('errorState').style.display = 'flex'; }

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear(); initSearch(); loadProduct(); updateCartBadge();
  const lightboxClose = document.getElementById('lightboxClose'), lightbox = document.getElementById('pdLightbox');
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
});