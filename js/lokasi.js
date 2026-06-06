/* ============================================================
   CHStore — lokasi.js
   Halaman lokasi toko. Bergantung pada supabase.js
   ============================================================ */
'use strict';

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

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initSearch();
});