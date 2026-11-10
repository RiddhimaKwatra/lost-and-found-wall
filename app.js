(() => {
'use strict';

/* ================= constants & helpers ================= */
const K = { posts: 'lf_posts_v1', threads: 'lf_threads_v1', users: 'lf_users_v1', me: 'lf_me_v1' };
const CATS = {
  id: ['🪪', 'ID / Cards'], bottle: ['🧴', 'Bottle'], books: ['📚', 'Books'],
  electronics: ['🎧', 'Electronics'], keys: ['🔑', 'Keys'], clothing: ['🧥', 'Clothing'], other: ['📦', 'Other']
};
const LOCS = ['Library', 'Main Cafeteria', 'Hostel Area', 'Academic Block', 'LT Block', 'Sports Complex', 'Parking', 'Other'];

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const fmtDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
const fmtTime = t => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { toast('Storage is full. Try a smaller photo or delete old posts.'); return false; }
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ================= state ================= */
let users, posts, threads, me;
const state = { view: 'wall', q: '', type: 'all', cat: 'all', loc: 'all', openThread: null, listOnly: false };

const savePosts = () => save(K.posts, posts);
const saveThreads = () => save(K.threads, threads);
const saveUsers = () => save(K.users, users);
const postById = id => posts.find(p => p.id === id);
const userName = id => (users.find(u => u.id === id) || {}).name || 'Unknown';

function seed() {
  const now = Date.now();
  users = [
    { id: 'u1', name: 'Aarav Sharma', roll: '102503001' },
    { id: 'u2', name: 'Simran Kaur', roll: '102503002' },
    { id: 'u3', name: 'Kabir Singh', roll: '102503003' },
    { id: 'u4', name: 'Meera Gupta', roll: '102503004' }
  ];
  const P = (id, type, title, desc, category, location, date, ownerId, status = 'open', createdAgo = 0) => ({
    id, type, title, desc, category, location, date, photo: '', status, ownerId,
    createdAt: now - createdAgo * 3600e3, claimedAt: status === 'claimed' ? now - (createdAgo / 2) * 3600e3 : null
  });
  posts = [
    P('p1', 'found', 'Black steel water bottle', 'Found on a table near the back shelves. Has a small dent at the bottom.', 'bottle', 'Library', daysAgo(1), 'u2', 'open', 20),
    P('p2', 'lost', 'Blue ID card holder', 'Blue holder with an ID card and a metro card inside. Lost around dinner time.', 'id', 'Main Cafeteria', daysAgo(1), 'u1', 'open', 30),
    P('p3', 'lost', 'Casio scientific calculator', 'Black Casio fx-991 with my initials scratched on the back.', 'electronics', 'LT Block', daysAgo(2), 'u3', 'open', 50),
    P('p4', 'found', 'Keys with red keychain', 'Three keys on a red rubber keychain, left near the bike stand.', 'keys', 'Parking', daysAgo(0), 'u4', 'open', 4),
    P('p5', 'lost', 'White earbuds case', 'White charging case, left earbud missing a sticker. Probably dropped after practice.', 'electronics', 'Sports Complex', daysAgo(3), 'u1', 'open', 75),
    P('p6', 'found', 'Engineering Maths textbook', 'Thick textbook with a green cover, name written inside the first page.', 'books', 'Academic Block', daysAgo(6), 'u3', 'claimed', 140),
    P('p7', 'lost', 'Grey hoodie', 'Plain grey zip-up hoodie, size M, left on a bench.', 'clothing', 'Hostel Area', daysAgo(8), 'u2', 'claimed', 190),
    P('p8', 'found', 'Black power bank', '10000 mAh power bank, found plugged in at a charging point.', 'electronics', 'Library', daysAgo(0), 'u4', 'open', 2)
  ];
  threads = [{
    id: 't1', postId: 'p2', ownerId: 'u1', inquirerId: 'u2',
    messages: [
      { from: 'u2', text: 'Hi! I think I saw a blue card holder near the cafeteria counter yesterday evening.', ts: now - 5 * 3600e3 },
      { from: 'u1', text: 'Thanks! Was it near the juice counter or the main billing desk?', ts: now - 4 * 3600e3 },
      { from: 'u2', text: 'Near the billing desk. I can check with the staff there tomorrow morning.', ts: now - 3 * 3600e3 }
    ],
    lastRead: { u1: now - 3.5 * 3600e3, u2: now - 3 * 3600e3 }
  }];
  saveUsers(); savePosts(); saveThreads();
}

function init() {
  users = load(K.users, null);
  posts = load(K.posts, null);
  threads = load(K.threads, null);
  if (!users || !posts || !threads) seed();
  me = users.find(u => u.id === load(K.me, null)) || null;
  render();
  if (!me) showSignIn(false);
}

/* ================= modal ================= */
let modalDismissible = true;
function openModal(html, dismissible = true) {
  modalDismissible = dismissible;
  $('#modalCard').innerHTML = html;
  $('#modal').classList.remove('hidden');
  document.body.classList.add('noscroll');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  document.body.classList.remove('noscroll');
}
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && modalDismissible) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalDismissible) closeModal(); });

/* ================= sign in (demo) ================= */
function showSignIn(dismissible) {
  openModal(`
    <h2>Who is using the app?</h2>
    <p class="muted">Demo sign-in with no password. Pick a demo student, then use "Switch user" to chat between accounts.</p>
    <div class="users">${users.map(u => `<button class="user-btn" data-uid="${u.id}">👤 ${esc(u.name)}<small>${esc(u.roll)}</small></button>`).join('')}</div>
    <hr>
    <form id="signForm">
      <input id="sName" placeholder="Your name" required maxlength="40">
      <input id="sRoll" placeholder="Roll number" required maxlength="15">
      <button class="primary" type="submit">Sign in as a new student</button>
    </form>`, dismissible);
  $('#modalCard').querySelectorAll('[data-uid]').forEach(b => b.addEventListener('click', () => setMe(users.find(u => u.id === b.dataset.uid))));
  $('#signForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#sName').value.trim(), roll = $('#sRoll').value.trim();
    if (!name || !roll) return;
    let u = users.find(x => x.roll.toLowerCase() === roll.toLowerCase());
    if (!u) { u = { id: uid('u'), name, roll }; users.push(u); saveUsers(); }
    setMe(u);
  });
}
function setMe(u) {
  if (!u) return;
  me = u; save(K.me, u.id);
  state.openThread = null; state.listOnly = false;
  closeModal(); render();
  toast(`Signed in as ${u.name}`);
}

/* ================= threads ================= */
const lastTs = t => (t.messages[t.messages.length - 1] || {}).ts || 0;
const threadsFor = uidv => threads.filter(t => t.ownerId === uidv || t.inquirerId === uidv).sort((a, b) => lastTs(b) - lastTs(a));
const unreadIn = (t, uidv) => t.messages.filter(m => m.from !== uidv && m.ts > ((t.lastRead || {})[uidv] || 0)).length;
const totalUnread = () => me ? threadsFor(me.id).reduce((n, t) => n + unreadIn(t, me.id), 0) : 0;

function addMessage(t, text) {
  text = text.trim();
  if (!text) return false;
  t.messages.push({ from: me.id, text, ts: Date.now() });
  t.lastRead = t.lastRead || {};
  t.lastRead[me.id] = Date.now();
  return saveThreads();
}

/* ================= rendering ================= */
function render() {
  const app = $('#app');
  if (!me) { renderHeader(); app.innerHTML = ''; return; }

  if (state.view === 'messages') {
    const list = threadsFor(me.id);
    if (state.openThread && !list.some(t => t.id === state.openThread)) state.openThread = null;
    if (!state.openThread && !state.listOnly && list.length && window.innerWidth > 760) state.openThread = list[0].id;
    const t = threads.find(x => x.id === state.openThread);
    if (t) { t.lastRead = t.lastRead || {}; t.lastRead[me.id] = Date.now(); saveThreads(); }
  }

  renderHeader();
  if (state.view === 'wall') app.innerHTML = wallView();
  else if (state.view === 'mine') app.innerHTML = mineView();
  else if (state.view === 'returned') app.innerHTML = returnedView();
  else app.innerHTML = messagesView();

  if (state.view === 'messages') { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; }
}

function renderHeader() {
  $('#userLabel').textContent = me ? `👤 ${me.name}` : '';
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  const n = totalUnread(), badge = $('#unread');
  badge.textContent = n; badge.classList.toggle('hidden', n === 0);
}

const empty = (title, sub) => `<div class="empty"><div>🗂️</div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;

function card(p) {
  const claimed = p.status === 'claimed';
  const photo = p.photo && p.photo.startsWith('data:image/') ? `<img src="${p.photo}" alt="">` : `<span class="emoji">${CATS[p.category][0]}</span>`;
  return `<article class="card ${claimed ? 'done' : ''}" data-id="${esc(p.id)}">
    <div class="thumb">${photo}<span class="tag ${claimed ? 'claimed' : p.type}">${claimed ? 'Claimed' : p.type === 'lost' ? 'Lost' : 'Found'}</span></div>
    <div class="card-body">
      <h3>${esc(p.title)}</h3>
      <p class="meta">📍 ${esc(p.location)} · ${fmtDate(p.date)}</p>
      <p class="desc">${esc(p.desc)}</p>
      <p class="by">Posted by ${esc(userName(p.ownerId))}${p.ownerId === (me && me.id) ? ' (you)' : ''}</p>
    </div></article>`;
}
const gridOf = (list, emptyTitle, emptySub) => `<section class="grid">${list.length ? list.map(card).join('') : empty(emptyTitle, emptySub)}</section>`;

/* ---- wall ---- */
function filtered(list) {
  const q = state.q.trim().toLowerCase();
  return list.filter(p =>
    (state.type === 'all' || p.type === state.type) &&
    (state.cat === 'all' || p.category === state.cat) &&
    (state.loc === 'all' || p.location === state.loc) &&
    (!q || `${p.title} ${p.desc} ${p.location} ${CATS[p.category][1]}`.toLowerCase().includes(q)));
}
function gridHtml() {
  const list = filtered(posts.filter(p => p.status === 'open')).sort((a, b) => b.createdAt - a.createdAt);
  return list.length ? list.map(card).join('') : empty('No items match', 'Try clearing the filters, or post something yourself.');
}
function wallView() {
  const open = posts.filter(p => p.status === 'open');
  const lost = open.filter(p => p.type === 'lost').length;
  const returned = posts.filter(p => p.status === 'claimed').length;
  const chips = [['all', 'All']].concat(Object.entries(CATS).map(([k, v]) => [k, `${v[0]} ${v[1]}`]))
    .map(([k, label]) => `<button class="chip ${state.cat === k ? 'active' : ''}" data-cat="${k}">${label}</button>`).join('');
  return `
    <section class="stats">
      <div class="stat"><b>${lost}</b><span>Items lost</span></div>
      <div class="stat"><b>${open.length - lost}</b><span>Items found</span></div>
      <div class="stat"><b>${returned}</b><span>Returned to owners</span></div>
    </section>
    <section class="filters">
      <input id="q" type="search" placeholder="Search items or places…" value="${esc(state.q)}">
      <select id="fType">
        <option value="all">Lost &amp; Found</option>
        <option value="lost" ${state.type === 'lost' ? 'selected' : ''}>Lost only</option>
        <option value="found" ${state.type === 'found' ? 'selected' : ''}>Found only</option>
      </select>
      <select id="fLoc"><option value="all">All locations</option>${LOCS.map(l => `<option ${state.loc === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </section>
    <section class="chips">${chips}</section>
    <section class="grid" id="grid">${gridHtml()}</section>`;
}

/* ---- my posts (active + past) ---- */
function mineView() {
  const mine = posts.filter(p => p.ownerId === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const act = mine.filter(p => p.status === 'open'), done = mine.filter(p => p.status === 'claimed');
  return `<h2 class="sec">My active posts (${act.length})</h2>${gridOf(act, 'No active posts', 'Use "+ New post" to report a lost or found item.')}
    <h2 class="sec">My past submissions (${done.length})</h2>${gridOf(done, 'Nothing resolved yet', 'Posts you mark as claimed will show up here.')}`;
}

/* ---- returned archive (everyone) ---- */
function returnedView() {
  const done = posts.filter(p => p.status === 'claimed').sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
  return `<h2 class="sec">Returned &amp; claimed items (${done.length})</h2>
    <p class="muted">Past posts that have been resolved by their owners.</p>
    ${gridOf(done, 'No returned items yet', 'Resolved posts will be archived here.')}`;
}

/* ---- messages ---- */
function messagesView() {
  const list = threadsFor(me.id);
  const t = threads.find(x => x.id === state.openThread);
  const items = list.map(th => {
    const p = postById(th.postId);
    const other = userName(th.ownerId === me.id ? th.inquirerId : th.ownerId);
    const last = th.messages[th.messages.length - 1];
    const un = th.id === state.openThread ? 0 : unreadIn(th, me.id);
    return `<button class="thread ${th.id === state.openThread ? 'active' : ''}" data-thread="${esc(th.id)}">
      <div class="t-top"><strong>${esc(p ? p.title : '(deleted post)')}</strong>${un ? `<span class="badge">${un}</span>` : ''}</div>
      <div class="t-sub">${esc(other)} · ${esc(last ? last.text.slice(0, 48) : '')}</div></button>`;
  }).join('');

  let chat;
  if (!t) {
    chat = `<div class="placeholder"><div style="font-size:2.4rem">💬</div><p>${list.length ? 'Select a conversation.' : 'No conversations yet. Open a post and tap "Send message" to start one.'}</p></div>`;
  } else {
    const p = postById(t.postId);
    const other = userName(t.ownerId === me.id ? t.inquirerId : t.ownerId);
    const closed = !p || p.status === 'claimed';
    chat = `<div class="chat-head">
        <button class="ghost back" id="backToList">←</button>
        <div><strong>${esc(p ? p.title : '(deleted post)')}</strong><div class="t-sub">Chat with ${esc(other)}${closed ? ' · closed (item resolved)' : ''}</div></div>
        ${p ? `<button class="ghost" data-open-post="${esc(p.id)}">View post</button>` : ''}
      </div>
      <div class="msgs" id="msgs">${t.messages.map(m => `<div class="bubble ${m.from === me.id ? 'me' : 'them'}"><p>${esc(m.text)}</p><span>${fmtTime(m.ts)}</span></div>`).join('')}</div>
      ${closed ? '' : `<form id="chatForm" class="chat-form"><input id="chatInput" placeholder="Type a message…" autocomplete="off" maxlength="500"><button class="primary" type="submit">Send</button></form>`}
      <p class="privacy">🔒 Chats stay inside this app. Phone numbers and emails are never shown.<br>Demo tip: use "Switch user" to reply as the other person.</p>`;
  }
  return `<div class="msg-layout ${t ? 'has-chat' : ''}">
    <aside class="thread-list">${items || '<p class="muted" style="padding:8px">No conversations yet.</p>'}</aside>
    <section class="chat">${chat}</section></div>`;
}

/* ================= post detail ================= */
function showPost(id) {
  const p = postById(id);
  if (!p) return;
  const mine = p.ownerId === me.id;
  const related = threads.filter(t => t.postId === p.id);
  let action = '';

  if (p.status === 'claimed') {
    action = `<div class="notice ok">✅ Marked as ${p.type === 'lost' ? 'recovered' : 'returned'} on ${fmtTime(p.claimedAt)}.</div>`;
  } else if (mine) {
    action = `<div class="notice">This is your post. Only you can mark it as claimed.</div>
      <div class="row">
        <button class="primary" id="claimBtn">✔ Mark as claimed</button>
        <button class="ghost" id="chatsBtn">💬 Messages (${related.length})</button>
        <button class="danger" id="delBtn">Delete</button>
      </div>`;
  } else {
    const existing = related.find(t => t.inquirerId === me.id);
    action = `<hr><h4>Message ${esc(userName(p.ownerId))}</h4>
      <p class="muted">Their contact details stay private. Chat happens inside the app.</p>
      <form id="msgForm">
        <textarea id="msgText" rows="3" maxlength="500" placeholder="${p.type === 'lost' ? 'Tell them where you saw it…' : 'Describe it to prove it is yours (colour, marks, contents)…'}" required></textarea>
        <div class="row"><button class="primary" type="submit">Send message</button>
        ${existing ? '<button class="ghost" type="button" id="openChat">Open existing chat</button>' : ''}</div>
      </form>`;
  }

  const photo = p.photo && p.photo.startsWith('data:image/')
    ? `<img class="detail-img" src="${p.photo}" alt="">` : `<div class="detail-emoji">${CATS[p.category][0]}</div>`;
  openModal(`
    <div class="modal-head"><h2>${esc(p.title)}</h2><button class="ghost" id="mClose">✕</button></div>
    <span class="tag ${p.status === 'claimed' ? 'claimed' : p.type}" style="position:static;display:inline-block">${p.status === 'claimed' ? 'Claimed' : p.type === 'lost' ? 'Lost' : 'Found'}</span>
    ${photo}
    <div class="kv">
      <b>Category</b><span>${CATS[p.category][1]}</span>
      <b>Location</b><span>${esc(p.location)}</span>
      <b>Date</b><span>${fmtDate(p.date)}</span>
      <b>Posted by</b><span>${esc(userName(p.ownerId))}${mine ? ' (you)' : ''}</span>
    </div>
    <p>${esc(p.desc) || '<span class="muted">No description.</span>'}</p>
    ${action}`);

  $('#mClose').addEventListener('click', closeModal);
  const on = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };

  on('#claimBtn', () => {
    if (p.ownerId !== me.id) return;               // guard: owner only
    if (!confirm('Mark this item as claimed? It will move to the Returned archive.')) return;
    p.status = 'claimed'; p.claimedAt = Date.now();
    savePosts(); closeModal(); render(); toast('Marked as claimed 🎉');
  });
  on('#delBtn', () => {
    if (p.ownerId !== me.id) return;
    if (!confirm('Delete this post and its chats permanently?')) return;
    posts = posts.filter(x => x.id !== p.id);
    threads = threads.filter(t => t.postId !== p.id);
    savePosts(); saveThreads(); closeModal(); render(); toast('Post deleted');
  });
  on('#chatsBtn', () => {
    state.view = 'messages'; state.openThread = related.length ? related[0].id : null; state.listOnly = !related.length;
    closeModal(); render();
  });
  on('#openChat', () => {
    const t = related.find(x => x.inquirerId === me.id);
    state.view = 'messages'; state.openThread = t.id; closeModal(); render();
  });
  const form = $('#msgForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    if (p.ownerId === me.id || p.status !== 'open') return;
    let t = threads.find(x => x.postId === p.id && x.inquirerId === me.id);
    if (!t) { t = { id: uid('t'), postId: p.id, ownerId: p.ownerId, inquirerId: me.id, messages: [], lastRead: {} }; threads.push(t); }
    if (!addMessage(t, $('#msgText').value)) return;
    state.view = 'messages'; state.openThread = t.id; closeModal(); render(); toast('Message sent');
  });
}

/* ================= new post ================= */
let pendingPhoto = '';
function compress(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, 500 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

function showNewPost() {
  pendingPhoto = '';
  openModal(`
    <div class="modal-head"><h2>New post</h2><button class="ghost" id="mClose">✕</button></div>
    <form id="postForm" class="form">
      <div class="seg">
        <label><input type="radio" name="type" value="lost" checked><span>I lost something</span></label>
        <label><input type="radio" name="type" value="found"><span>I found something</span></label>
      </div>
      <label>Title<input name="title" required minlength="3" maxlength="60" placeholder="e.g. Black Milton bottle"></label>
      <div class="two">
        <label>Category<select name="category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('')}</select></label>
        <label>Location<select name="location">${LOCS.map(l => `<option>${l}</option>`).join('')}</select></label>
      </div>
      <label>Date<input type="date" name="date" required value="${today()}" max="${today()}"></label>
      <label>Description<textarea name="desc" rows="3" maxlength="300" placeholder="Colour, brand, markings… Please do not add phone numbers."></textarea></label>
      <p class="muted" style="margin:-6px 0 0">Tip: for found items, leave out one identifying detail so you can verify the real owner in chat.</p>
      <label>Photo (optional)<input type="file" name="photo" accept="image/*"></label>
      <img id="preview" class="preview hidden" alt="">
      <button class="primary" type="submit">Post</button>
    </form>`);
  $('#mClose').addEventListener('click', closeModal);
  $('#postForm').elements.photo.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) { pendingPhoto = ''; $('#preview').classList.add('hidden'); return; }
    try {
      pendingPhoto = await compress(f);
      const pv = $('#preview'); pv.src = pendingPhoto; pv.classList.remove('hidden');
    } catch { pendingPhoto = ''; toast('Could not read that image'); }
  });
  $('#postForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.elements;
    const title = f.title.value.trim();
    if (title.length < 3) { toast('Please add a title'); return; }
    const post = {
      id: uid('p'), type: f.type.value, title, desc: f.desc.value.trim(), category: f.category.value,
      location: f.location.value, date: f.date.value || today(), photo: pendingPhoto, status: 'open',
      ownerId: me.id, createdAt: Date.now(), claimedAt: null
    };
    posts.unshift(post);
    if (!savePosts()) { posts.shift(); return; }
    state.view = 'wall'; state.cat = 'all'; state.type = 'all'; state.loc = 'all'; state.q = '';
    closeModal(); render(); toast('Posted!');
  });
}

/* ================= events ================= */
document.addEventListener('click', e => {
  if (!me) return;
  const tab = e.target.closest('#tabs [data-view]');
  if (tab) { state.view = tab.dataset.view; state.openThread = null; state.listOnly = false; render(); return; }
  const c = e.target.closest('.card');
  if (c) { showPost(c.dataset.id); return; }
  const chip = e.target.closest('[data-cat]');
  if (chip) { state.cat = chip.dataset.cat; render(); return; }
  const th = e.target.closest('[data-thread]');
  if (th) { state.openThread = th.dataset.thread; state.listOnly = false; render(); return; }
  const op = e.target.closest('[data-open-post]');
  if (op) { showPost(op.dataset.openPost); return; }
  if (e.target.closest('#backToList')) { state.openThread = null; state.listOnly = true; render(); }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') { state.q = e.target.value; $('#grid').innerHTML = gridHtml(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'fType') { state.type = e.target.value; render(); }
  if (e.target.id === 'fLoc') { state.loc = e.target.value; render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'chatForm') return;
  e.preventDefault();
  const t = threads.find(x => x.id === state.openThread);
  const input = $('#chatInput');
  if (!t || !input) return;
  if (addMessage(t, input.value)) { render(); const i = $('#chatInput'); if (i) i.focus(); }
});

$('#newPost').addEventListener('click', () => { if (me) showNewPost(); });
$('#switchUser').addEventListener('click', () => showSignIn(!!me));

init();
})();
