/* ============================================================
   CHStore — index.js
   ============================================================ */
'use strict';

function showToastCustomer(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}

function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

function initHeroSlider() {
  let cur = 0;
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  function goTo(n) {
    slides[cur].classList.remove('active');
    if (dots[cur]) dots[cur].classList.remove('active');
    cur = ((n % slides.length) + slides.length) % slides.length;
    slides[cur].classList.add('active');
    if (dots[cur]) dots[cur].classList.add('active');
  }
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  let timer = setInterval(() => goTo(cur + 1), 5000);
  const sl = document.getElementById('heroSlider');
  if (sl) {
    sl.addEventListener('mouseenter', () => clearInterval(timer));
    sl.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(cur + 1), 5000); });
    let tx = 0;
    sl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 48) goTo(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
}

function initCarouselArrows() {
  const track = document.getElementById('productCarousel');
  if (!track) return;
  document.getElementById('carouselPrev')?.addEventListener('click', () =>
    track.scrollBy({ left: -216, behavior: 'smooth' }));
  document.getElementById('carouselNext')?.addEventListener('click', () =>
    track.scrollBy({ left: 216, behavior: 'smooth' }));
}

/* ── Stars helper ───────────────────────────────────────────── */
function starsHtml(avg, count) {
  const filled = Math.round(avg || 0);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span style="color:${i <= filled ? '#F59E0B' : '#E8E8E8'};font-size:11px;">★</span>`;
  }
  const label = count > 0
    ? `${(avg).toFixed(1)} <span style="color:var(--g400)">(${count})</span>`
    : `<span style="color:var(--g400)">Belum ada ulasan</span>`;
  return `<div class="product-rating">${stars} ${label}</div>`;
}

/* ── Build Card ─────────────────────────────────────────────── */
function buildCard(product, imgUrl, ratingMap = {}) {
  const img   = imgUrl || 'https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image';
  const price = (typeof formatRupiah === 'function')
    ? formatRupiah(product.price)
    : 'Rp\u00A0' + Number(product.price).toLocaleString('id-ID');
  const name  = (product.name || '').replace(/</g, '&lt;');
  const r     = ratingMap[product.id] || { avg: 0, count: 0 };
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
async function loadProducts() {
  const track = document.getElementById('productCarousel');
  if (!track) return;
  track.innerHTML = Array(4).fill('<div class="card-skeleton"></div>').join('');

  try {
    const { data: prods, error } = await supabaseClient
      .from('products')
      .select('*, product_images(image_url, is_primary), categories(id, slug, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;
    if (!prods || !prods.length) {
      track.innerHTML = '<div class="carousel-empty">Belum ada produk tersedia.</div>';
      return;
    }

    // Ambil rating semua produk sekaligus
    const ids = prods.map(p => p.id);
    const { data: reviews } = await supabaseClient
      .from('reviews')
      .select('product_id, rating')
      .in('product_id', ids);

    // Buat rating map: { product_id: { avg, count } }
    const ratingMap = {};
    (reviews || []).forEach(r => {
      if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
      ratingMap[r.product_id].sum += r.rating;
      ratingMap[r.product_id].count += 1;
    });
    Object.keys(ratingMap).forEach(id => {
      const d = ratingMap[id];
      ratingMap[id].avg = d.sum / d.count;
    });

    const getImg = p =>
      p.product_images?.find(i => i.is_primary)?.image_url ||
      p.product_images?.[0]?.image_url || '';

    track.innerHTML = prods.map(p => buildCard(p, getImg(p), ratingMap)).join('');

  } catch (err) {
    console.error('loadProducts error:', err);
    track.innerHTML = '<div class="carousel-empty">Gagal memuat produk.</div>';
  }
}

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

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initHeroSlider();
  initCarouselArrows();
  initSearch();
  loadProducts();
});