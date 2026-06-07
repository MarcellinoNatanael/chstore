/* ============================================================
   CHStore — add-product.js
   Handles both ADD (no ?edit=) and EDIT (?edit=productId) modes
   ============================================================ */
'use strict';

let editMode    = false;
let productId   = null;
let newImgFiles = [];
let existImgs   = [];
let varCount    = 0;
let specCount   = 0;

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function showToast(msg,type='default',ms=3000){
  const box=document.getElementById('toastContainer');if(!box)return;
  const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;
  box.appendChild(t);requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),320);},ms);
}

/* ── Auth ───────────────────────────────────────────────────── */
async function requireAdmin(){
  const{data:{session}}=await supabaseClient.auth.getSession();
  if(!session?.user){window.location.href='login-admin.html';return false;}
  let role=null;
  try{
    const{data}=await supabaseClient.from('profiles').select('role,full_name,username').eq('id',session.user.id).maybeSingle();
    role=data?.role;
    if(role==='admin'){
      const name=data.full_name||data.username||'Admin';
      const n=document.getElementById('sidebarName'),a=document.getElementById('sidebarAvatar');
      if(n)n.textContent=name;if(a)a.textContent=name.charAt(0).toUpperCase();
    }
  }catch(_){}
  if(!role)role=session.user.user_metadata?.role;
  if(role!=='admin'){await supabaseClient.auth.signOut();window.location.href='login-admin.html';return false;}
  return true;
}

/* ── Sidebar ────────────────────────────────────────────────── */
function initSidebar(){
  const t=document.getElementById('sidebarToggle'),s=document.getElementById('sidebar');
  if(!t||!s)return;
  t.addEventListener('click',()=>s.classList.toggle('open'));
  document.addEventListener('click',e=>{if(s.classList.contains('open')&&!s.contains(e.target)&&!t.contains(e.target))s.classList.remove('open');});
}

/* ── Toggle active hint ─────────────────────────────────────── */
function updateActiveHint(){
  const el=document.getElementById('activeHint');
  if(el)el.textContent=document.getElementById('productActive').checked?'Aktif — tampil di toko':'Nonaktif — tidak tampil di toko';
}

/* ── Categories ─────────────────────────────────────────────── */
async function loadCategories(selectedId=null){
  const{data}=await supabaseClient.from('categories').select('*').order('name');
  const sel=document.getElementById('productCategory');
  sel.innerHTML='<option value="">Pilih Kategori</option>'+(data||[]).map(c=>`<option value="${c.id}"${c.id===selectedId?' selected':''}>${escHtml(c.name)}</option>`).join('');
}

/* ── Images ─────────────────────────────────────────────────── */
function initImageUpload(){
  const dz=document.getElementById('imageDropzone'),inp=document.getElementById('imageInput');
  dz.addEventListener('click',()=>inp.click());
  inp.addEventListener('change',e=>handleNewFiles(e.target.files));
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-over');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-over');handleNewFiles(e.dataTransfer.files);});
}

function handleNewFiles(files){
  Array.from(files).forEach(file=>{
    if(!file.type.startsWith('image/'))return;
    const r=new FileReader();
    r.onload=e=>{newImgFiles.push({file,preview:e.target.result});renderNewImages();};
    r.readAsDataURL(file);
  });
}

function renderNewImages(){
  const grid=document.getElementById('newImagesGrid');
  grid.innerHTML=newImgFiles.map((img,i)=>`
    <div class="img-item">
      <img src="${img.preview}" alt="">
      <button type="button" class="img-item-remove" onclick="removeNewImg(${i})">✕</button>
      ${i===0&&!existImgs.length?'<div class="img-primary-badge">Utama</div>':''}
    </div>`).join('');
}
function removeNewImg(i){newImgFiles.splice(i,1);renderNewImages();}

function renderExistingImages(){
  const grid=document.getElementById('existingImagesGrid');
  if(!existImgs.length){grid.innerHTML='<p class="form-hint">Belum ada foto.</p>';return;}
  grid.innerHTML=existImgs.map((img,i)=>`
    <div class="img-item ${img.is_primary?'primary':''}" onclick="setExistPrimary(${i})" title="Klik untuk jadikan utama">
      <img src="${escHtml(img.image_url)}" alt="" onerror="this.src=''">
      <button type="button" class="img-item-remove" onclick="event.stopPropagation();removeExistImg('${img.id}')">✕</button>
      ${img.is_primary?'<div class="img-primary-badge">Utama</div>':''}
    </div>`).join('');
}

async function setExistPrimary(idx){
  existImgs.forEach((img,i)=>img.is_primary=i===idx);
  await supabaseClient.from('product_images').update({is_primary:false}).eq('product_id',productId);
  await supabaseClient.from('product_images').update({is_primary:true}).eq('id',existImgs[idx].id);
  renderExistingImages();
  showToast('Foto utama diperbarui','success');
}

async function removeExistImg(imgId){
  await supabaseClient.from('product_images').delete().eq('id',imgId);
  existImgs=existImgs.filter(i=>i.id!==imgId);
  renderExistingImages();
  showToast('Foto dihapus','success');
}

/* ── Variants ───────────────────────────────────────────────── */
function addVariant(data=null){
  const ph=document.querySelector('#variantsContainer>.form-hint');if(ph)ph.remove();
  const id=++varCount;
  const row=document.createElement('div');row.className='variant-row';row.id=`variant_${id}`;
  row.innerHTML=`
    <div class="color-picker-wrap"><input type="color" id="vColor_${id}" value="${data?.color_hex||'#1C1C1C'}"></div>
    <input class="form-input" type="text" id="vName_${id}" placeholder="Nama warna" value="${data?.color_name||''}" style="flex:1">
    <input class="form-input" type="number" id="vStock_${id}" placeholder="Stok" min="0" value="${data?.stock??0}" style="width:72px">
    <input class="form-input" type="number" id="vDiff_${id}" placeholder="±Harga" value="${data?.price_diff??0}" style="width:88px">
    <button type="button" class="btn-row-del" onclick="removeVariant(${id})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;
  document.getElementById('variantsContainer').appendChild(row);
}
function removeVariant(id){document.getElementById(`variant_${id}`)?.remove();}
function getVariants(){
  return Array.from(document.querySelectorAll('.variant-row')).map(row=>{
    const id=row.id.replace('variant_','');
    return{color_name:document.getElementById(`vName_${id}`)?.value?.trim()||'',color_hex:document.getElementById(`vColor_${id}`)?.value||'#000000',stock:parseInt(document.getElementById(`vStock_${id}`)?.value)||0,price_diff:parseInt(document.getElementById(`vDiff_${id}`)?.value)||0};
  }).filter(v=>v.color_name);
}

/* ── Specs ──────────────────────────────────────────────────── */
function addSpec(data=null){
  const ph=document.querySelector('#specsContainer>.form-hint');if(ph)ph.remove();
  const id=++specCount;
  const row=document.createElement('div');row.className='spec-row';row.id=`spec_${id}`;
  row.innerHTML=`
    <input class="form-input" type="text" id="sKey_${id}" placeholder="Spesifikasi (cth: Layar)" value="${data?.spec_key||''}" style="flex:1">
    <span class="spec-sep">:</span>
    <input class="form-input" type="text" id="sVal_${id}" placeholder="Nilai (cth: 6.7 inci)" value="${data?.spec_value||''}" style="flex:1">
    <button type="button" class="btn-row-del" onclick="removeSpec(${id})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;
  document.getElementById('specsContainer').appendChild(row);
}
function removeSpec(id){document.getElementById(`spec_${id}`)?.remove();}
function getSpecs(){
  return Array.from(document.querySelectorAll('.spec-row')).map(row=>{
    const id=row.id.replace('spec_','');
    return{spec_key:document.getElementById(`sKey_${id}`)?.value?.trim()||'',spec_value:document.getElementById(`sVal_${id}`)?.value?.trim()||''};
  }).filter(s=>s.spec_key&&s.spec_value);
}

/* ── Load Product (edit mode) ───────────────────────────────── */
async function loadProduct(){
  document.getElementById('loadingState').style.display='flex';
  document.getElementById('formContent').style.display='none';
  const{data,error}=await supabaseClient.from('products')
    .select('*,product_images(*),product_variants(*),product_specs(*),categories(id,name)')
    .eq('id',productId).single();
  if(error||!data){showToast('Produk tidak ditemukan','error');setTimeout(()=>window.location.href='product-admin.html',2000);return;}
  // Fill fields
  document.getElementById('productName').value=data.name||'';
  document.getElementById('productDesc').value=data.description||'';
  document.getElementById('productPrice').value=data.price||0;
  document.getElementById('productStock').value=data.stock||0;
  document.getElementById('productWA').value=data.whatsapp_number||'';
  document.getElementById('productActive').checked=data.is_active;
  updateActiveHint();
  const condEl=document.querySelector(`input[name="condition"][value="${data.condition||'baru'}"]`);
  if(condEl)condEl.checked=true;
  await loadCategories(data.category_id);
  // Images
  existImgs=data.product_images||[];
  if(existImgs.length){
    document.getElementById('existingImagesSection').style.display='block';
    renderExistingImages();
  }
  // Variants & Specs
  (data.product_variants||[]).forEach(v=>addVariant(v));
  (data.product_specs||[]).forEach(s=>addSpec(s));
  if(!data.product_specs?.length) addSpec();
  // UI update
  document.getElementById('pageTitle').textContent=`Edit Produk — CHStore Admin`;
  document.getElementById('topbarTitle').textContent='Edit Produk';
  document.getElementById('topbarSub').textContent=data.name;
  document.getElementById('saveBtnText').textContent='Simpan Perubahan';
  document.getElementById('dangerZone').style.display='block';
  document.getElementById('loadingState').style.display='none';
  document.getElementById('formContent').style.display='';
}

/* ── Save ───────────────────────────────────────────────────── */
function setSaveLoading(loading){
  const btn=document.getElementById('saveBtn');
  btn.disabled=loading;
  document.getElementById('saveBtnText').textContent=loading?'Menyimpan...':(editMode?'Simpan Perubahan':'Simpan Produk');
}

async function doSave(e){
  e.preventDefault();
  const name=document.getElementById('productName').value.trim();
  const price=parseInt(document.getElementById('productPrice').value);
  if(!name||!price){showToast('Lengkapi nama dan harga produk','error');return;}
  setSaveLoading(true);
  const hint=document.getElementById('saveHint');

  const payload={
    name,
    description:document.getElementById('productDesc').value.trim(),
    price,
    stock:parseInt(document.getElementById('productStock').value)||0,
    whatsapp_number:document.getElementById('productWA').value.trim()||null,
    category_id:document.getElementById('productCategory').value||null,
    is_active:document.getElementById('productActive').checked,
    condition:document.querySelector('input[name="condition"]:checked')?.value||'baru',
  };

  try{
    let pid=productId;
    if(editMode){
      const{error}=await supabaseClient.from('products').update(payload).eq('id',pid);
      if(error)throw error;
    }else{
      const{data,error}=await supabaseClient.from('products').insert(payload).select().single();
      if(error)throw error;
      pid=data.id;
    }

    // Upload new images
    if(newImgFiles.length){
      hint.textContent='Mengupload foto...';
      const inserts=[];
      for(let i=0;i<newImgFiles.length;i++){
        const url=await uploadImg(newImgFiles[i].file);
        if(url)inserts.push({product_id:pid,image_url:url,is_primary:i===0&&!existImgs.length});
      }
      if(inserts.length)await supabaseClient.from('product_images').insert(inserts);
    }

    // Variants — delete then re-insert
    await supabaseClient.from('product_variants').delete().eq('product_id',pid);
    const variants=getVariants();
    if(variants.length)await supabaseClient.from('product_variants').insert(variants.map(v=>({...v,product_id:pid})));

    // Specs — delete then re-insert
    await supabaseClient.from('product_specs').delete().eq('product_id',pid);
    const specs=getSpecs();
    if(specs.length)await supabaseClient.from('product_specs').insert(specs.map(s=>({...s,product_id:pid})));

    showToast(editMode?'Produk berhasil diperbarui ✅':'Produk berhasil ditambahkan ✅','success');
    setTimeout(()=>window.location.href='product-admin.html',1400);
  }catch(err){
    showToast('Gagal menyimpan: '+err.message,'error');
    setSaveLoading(false);
    hint.textContent='Semua field bertanda * wajib diisi';
  }
}

/* ── Upload Image ───────────────────────────────────────────── */
async function uploadImg(file){
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['jpg','jpeg','png','webp'].includes(ext)){showToast('Format tidak didukung','error');return null;}
  if(file.size>5*1024*1024){showToast('Ukuran maks 5MB','error');return null;}
  const filename=`${Date.now()}_${Math.random().toString(36).substr(2,8)}.${ext}`;
  const{error}=await supabaseClient.storage.from('products').upload(filename,file,{cacheControl:'3600',upsert:false});
  if(error){showToast('Upload gagal: '+error.message,'error');return null;}
  const{data}=supabaseClient.storage.from('products').getPublicUrl(filename);
  return data.publicUrl;
}

/* ── Delete ─────────────────────────────────────────────────── */
function initDeleteBtn(){
  const btn=document.getElementById('deleteBtn');
  if(!btn)return;
  btn.addEventListener('click',()=>{
    const modal=document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent='Hapus Produk';
    document.getElementById('confirmMessage').textContent='Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.';
    modal.style.display='flex';
    document.getElementById('cancelBtn').onclick=()=>modal.style.display='none';
    document.getElementById('confirmBtn').onclick=async()=>{
      modal.style.display='none';
      const{error}=await supabaseClient.from('products').delete().eq('id',productId);
      if(error){showToast('Gagal menghapus: '+error.message,'error');return;}
      showToast('Produk berhasil dihapus','success');
      setTimeout(()=>window.location.href='product-admin.html',1400);
    };
  });
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',async()=>{
  const ok=await requireAdmin();if(!ok)return;
  initSidebar();
  document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await supabaseClient.auth.signOut();window.location.href='login-admin.html';});
  document.getElementById('productActive').addEventListener('change',updateActiveHint);
  document.getElementById('productForm').addEventListener('submit',doSave);
  initImageUpload();
  initDeleteBtn();

  // Detect mode
  const params=new URLSearchParams(location.search);
  const editId=params.get('edit');
  if(editId){
    editMode=true;
    productId=editId;
    await loadProduct();
  }else{
    await loadCategories();
    addSpec(); // add one empty spec by default
  }
});