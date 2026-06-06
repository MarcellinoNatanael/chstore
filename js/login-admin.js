/* ============================================================
   CHStore — login-admin.js
   Login admin. Bergantung pada supabase.js
   (supabaseClient, getCurrentUser, getCurrentProfile)
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

/* ── Alert ──────────────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById('alertError');
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    ${msg}`;
  el.classList.add('show');
}

function hideError() {
  document.getElementById('alertError').classList.remove('show');
}

/* ── Loading State ──────────────────────────────────────────── */
function setLoading(loading) {
  const btn = document.getElementById('loginBtn');
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `
      <span style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 0.7s linear infinite;"></span>
      <span>Memverifikasi...</span>`;
  } else {
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span id="loginBtnText">Masuk ke Dashboard</span>`;
  }
}

/* ── Toggle Password ────────────────────────────────────────── */
function initTogglePass() {
  const btn   = document.getElementById('togglePass');
  const input = document.getElementById('password');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type   = isPass ? 'text' : 'password';
    btn.setAttribute('aria-label', isPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    btn.querySelector('svg').innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

/* ── Ambil role langsung dari user metadata (fallback) ──────── */
async function getAdminRole(userId) {
  // Coba 1: dari tabel profiles
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.role) {
      console.log('Role dari profiles:', data.role);
      return data.role;
    }
  } catch (e) {
    console.warn('profiles query gagal:', e);
  }

  // Coba 2: dari user metadata (disimpan saat register)
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const metaRole = user?.user_metadata?.role || user?.raw_user_meta_data?.role;
    if (metaRole) {
      console.log('Role dari metadata:', metaRole);
      return metaRole;
    }
  } catch (e) {
    console.warn('metadata check gagal:', e);
  }

  return null;
}

/* ── Login ──────────────────────────────────────────────────── */
async function doLogin() {
  hideError();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Harap isi email dan kata sandi.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Format email tidak valid.');
    return;
  }

  setLoading(true);

  try {
    // 1. Sign in
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setLoading(false);
      showError('Email atau kata sandi salah.');
      return;
    }

    const userId = signInData?.user?.id;
    if (!userId) {
      setLoading(false);
      showError('Gagal mendapatkan data user. Coba lagi.');
      return;
    }

    // 2. Cek role — pakai fallback dua lapis
    const role = await getAdminRole(userId);
    console.log('Role akhir:', role);

    if (role !== 'admin') {
      await supabaseClient.auth.signOut();
      setLoading(false);
      showError(role
        ? 'Akun ini tidak memiliki akses admin.'
        : 'Profil admin tidak ditemukan. Pastikan akun sudah terdaftar dengan benar.');
      return;
    }

    // 3. Sukses
    setLoading(false);
    showToast('Berhasil masuk. Mengalihkan...', 'success');
    setTimeout(() => {
      window.location.href = 'index-admin.html';
    }, 800);

  } catch (err) {
    console.error('Login error:', err);
    setLoading(false);
    showError('Terjadi kesalahan. Coba lagi.');
  }
}

/* ── Auto redirect jika sudah login sebagai admin ───────────── */
async function checkExistingSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) return;

    const role = await getAdminRole(session.user.id);
    if (role === 'admin') {
      window.location.href = 'index-admin.html';
    }
  } catch (err) {
    console.warn('Session check:', err);
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  initTogglePass();

  document.getElementById('loginBtn').addEventListener('click', doLogin);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const active = document.activeElement?.tagName;
      if (active !== 'BUTTON' && active !== 'A') doLogin();
    }
  });

  ['email', 'password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', hideError);
  });
});