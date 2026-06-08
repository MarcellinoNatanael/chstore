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

/* ── Hero Slider ──────────────────────────────────────────── */
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

/* ── Promo Slider — fade opacity (bukan translateX) ───────── */
function initPromoSlider() {
  const slides = document.querySelectorAll('.promo-slide-item');
  const dots   = document.querySelectorAll('#promoDots .promo-dot');
  if (!slides.length) return;

  let cur = 0;

  /* Set slide pertama active */
  slides[0].classList.add('active');
  if (dots[0]) dots[0].classList.add('active');

  function goTo(n) {
    slides[cur].classList.remove('active');
    if (dots[cur]) dots[cur].classList.remove('active');
    cur = ((n % slides.length) + slides.length) % slides.length;
    slides[cur].classList.add('active');
    if (dots[cur]) dots[cur].classList.add('active');
  }

  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

  let timer = setInterval(() => goTo(cur + 1), 6000);

  const banner = document.querySelector('.promo-banner');
  if (banner) {
    banner.addEventListener('mouseenter', () => clearInterval(timer));
    banner.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(cur + 1), 6000); });
    /* Swipe support */
    let tx = 0;
    banner.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    banner.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 48) goTo(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
}

/* ── Carousel Arrows ──────────────────────────────────────── */
function initCarouselArrows() {
  const pairs = [
    { prev: 'carouselPrev',         next: 'carouselNext',         track: 'productCarousel' },
    { prev: 'carouselPrevTerlaris', next: 'carouselNextTerlaris', track: 'carouselTerlaris' },
    { prev: 'carouselPrevUnggulan', next: 'carouselNextUnggulan', track: 'carouselUnggulan' },
  ];
  pairs.forEach(({ prev, next, track }) => {
    const t = document.getElementById(track);
    if (!t) return;
    document.getElementById(prev)?.addEventListener('click', () => t.scrollBy({ left: -216, behavior: 'smooth' }));
    document.getElementById(next)?.addEventListener('click', () => t.scrollBy({ left: 216, behavior: 'smooth' }));
  });
}

/* ── Filter Dropdown ──────────────────────────────────────── */
function initFilterDropdown() {
  const btn      = document.getElementById('filterToggleBtn');
  const dropdown = document.getElementById('filterDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  dropdown.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const attr = chip.dataset.filterSort !== undefined ? 'data-filter-sort' : 'data-filter-cond';
      dropdown.querySelectorAll(`[${attr}]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  document.getElementById('filterResetBtn')?.addEventListener('click', () => {
    dropdown.querySelectorAll('[data-filter-sort]').forEach((c, i) => c.classList.toggle('active', i === 0));
    dropdown.querySelectorAll('[data-filter-cond]').forEach((c, i) => c.classList.toggle('active', i === 0));
    const min = document.getElementById('filterPriceMin');
    const max = document.getElementById('filterPriceMax');
    if (min) min.value = '';
    if (max) max.value = '';
  });

  document.getElementById('filterApplyBtn')?.addEventListener('click', () => {
    const sort = dropdown.querySelector('[data-filter-sort].active')?.dataset.filterSort || 'terbaru';
    const cond = dropdown.querySelector('[data-filter-cond].active')?.dataset.filterCond || 'semua';
    const min  = document.getElementById('filterPriceMin')?.value.replace(/\D/g, '') || '';
    const max  = document.getElementById('filterPriceMax')?.value.replace(/\D/g, '') || '';

    const params = new URLSearchParams();
    if (sort && sort !== 'terbaru') params.set('sort', sort);
    if (cond && cond !== 'semua')   params.set('condition', cond);
    if (min) params.set('price_min', min);
    if (max) params.set('price_max', max);

    window.location.href = `product.html${params.toString() ? '?' + params.toString() : ''}`;
  });

  ['filterPriceMin', 'filterPriceMax'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', function () {
      const raw = this.value.replace(/\D/g, '');
      this.value = raw ? Number(raw).toLocaleString('id-ID') : '';
    });
  });
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
function buildCard(product, imgUrl, ratingMap = {}, badgeType = '') {
  const img   = imgUrl || 'https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image';
  const price = (typeof formatRupiah === 'function')
    ? formatRupiah(product.price)
    : 'Rp\u00A0' + Number(product.price).toLocaleString('id-ID');
  const name  = (product.name || '').replace(/</g, '&lt;');
  const r     = ratingMap[product.id] || { avg: 0, count: 0 };
  const condMap = { baru: 'Baru', second: 'Second', baru_second: 'Baru/Second' };
  const condLabel = condMap[product.condition] || 'Baru';

  let badgeExtra = '';
  if (badgeType === 'terlaris') {
    badgeExtra = `<span class="product-badge-img badge-terlaris" style="left:auto;right:8px;top:8px;">🔥 Terlaris</span>`;
  } else if (badgeType === 'unggulan') {
    badgeExtra = `<span class="product-badge-img badge-unggulan" style="left:auto;right:8px;top:8px;">⭐ Unggulan</span>`;
  }

  return `
    <article class="product-card" role="listitem" tabindex="0"
      onclick="window.location.href='product-detail.html?id=${product.id}'"
      onkeydown="if(event.key==='Enter')window.location.href='product-detail.html?id=${product.id}'">
      <div class="product-img-area">
        <img src="${img}" alt="${name}" loading="lazy" width="200" height="160"
             onerror="this.src='https://placehold.co/280x280/f5f5f5/1d1d1f?text=No+Image'">
        <span class="product-badge-img">${condLabel}</span>
        ${badgeExtra}
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

/* ── Build Rating Map ───────────────────────────────────────── */
function buildRatingMap(reviews) {
  const map = {};
  (reviews || []).forEach(r => {
    if (!map[r.product_id]) map[r.product_id] = { sum: 0, count: 0, avg: 0 };
    map[r.product_id].sum   += r.rating;
    map[r.product_id].count += 1;
  });
  Object.keys(map).forEach(id => {
    map[id].avg = map[id].sum / map[id].count;
  });
  return map;
}

/* ── Load Products ──────────────────────────────────────────── */
async function loadProducts() {
  const track         = document.getElementById('productCarousel');
  const trackTerlaris = document.getElementById('carouselTerlaris');
  const trackUnggulan = document.getElementById('carouselUnggulan');
  if (!track) return;

  const skeleton = Array(4).fill('<div class="card-skeleton"></div>').join('');
  track.innerHTML = skeleton;
  if (trackTerlaris) trackTerlaris.innerHTML = skeleton;
  if (trackUnggulan) trackUnggulan.innerHTML = skeleton;

  try {
    const { data: prods, error } = await supabaseClient
      .from('products')
      .select('*, product_images(image_url, is_primary), categories(id, slug, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) throw error;

    const empty = '<div class="carousel-empty">Belum ada produk tersedia.</div>';
    if (!prods || !prods.length) {
      track.innerHTML = empty;
      if (trackTerlaris) trackTerlaris.innerHTML = empty;
      if (trackUnggulan) trackUnggulan.innerHTML = empty;
      return;
    }

    const ids = prods.map(p => p.id);
    const { data: reviews } = await supabaseClient
      .from('reviews')
      .select('product_id, rating')
      .in('product_id', ids);

    const ratingMap = buildRatingMap(reviews);

    const getImg = p =>
      p.product_images?.find(i => i.is_primary)?.image_url ||
      p.product_images?.[0]?.image_url || '';

    // ── Terbaru
    track.innerHTML = prods.slice(0, 12)
      .map(p => buildCard(p, getImg(p), ratingMap))
      .join('');

    // ── Terlaris
    const prodsWithReview = prods.filter(p => {
      const r = ratingMap[p.id];
      return r && r.count > 0;
    });

    if (trackTerlaris) {
      if (prodsWithReview.length === 0) {
        trackTerlaris.innerHTML = '<div class="carousel-empty">Belum ada produk dengan ulasan.</div>';
      } else {
        const terlaris = [...prodsWithReview]
          .sort((a, b) => {
            const ra = ratingMap[a.id];
            const rb = ratingMap[b.id];
            return (rb.count * rb.avg) - (ra.count * ra.avg);
          })
          .slice(0, 12);
        trackTerlaris.innerHTML = terlaris
          .map(p => buildCard(p, getImg(p), ratingMap, 'terlaris'))
          .join('');
      }
    }

    // ── Unggulan
    if (trackUnggulan) {
      if (prodsWithReview.length === 0) {
        trackUnggulan.innerHTML = '<div class="carousel-empty">Belum ada produk dengan ulasan.</div>';
      } else {
        const unggulan = [...prodsWithReview]
          .sort((a, b) => (ratingMap[b.id].avg) - (ratingMap[a.id].avg))
          .slice(0, 12);
        trackUnggulan.innerHTML = unggulan
          .map(p => buildCard(p, getImg(p), ratingMap, 'unggulan'))
          .join('');
      }
    }

  } catch (err) {
    console.error('loadProducts error:', err);
    const errMsg = '<div class="carousel-empty">Gagal memuat produk.</div>';
    track.innerHTML = errMsg;
    if (trackTerlaris) trackTerlaris.innerHTML = errMsg;
    if (trackUnggulan) trackUnggulan.innerHTML = errMsg;
  }
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

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initHeroSlider();
  initPromoSlider();
  initCarouselArrows();
  initFilterDropdown();
  initSearch();
  loadProducts();
});