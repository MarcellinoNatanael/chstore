/* ============================================================
   CHStore — settings-admin.js
   ============================================================ */
'use strict';

let currentUser    = null;
let currentProfile = null;
let otpVerified    = false;

/* ── Helpers ────────────────────────────────────────────────── */
function showToast(msg, type = 'default', ms = 3000) {
  const box = document.getElementById('toastContainer'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, ms);
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ── Auth Guard ─────────────────────────────────────────────── */
async function requireAdmin() {
  try {
    currentUser = await getCurrentUser();
    if (!currentUser) { window.location.href = 'login-admin.html'; return false; }
    currentProfile = await getCurrentProfile();
    if (currentProfile?.role !== 'admin') {
      await supabaseClient.auth.signOut();
      window.location.href = 'login-admin.html';
      return false;
    }
    const name = currentProfile.full_name || currentProfile.username || currentUser.email?.split('@')[0] || 'Admin';
    const n = document.getElementById('sidebarName'), a = document.getElementById('sidebarAvatar');
    if (n) n.textContent = name;
    if (a) a.textContent = name.charAt(0).toUpperCase();
    return true;
  } catch { window.location.href = 'login-admin.html'; return false; }
}

/* ── Sidebar ────────────────────────────────────────────────── */
function initSidebar() {
  const t = document.getElementById('sidebarToggle'), s = document.getElementById('sidebar');
  if (!t || !s) return;
  t.addEventListener('click', () => s.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (s.classList.contains('open') && !s.contains(e.target) && !t.contains(e.target)) s.classList.remove('open');
  });
}

/* ── Load Profile ───────────────────────────────────────────── */
function loadProfile() {
  const name = currentProfile?.full_name || currentProfile?.username || currentUser?.email?.split('@')[0] || 'Admin';
  const avatarEl = document.getElementById('profileAvatarLg');
  const nameEl   = document.getElementById('profileNameLg');
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = name;

  const usernameEl = document.getElementById('profileUsername');
  const emailEl    = document.getElementById('profileEmail');
  const fullnameEl = document.getElementById('profileFullname');
  if (usernameEl) usernameEl.value = currentProfile?.username || '—';
  if (emailEl)    emailEl.value    = currentUser?.email || '—';
  if (fullnameEl) fullnameEl.value = currentProfile?.full_name || '';
}

/* ── Save Profile ───────────────────────────────────────────── */
async function saveProfile() {
  const fullname = document.getElementById('profileFullname').value.trim();
  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  const { error } = await supabaseClient
    .from('profiles')
    .update({ full_name: fullname })
    .eq('id', currentUser.id);

  btn.disabled = false; btn.textContent = 'Simpan Profil';
  if (error) { showToast('Gagal menyimpan: ' + error.message, 'error'); return; }

  currentProfile.full_name = fullname;
  const name = fullname || currentProfile.username || 'Admin';
  document.getElementById('profileAvatarLg').textContent = name.charAt(0).toUpperCase();
  document.getElementById('profileNameLg').textContent   = name;
  document.getElementById('sidebarName').textContent     = name;
  document.getElementById('sidebarAvatar').textContent   = name.charAt(0).toUpperCase();
  showToast('Profil berhasil disimpan ✅', 'success');
}

/* ── Password — Verifikasi Password Lama ────────────────────── */
async function verifyCurrentPassword() {
  const currentPw = document.getElementById('currentPwInput')?.value?.trim();
  if (!currentPw) { showToast('Masukkan kata sandi saat ini', 'error'); return; }

  const btn = document.getElementById('verifyCurrentPwBtn');
  btn.disabled = true; btn.textContent = 'Memverifikasi...';

  const { error } = await supabaseClient.auth.signInWithPassword({
    email:    currentUser.email,
    password: currentPw,
  });

  btn.disabled = false; btn.textContent = 'Verifikasi';

  if (error) { showToast('Kata sandi salah', 'error'); return; }

  otpVerified = true;
  document.getElementById('pwStep1').style.display = 'none';
  document.getElementById('pwStep3').style.display = 'block';
  showToast('Verifikasi berhasil ✅', 'success');
}

/* ── Password — Reset form ke Step 1 ───────────────────────── */
function resetPasswordForm() {
  otpVerified = false;
  document.getElementById('newPw1').value = '';
  document.getElementById('newPw2').value = '';
  const inp = document.getElementById('currentPwInput');
  if (inp) inp.value = '';
  document.getElementById('pwStep3').style.display = 'none';
  document.getElementById('pwStep1').style.display = 'block';
}

/* ── Password — Simpan Password Baru ───────────────────────── */
async function changePassword() {
  if (!otpVerified) { showToast('Verifikasi kata sandi lama terlebih dahulu', 'error'); return; }
  const pw1 = document.getElementById('newPw1').value;
  const pw2 = document.getElementById('newPw2').value;
  if (!pw1 || pw1.length < 8) { showToast('Kata sandi minimal 8 karakter', 'error'); return; }
  if (pw1 !== pw2) { showToast('Konfirmasi kata sandi tidak cocok', 'error'); return; }

  const btn = document.getElementById('changePwBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  const { error } = await supabaseClient.auth.updateUser({ password: pw1 });
  btn.disabled = false; btn.textContent = 'Simpan Kata Sandi Baru';

  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }

  showToast('Kata sandi berhasil diubah ✅', 'success');
  resetPasswordForm();
}

/* ── Toggle Show/Hide Password ──────────────────────────────── */
function togglePw(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const isHidden = el.type === 'password';
  el.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

/* ── Store Info ─────────────────────────────────────────────── */
async function loadStoreInfo() {
  const { data } = await supabaseClient
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (!data) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('storeAddress', data.address);
  set('storeHours',   data.hours);
  set('storeWA',      data.whatsapp);
  set('storeEmail',   data.email);
}

async function saveStoreInfo() {
  const btn = document.getElementById('saveStoreBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  const payload = {
    id:         1,
    address:    document.getElementById('storeAddress').value.trim(),
    hours:      document.getElementById('storeHours').value.trim(),
    whatsapp:   document.getElementById('storeWA').value.trim(),
    email:      document.getElementById('storeEmail').value.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from('store_settings')
    .upsert(payload, { onConflict: 'id' });

  btn.disabled = false; btn.textContent = 'Simpan Info Toko';
  if (error) { showToast('Gagal menyimpan: ' + error.message, 'error'); return; }
  showToast('Info toko berhasil disimpan ✅', 'success');
}

/* ── Login History ──────────────────────────────────────────── */
async function loadLoginHistory() {
  const el = document.getElementById('loginHistoryList');
  if (!el) return;

  const { data, error } = await supabaseClient
    .from('login_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('login_history fetch error:', error.message);
  }

  if (error || !data?.length) {
    el.innerHTML = `
      <div class="login-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <p>Belum ada riwayat login</p>
      </div>`;
    return;
  }

  el.innerHTML = data.map(log => {
    const isSuccess = log.status === 'success';
    const iconCls   = isSuccess ? 'login-icon-ok' : 'login-icon-danger';
    const badgeCls  = isSuccess ? 'login-status-success' : 'login-status-failed';
    const badgeTxt  = isSuccess ? 'Berhasil' : 'Gagal';
    const iconSvg   = isSuccess
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    const device = log.user_agent
      ? (log.user_agent.includes('Mobile') ? '📱 Mobile' : '🖥️ Desktop')
      : '—';

    return `
      <div class="login-history-item">
        <div class="login-history-icon ${iconCls}">${iconSvg}</div>
        <div class="login-history-info">
          <div class="login-history-user">${escHtml(log.email || 'Unknown')}</div>
          <div class="login-history-meta">
            <span class="login-history-time">${fmtDateTime(log.created_at)}</span>
            ${log.ip_address ? `<span class="login-history-ip">${escHtml(log.ip_address)}</span>` : ''}
            <span class="login-history-device">${device}</span>
          </div>
        </div>
        <span class="login-status-badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
  }).join('');
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin(); if (!ok) return;

  initSidebar();
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut(); window.location.href = 'login-admin.html';
  });

  loadProfile();

  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
  document.getElementById('verifyCurrentPwBtn')?.addEventListener('click', verifyCurrentPassword);
  document.getElementById('changePwBtn')?.addEventListener('click', changePassword);
  document.getElementById('cancelChangePwBtn')?.addEventListener('click', resetPasswordForm);
  document.getElementById('saveStoreBtn')?.addEventListener('click', saveStoreInfo);

  await Promise.all([loadStoreInfo(), loadLoginHistory()]);
});