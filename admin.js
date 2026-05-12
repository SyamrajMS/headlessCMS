// ── State ──
let CFG = {}; // { owner, repo, pat }
let siteData = null, footerData = null, productsData = null;
let isDirty = false;
let pendingImgBase64 = null; // base64 string for new upload
let pendingImgName   = null; // filename

// ── Auth helpers ──
function doSetup() {
  const owner    = v('setup-owner').trim();
  const repo     = v('setup-repo').trim();
  const pat      = v('setup-pat').trim();
  const password = v('setup-password').trim();
  if (!owner || !repo || !pat || !password) return toast('All fields are required', 'error');
  localStorage.setItem('cms_owner', owner);
  localStorage.setItem('cms_repo',  repo);
  localStorage.setItem('cms_pat',   pat);
  localStorage.setItem('cms_pw',    btoa(password)); // simple obfuscation
  CFG = { owner, repo, pat };
  enterApp();
}

function doLogin() {
  const pw = v('login-password');
  if (btoa(pw) !== localStorage.getItem('cms_pw')) return toast('Wrong password', 'error');
  CFG = { owner: localStorage.getItem('cms_owner'), repo: localStorage.getItem('cms_repo'), pat: localStorage.getItem('cms_pat') };
  enterApp();
}

function doLogout() { hide('app'); show('auth-screen'); id('login-password').value = ''; id('auth-setup').style.display='none'; id('auth-login').style.display='block'; }

function resetSetup() {
  ['cms_owner','cms_repo','cms_pat','cms_pw'].forEach(k => localStorage.removeItem(k));
  id('auth-setup').style.display='block'; id('auth-login').style.display='none';
}

// ── Boot ──
window.addEventListener('load', () => {
  const hasSetup = localStorage.getItem('cms_pat');
  if (hasSetup) {
    id('auth-setup').style.display = 'none';
    id('auth-login').style.display = 'block';
  }
});

async function enterApp() {
  hide('auth-screen'); show('app');
  id('sb-repo-info').textContent = `${localStorage.getItem('cms_owner')}/${localStorage.getItem('cms_repo')}`;
  id('stat-repo').textContent = localStorage.getItem('cms_repo');
  await loadAllContent();
}

// ── GitHub API ──
function rawUrl(path) { return `https://raw.githubusercontent.com/${CFG.owner}/${CFG.repo}/main/${path}?t=${Date.now()}`; }
function apiUrl(path) { return `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${path}`; }
const headers = () => ({ 'Authorization': `Bearer ${CFG.pat}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' });

async function ghGet(path) {
  const r = await fetch(apiUrl(path), { headers: headers() });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  return r.json();
}

async function ghPut(path, content, message) {
  // Fetch current file SHA — needed by GitHub API to update existing files
  let sha;
  const getResp = await fetch(apiUrl(path), { headers: headers() });
  if (getResp.ok) {
    const meta = await getResp.json();
    sha = meta.sha; // file exists — use its SHA
  } else if (getResp.status === 404) {
    sha = undefined; // file doesn't exist yet — create it (no SHA needed)
  } else {
    // Any other status (401, 403, etc.) is a real error — surface it
    const err = await getResp.json().catch(() => ({}));
    throw new Error(`Could not read ${path}: ${err.message || getResp.status}`);
  }
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha ? { sha } : {}),
  };
  const r = await fetch(apiUrl(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) { const err = await r.json(); throw new Error(err.message || r.status); }
  return r.json();
}

async function ghPutBinary(path, base64Content, message) {
  let sha;
  try { const meta = await ghGet(path); sha = meta.sha; } catch(_) {}
  const body = { message, content: base64Content, ...(sha ? { sha } : {}) };
  const r = await fetch(apiUrl(path), { method:'PUT', headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) { const err = await r.json(); throw new Error(err.message || r.status); }
  return r.json();
}

// ── Load content ──
async function loadAllContent() {
  try {
    const [s, f, p] = await Promise.all([
      fetch(rawUrl('content/site.json')).then(r=>r.json()),
      fetch(rawUrl('content/footer.json')).then(r=>r.json()),
      fetch(rawUrl('content/products.json')).then(r=>r.json()),
    ]);
    siteData     = s;
    footerData   = f;
    productsData = p;
    populateSiteForm(s);
    populateFooterForm(f);
    populateProductsTable();
    updateDashboardStats();
  } catch(e) { toast('Failed to load content from GitHub: ' + e.message, 'error'); }
}

// ── Site form ──
function populateSiteForm(s) {
  sv('s-name', s.restaurantName);
  sv('s-logo', s.logoText || '');
  sv('s-tagline', s.tagline);
  sv('s-hero-headline', s.hero.headline);
  sv('s-hero-sub', s.hero.subtext);
  sv('s-hero-cta-label', s.hero.ctaLabel);
  sv('s-hero-cta-link', s.hero.ctaLink);
  sv('s-about-heading', s.about.heading);
  sv('s-about-body', s.about.body);
  renderNavLinksEditor(s.navLinks);
  renderHighlightsEditor(s.about.highlights);
}

function renderNavLinksEditor(links) {
  id('nav-links-editor').innerHTML = links.map((l,i) => `
    <div class="nav-link-row">
      <input type="text" value="${l.label}" placeholder="Label" oninput="updateNavLink(${i},'label',this.value)" />
      <input type="text" value="${l.href}"  placeholder="Link (#menu)" oninput="updateNavLink(${i},'href',this.value)" style="max-width:160px"/>
      <button class="btn btn-danger btn-sm" onclick="removeNavLink(${i})">✕</button>
    </div>`).join('');
}
function updateNavLink(i,k,val){siteData.navLinks[i][k]=val;markDirty();}
function removeNavLink(i){siteData.navLinks.splice(i,1);renderNavLinksEditor(siteData.navLinks);markDirty();}
function addNavLink(){siteData.navLinks.push({label:'New',href:'#'});renderNavLinksEditor(siteData.navLinks);markDirty();}

function renderHighlightsEditor(h) {
  id('highlights-editor').innerHTML = (h||[]).map((hl,i)=>`
    <div class="nav-link-row">
      <input type="text" value="${hl.value}" placeholder="Value (e.g. 9+)" oninput="updateHighlight(${i},'value',this.value)"/>
      <input type="text" value="${hl.label}" placeholder="Label (e.g. Years)" oninput="updateHighlight(${i},'label',this.value)"/>
      <button class="btn btn-danger btn-sm" onclick="removeHighlight(${i})">✕</button>
    </div>`).join('');
}
function updateHighlight(i,k,val){siteData.about.highlights[i][k]=val;markDirty();}
function removeHighlight(i){siteData.about.highlights.splice(i,1);renderHighlightsEditor(siteData.about.highlights);markDirty();}
function addHighlight(){if(!siteData.about.highlights)siteData.about.highlights=[];siteData.about.highlights.push({value:'',label:''});renderHighlightsEditor(siteData.about.highlights);markDirty();}

function readSiteForm() {
  siteData.restaurantName  = v('s-name');
  siteData.logoText        = v('s-logo');
  siteData.tagline         = v('s-tagline');
  siteData.hero.headline   = v('s-hero-headline');
  siteData.hero.subtext    = v('s-hero-sub');
  siteData.hero.ctaLabel   = v('s-hero-cta-label');
  siteData.hero.ctaLink    = v('s-hero-cta-link');
  siteData.about.heading   = v('s-about-heading');
  siteData.about.body      = v('s-about-body');
}

// ── Footer form ──
function populateFooterForm(f) {
  sv('f-address',   f.address);
  sv('f-phone',     f.phone);
  sv('f-email',     f.email);
  sv('f-copyright', f.copyright);
  renderHoursEditor(f.openingHours);
  renderSocialEditor(f.socialLinks);
}
function renderHoursEditor(hours) {
  id('hours-editor').innerHTML = (hours||[]).map((h,i)=>`
    <div class="nav-link-row">
      <input type="text" value="${h.days}" placeholder="Days (e.g. Mon–Fri)" oninput="footerData.openingHours[${i}].days=this.value;markDirty()"/>
      <input type="text" value="${h.hours}" placeholder="Hours (e.g. 11am–10pm)" oninput="footerData.openingHours[${i}].hours=this.value;markDirty()"/>
      <button class="btn btn-danger btn-sm" onclick="removeHours(${i})">✕</button>
    </div>`).join('');
}
function removeHours(i){footerData.openingHours.splice(i,1);renderHoursEditor(footerData.openingHours);markDirty();}
function addHoursRow(){footerData.openingHours.push({days:'',hours:''});renderHoursEditor(footerData.openingHours);markDirty();}

function renderSocialEditor(links) {
  id('social-editor').innerHTML = (links||[]).map((s,i)=>`
    <div class="nav-link-row">
      <input type="text" value="${s.platform}" placeholder="Platform" oninput="footerData.socialLinks[${i}].platform=this.value;footerData.socialLinks[${i}].icon=this.value.toLowerCase();markDirty()"/>
      <input type="text" value="${s.url}" placeholder="URL" oninput="footerData.socialLinks[${i}].url=this.value;markDirty()"/>
      <button class="btn btn-danger btn-sm" onclick="removeSocial(${i})">✕</button>
    </div>`).join('');
}
function removeSocial(i){footerData.socialLinks.splice(i,1);renderSocialEditor(footerData.socialLinks);markDirty();}
function addSocialRow(){footerData.socialLinks.push({platform:'',icon:'',url:''});renderSocialEditor(footerData.socialLinks);markDirty();}

function readFooterForm() {
  footerData.address   = v('f-address');
  footerData.phone     = v('f-phone');
  footerData.email     = v('f-email');
  footerData.copyright = v('f-copyright');
}

// ── Products table ──
function populateProductsTable() {
  const cats = productsData.categories.filter(c=>c!=='All');
  sv('p-categories', productsData.categories.join(', '));
  id('product-count').textContent = productsData.items.length;
  id('stat-products').textContent = productsData.items.length;
  id('stat-cats').textContent = cats.length;
  const EMOJI = {Starters:'🥗',Mains:'🍖',Pasta:'🍝',Desserts:'🍮',Drinks:'🥂'};
  const rawBase = `https://raw.githubusercontent.com/${CFG.owner}/${CFG.repo}/main`;
  id('products-tbody').innerHTML = productsData.items.map((p,i)=>{
    const imgEl = p.image
      ? `<img class="product-img-thumb" src="${p.image.startsWith('images/') ? rawBase+'/'+p.image : p.image}" alt="${p.name}" style="width:48px;height:48px;border-radius:8px;object-fit:cover"/>`
      : `<div class="product-img-thumb" style="width:48px;height:48px;border-radius:8px;background:var(--surface2);display:grid;place-items:center;font-size:1.4rem">${EMOJI[p.category]||'🍽️'}</div>`;
    const badge = p.badge ? `<span class="badge">${p.badge}</span>` : '<span style="color:var(--dim);font-size:.78rem">—</span>';
    return `<tr>
      <td>${imgEl}</td>
      <td style="font-weight:500;max-width:200px">${p.name}</td>
      <td style="color:var(--muted)">${p.category}</td>
      <td style="color:var(--gold);font-weight:600">$${p.price}</td>
      <td>${badge}</td>
      <td><div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="openProductModal(${i})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${i})">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ── Product modal ──
let editingIndex = -1;
function openProductModal(idx = -1) {
  editingIndex = idx;
  pendingImgBase64 = null; pendingImgName = null;
  id('modal-title').textContent = idx === -1 ? 'Add Menu Item' : 'Edit Menu Item';
  id('m-img-file').value = '';
  id('m-img-preview').style.display = 'none';
  id('upload-hint').style.display = 'block';
  // populate category dropdown
  const cats = productsData.categories.filter(c=>c!=='All');
  id('m-category').innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  if (idx === -1) {
    sv('m-id', 'p' + Date.now());
    sv('m-name',''); sv('m-desc',''); sv('m-price',''); sv('m-badge',''); sv('m-img-url','');
  } else {
    const p = productsData.items[idx];
    sv('m-id',   p.id);
    sv('m-name', p.name);
    sv('m-desc', p.description);
    sv('m-price',p.price);
    sv('m-badge',p.badge || '');
    sv('m-img-url', p.image && !p.image.startsWith('images/') ? p.image : '');
    id('m-category').value = p.category;
    if (p.image && p.image.startsWith('images/')) {
      const rawBase = `https://raw.githubusercontent.com/${CFG.owner}/${CFG.repo}/main`;
      id('m-img-preview').src = rawBase + '/' + p.image;
      id('m-img-preview').style.display = 'block';
      id('upload-hint').style.display = 'none';
    }
  }
  show('modal-overlay');
}

function closeModal() { hide('modal-overlay'); }

function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('Image too large (max 5MB)', 'error');
  pendingImgName = `images/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    pendingImgBase64 = dataUrl.split(',')[1]; // raw base64
    id('m-img-preview').src = dataUrl;
    id('m-img-preview').style.display = 'block';
    id('upload-hint').style.display = 'none';
    id('m-img-url').value = '';
  };
  reader.readAsDataURL(file);
}

function handleImgUrl(val) {
  if (val) { pendingImgBase64 = null; pendingImgName = null; id('m-img-preview').src=val; id('m-img-preview').style.display='block'; id('upload-hint').style.display='none'; }
}

async function saveProduct() {
  const item = {
    id:          v('m-id'),
    name:        v('m-name').trim(),
    description: v('m-desc').trim(),
    price:       parseFloat(v('m-price')).toFixed(2),
    category:    id('m-category').value,
    badge:       v('m-badge').trim(),
    image:       v('m-img-url').trim() || (editingIndex>=0 ? productsData.items[editingIndex].image : ''),
  };
  if (!item.name) return toast('Product name is required', 'error');

  // Upload image if pending
  if (pendingImgBase64 && pendingImgName) {
    try {
      toast('Uploading image…', 'success');
      await ghPutBinary(pendingImgName, pendingImgBase64, `Upload image: ${pendingImgName}`);
      item.image = pendingImgName;
    } catch(e) { return toast('Image upload failed: ' + e.message, 'error'); }
  }

  if (editingIndex === -1) {
    productsData.items.push(item);
  } else {
    productsData.items[editingIndex] = item;
  }
  closeModal();
  populateProductsTable();
  markDirty();
  toast('Item saved — click Publish to go live', 'success');
}

function deleteProduct(i) {
  if (!confirm(`Delete "${productsData.items[i].name}"?`)) return;
  productsData.items.splice(i, 1);
  populateProductsTable();
  markDirty();
}

// ── Publish ──
async function publishAll() {
  readSiteForm();
  readFooterForm();
  productsData.categories = v('p-categories').split(',').map(c=>c.trim()).filter(Boolean);

  id('publish-btn').disabled = true;
  id('publish-btn').textContent = '⏳ Publishing…';
  try {
    await Promise.all([
      ghPut('content/site.json',     JSON.stringify(siteData, null, 2),     'Update site.json via CMS'),
      ghPut('content/footer.json',   JSON.stringify(footerData, null, 2),   'Update footer.json via CMS'),
      ghPut('content/products.json', JSON.stringify(productsData, null, 2), 'Update products.json via CMS'),
    ]);
    isDirty = false;
    id('publish-status').textContent = 'Published ✓';
    id('publish-status').className = 'publish-status saved';
    toast('Published! Your website will update in a few seconds.', 'success');
  } catch(e) {
    toast('Publish failed: ' + e.message, 'error');
  } finally {
    id('publish-btn').disabled = false;
    id('publish-btn').textContent = '🚀 Publish Changes';
  }
}

// ── Nav / Dirty ──
function switchSection(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sec = btn.dataset.section;
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  id('panel-' + sec).classList.add('active');
  id('topbar-title').textContent = btn.textContent.trim();
}
function switchSectionById(sec) {
  const btn = document.querySelector(`[data-section="${sec}"]`);
  if (btn) switchSection(btn);
}
function markDirty() {
  isDirty = true;
  id('publish-status').textContent = '● Unsaved changes';
  id('publish-status').className = 'publish-status';
}
function updateDashboardStats() {
  id('stat-products').textContent = productsData.items.length;
  id('stat-cats').textContent = (productsData.categories||[]).filter(c=>c!=='All').length;
}

// ── Toast ──
function toast(msg, type = 'success') {
  const t = id('toast');
  t.textContent = msg; t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3500);
}

// ── Utils ──
function id(x)     { return document.getElementById(x); }
function v(x)      { return id(x).value; }
function sv(x, val){ id(x).value = val; }
function show(x)   { id(x).classList.remove('hidden'); }
function hide(x)   { id(x).classList.add('hidden'); }
