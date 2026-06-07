/* ============================================================
   CHStore — lokasi.js
   ============================================================ */
'use strict';

function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
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

async function loadStoreInfo() {
  try {
    const { data } = await supabaseClient
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!data) return;

    // Alamat
    const addressEl = document.getElementById('lokasiAddress');
    if (addressEl && data.address) {
      addressEl.innerHTML = data.address.replace(/\n/g, '<br>');
    }

    // Jam operasional
    const hoursEl = document.getElementById('lokasiHours');
    if (hoursEl && data.hours) {
      hoursEl.innerHTML = data.hours.replace(/\n/g, '<br>');
    }

    // WhatsApp — format nomor untuk tampilan
    if (data.whatsapp) {
      const raw = data.whatsapp.replace(/\D/g, '');
      const waUrl = `https://wa.me/${raw}`;

      // Update card link
      const waCard = document.getElementById('lokasiWACard');
      if (waCard) waCard.href = waUrl;

      // Update display text
      const waDisplay = document.getElementById('lokasiWADisplay');
      if (waDisplay) {
        // Format: 6281234567890 → +62 812-3456-7890
        const formatted = '+' + raw.replace(/(\d{2})(\d{3})(\d{4})(\d+)/, '$1 $2-$3-$4');
        waDisplay.textContent = formatted;
      }

      // Update tombol Chat WhatsApp
      const waBtn = document.getElementById('lokasiWABtn');
      if (waBtn) waBtn.href = waUrl;
    }

    // Email
    const emailEl = document.getElementById('lokasiEmailLink');
    if (emailEl && data.email) {
      emailEl.href = `mailto:${data.email}`;
      emailEl.textContent = data.email;
    }

  } catch (err) {
    console.error('loadStoreInfo error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initSearch();
  loadStoreInfo();
});