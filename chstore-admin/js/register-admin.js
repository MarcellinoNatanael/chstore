/* ============================================================
   CHStore — register-admin.js
   Registrasi admin. Bergantung pada supabase.js
   ============================================================ */
'use strict';

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

/* ── Alerts ─────────────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('alertError');
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg> ${msg}`;
  el.classList.add('show');
  document.getElementById('alertSuccess').classList.remove('show');
}

function showSuccess(msg) {
  const el = document.getElementById('alertSuccess');
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg> ${msg}`;
  el.classList.add('show');
  document.getElementById('alertError').classList.remove('show');
}

function hideAlerts() {
  document.getElementById('alertError').classList.remove('show');
  document.getElementById('alertSuccess').classList.remove('show');
}

/* ── Loading ─────────────────────────────────────────────────── */
function setLoading(loading) {
  const btn     = document.getElementById('registerBtn');
  const btnText = document.getElementById('registerBtnText');
  btn.disabled  = loading;
  if (loading) {
    btn.querySelector('svg').style.display = 'none';
    btnText.textContent = 'Membuat akun...';
  } else {
    btn.querySelector('svg').style.display = '';
    btnText.textContent = 'Buat Akun Admin';
  }
}

/* ── Toggle Password ────────────────────────────────────────── */
function initTogglePass() {
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input    = document.getElementById(targetId);
      const isPass   = input.type === 'password';
      input.type     = isPass ? 'text' : 'password';
      btn.setAttribute('aria-label', isPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      btn.querySelector('svg').innerHTML = isPass
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    });
  });
}

/* ── Password Strength ──────────────────────────────────────── */
function initPasswordStrength() {
  const input = document.getElementById('password');
  const wrap  = document.getElementById('passStrength');
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');

  input.addEventListener('input', () => {
    const val = input.value;
    if (!val) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';

    let score = 0;
    if (val.length >= 8)           score++;
    if (val.length >= 12)          score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;

    const levels = [
      { pct: '20%', txt: 'Lemah',      color: '#EF4444' },
      { pct: '40%', txt: 'Cukup',      color: '#F97316' },
      { pct: '60%', txt: 'Baik',       color: '#EAB308' },
      { pct: '80%', txt: 'Kuat',       color: '#22C55E' },
      { pct:'100%', txt: 'Sangat kuat',color: '#16A34A' },
    ];
    const lvl = levels[Math.min(score, levels.length) - 1] || levels[0];
    fill.style.width      = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent     = lvl.txt;
    label.style.color     = lvl.color;
  });
}

/* ── Validasi ───────────────────────────────────────────────── */
function validate() {
  const fullName        = document.getElementById('fullName').value.trim();
  const username        = document.getElementById('username').value.trim();
  const email           = document.getElementById('email').value.trim();
  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName || !username || !email || !password) {
    showError('Harap isi semua field yang wajib diisi.'); return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Format email tidak valid.'); return false;
  }
  if (username.length < 3) {
    showError('Username minimal 3 karakter.'); return false;
  }
  if (/\s/.test(username)) {
    showError('Username tidak boleh mengandung spasi.'); return false;
  }
  if (password.length < 8) {
    showError('Kata sandi minimal 8 karakter.'); return false;
  }
  if (password !== confirmPassword) {
    showError('Kata sandi dan konfirmasi tidak cocok.'); return false;
  }
  return true;
}

/* ── Register ───────────────────────────────────────────────── */
async function doRegister() {
  hideAlerts();
  if (!validate()) return;

  const fullName = document.getElementById('fullName').value.trim();
  const username = document.getElementById('username').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  setLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username, role: 'admin' }
      }
    });

    if (error) throw error;

    // Langsung sign out — jangan biarkan auto-login setelah register
    await supabaseClient.auth.signOut();

    if (!data.user) {
      // Email confirmation required
      showSuccess('Cek email kamu untuk konfirmasi akun sebelum bisa login.');
      setLoading(false);
      return;
    }

    showSuccess('Akun admin berhasil dibuat! Silakan login untuk melanjutkan.');
    showToast('Akun berhasil dibuat!', 'success');
    setTimeout(() => window.location.href = 'login-admin.html', 2200);

  } catch (err) {
    console.error('Register error:', err);
    // Pastikan logout jika error setelah signup
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    const msg = err.message?.includes('already registered')
      ? 'Email sudah terdaftar. Gunakan email lain atau masuk.'
      : err.message || 'Terjadi kesalahan. Coba lagi.';
    showError(msg);
    setLoading(false);
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTogglePass();
  initPasswordStrength();

  document.getElementById('registerBtn').addEventListener('click', doRegister);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const tag = document.activeElement?.tagName;
      if (tag !== 'BUTTON' && tag !== 'A') doRegister();
    }
  });

  // Clear alert saat mengetik
  ['fullName', 'username', 'email', 'password', 'confirmPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', hideAlerts);
  });
});