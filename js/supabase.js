// =============================================
// SUPABASE CONFIGURATION - CHStore
// =============================================
const SUPABASE_URL      = 'https://mtrjexkdryxhpaoujgsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cmpleGtkcnl4aHBhb3VqZ3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjAxMTksImV4cCI6MjA5NTU5NjExOX0.uuYHOALz58tW4tby5YVz45EEzA7eT1CgesGfxSBByQM';

// =============================================
// CUSTOM STORAGE — fallback jika localStorage
// diblokir oleh Edge Tracking Prevention
// =============================================
const _storage = (() => {
  try {
    localStorage.setItem('_sb_test', '1');
    localStorage.removeItem('_sb_test');
    return localStorage;
  } catch (_) {}
  try {
    sessionStorage.setItem('_sb_test', '1');
    sessionStorage.removeItem('_sb_test');
    return sessionStorage;
  } catch (_) {}
  const mem = {};
  return {
    getItem:    k => mem[k] ?? null,
    setItem:    (k, v) => { mem[k] = v; },
    removeItem: k => { delete mem[k]; },
  };
})();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:            _storage,
    storageKey:         'chstore-auth',
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    flowType:           'implicit',
  }
});

// =============================================
// AUTH HELPERS
// =============================================
async function getCurrentUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user || null;
  } catch (e) {
    console.error('getCurrentUser error:', e);
    return null;
  }
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    return data;
  } catch (e) {
    console.error('getCurrentProfile error:', e);
    return null;
  }
}

async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

// =============================================
// AUTH GUARDS
// =============================================

// Guard halaman ADMIN
async function requireAdminAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '../admin/login-admin.html';
    return null;
  }
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    await supabaseClient.auth.signOut();
    window.location.href = '../admin/login-admin.html';
    return null;
  }
  const nameEl   = document.getElementById('sidebarAdminName');
  const avatarEl = document.getElementById('sidebarAdminAvatar');
  const name = profile.full_name || profile.username || 'Admin';
  if (nameEl)   nameEl.textContent   = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  return profile;
}

// Guard halaman CUSTOMER
async function requireAuth(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  const profile = await getCurrentProfile();
  if (profile?.role === 'admin') {
    window.location.href = '../admin/index-admin.html';
    return null;
  }
  return user;
}

// Logout admin
async function adminLogout() {
  try { await supabaseClient.auth.signOut(); } catch (e) {}
  window.location.href = '../admin/login-admin.html';
}

// Logout customer
async function customerLogout(redirectTo = 'login.html') {
  try { await supabaseClient.auth.signOut(); } catch (e) {}
  window.location.href = redirectTo;
}

// =============================================
// FORMAT HELPERS
// =============================================
function formatRupiah(amount) {
  if (!amount && amount !== 0) return '-';
  return 'Rp\u00A0' + Number(amount).toLocaleString('id-ID');
}

function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// =============================================
// WHATSAPP HELPER
// =============================================
function openWhatsApp(phoneNumber, message = '') {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const wa = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, '_blank');
}

// =============================================
// PRODUCT HELPERS
// =============================================
async function getProducts(filters = {}) {
  let query = supabaseClient
    .from('products')
    .select('*, product_images(id,image_url,is_primary), product_variants(id,color_name,color_hex,stock,price_diff), categories(id,name,slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (filters.category_id) query = query.eq('category_id', filters.category_id);
  if (filters.search)      query = query.ilike('name', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) { console.error('getProducts error:', error); return []; }
  return data || [];
}

async function getProductById(id) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*, product_images(id,image_url,is_primary), product_variants(id,color_name,color_hex,stock,price_diff), product_specs(id,spec_key,spec_value), categories(id,name,slug), reviews(id,rating,comment,created_at,profiles(username,full_name,avatar_url))')
    .eq('id', id)
    .single();
  if (error) { console.error('getProductById error:', error); return null; }
  return data;
}

function getPrimaryImage(product) {
  const images = product.product_images || [];
  const primary = images.find(i => i.is_primary);
  return (primary || images[0])?.image_url || '';
}

// =============================================
// CATEGORIES
// =============================================
async function getCategories() {
  const { data, error } = await supabaseClient.from('categories').select('*').order('name');
  if (error) { console.error('getCategories error:', error); return []; }
  return data || [];
}

// =============================================
// WISHLIST HELPERS — tanpa login/user_id
// =============================================
async function toggleWishlist(productId) {
  try {
    const { data: existing } = await supabaseClient
      .from('wishlists')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      await supabaseClient.from('wishlists').delete().eq('id', existing.id);
      return false;
    } else {
      await supabaseClient.from('wishlists').insert({ product_id: productId });
      return true;
    }
  } catch (e) {
    console.error('toggleWishlist error:', e);
    return false;
  }
}

async function getWishlist() {
  const { data, error } = await supabaseClient
    .from('wishlists')
    .select('id, product_id, created_at, products(*, product_images(image_url,is_primary), categories(name,slug))')
    .order('created_at', { ascending: false });
  if (error) { console.error('getWishlist error:', error); return []; }
  return data || [];
}

async function isInWishlist(productId) {
  const { data } = await supabaseClient
    .from('wishlists')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle();
  return !!data;
}

// =============================================
// LOAD CATEGORIES INTO <select>
// =============================================
async function loadCategoriesSelect(selectId, selectedId = null) {
  const { data } = await supabaseClient.from('categories').select('*').order('name');
  const sel = document.getElementById(selectId);
  if (!sel || !data) return;
  sel.innerHTML = '<option value="">Pilih Kategori</option>' +
    data.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

// =============================================
// IMAGE UPLOAD (admin)
// =============================================
async function uploadImage(file, bucket = 'products') {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['jpg','jpeg','png','webp','gif'].includes(ext)) {
    showToast('Format tidak didukung. Gunakan JPG, PNG, atau WEBP.', 'error'); return null;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran file maksimal 5MB.', 'error'); return null;
  }
  const filename = `${Date.now()}_${Math.random().toString(36).substr(2,9)}.${ext}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(filename, file, { cacheControl: '3600', upsert: false });
  if (error) { console.error('Upload error:', error); showToast('Gagal upload: ' + error.message, 'error'); return null; }
  const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(filename);
  return urlData.publicUrl;
}

// =============================================
// DEBOUNCE
// =============================================
function debounce(fn, delay = 400) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// =============================================
// TOAST (admin fallback — customer punya sendiri)
// =============================================
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', default: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconClass = icons[type] || icons.default;
  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}