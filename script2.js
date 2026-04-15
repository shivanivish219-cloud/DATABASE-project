/* ═══════════════════════════════════════════
   CART-ZY · app.js
   Backend: http://localhost:3001 (Fastify)
═══════════════════════════════════════════ */

const API = "http://localhost:3001";

/* ── STATE ── */
const S = {
  products: [],
  total: 0,
  page: 1,
  limit: 10, // 10 products per page
  category: "all",
  search: "",
  minPrice: 0,
  maxPrice: 200000,
  rating: "",
  sortBy: "createdAt",
  sortOrder: "DESC",
  view: "grid",
  cart: load("cz_cart", []),
  user: load("cz_user", null),
};

/* ── CATEGORY EMOJIS ── */
const EMO = {
  Electronics: "📱",
  Clothing: "👗",
  Books: "📚",
  Sports: "⚽",
  Home: "🏡",
  Beauty: "💄",
  Toys: "🧸",
};

/* ── HELPERS ── */
function load(k, d) {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch {
    return d;
  }
}
function save(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}
function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  refreshBadge();
  refreshNavUser();
  fetchProducts();
  fetchStats();

  // Search on Enter — no autocomplete/suggestions
  const si = document.getElementById("searchInput");
  si.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
  si.addEventListener("input", () => {
    document.getElementById("sClear").style.display = si.value
      ? "flex"
      : "none";
  });

  // Close modals on background click
  document.querySelectorAll(".modal-bg").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (e.target === el) closeModal(el.id);
    }),
  );
});

/* ═══════════════════════════════════════════
   API — FETCH PRODUCTS
═══════════════════════════════════════════ */
async function fetchProducts() {
  showLoading(true);
  clearGrid();

  const p = new URLSearchParams({
    page: S.page,
    limit: S.limit,
    sortBy: S.sortBy,
    sortOrder: S.sortOrder,
  });
  if (S.category !== "all") p.append("category", S.category);
  if (S.search) p.append("search", S.search);
  if (S.minPrice > 0) p.append("minPrice", S.minPrice);
  if (S.maxPrice < 200000) p.append("maxPrice", S.maxPrice);
  if (S.rating) p.append("rating", S.rating);

  try {
    const r = await fetch(`${API}/products?${p}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    S.products = d.data || [];
    S.total = d.total || 0;
    renderProducts();
    renderPagination();
    updateToolbar();
    renderActiveChips();
  } catch {
    showError();
  } finally {
    showLoading(false);
  }
}

/* ── FETCH STATS ── */
async function fetchStats() {
  try {
    const r = await fetch(`${API}/statistics`);
    const d = await r.json();
    setEl("statProducts", (d.totalProducts || 0).toLocaleString());
    setEl("statBrands", (d.totalBrands || 0).toLocaleString());
    setEl("statAvgPrice", "₹" + fmt(d.avgPrice));
    setEl("statStock", (d.totalStock || 0).toLocaleString());
    setEl("statAvgRating", (d.avgRating || 0).toFixed(1) + "★");
  } catch {
    /* silent */
  }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ═══════════════════════════════════════════
   RENDER — PRODUCTS
═══════════════════════════════════════════ */
function renderProducts() {
  const grid = document.getElementById("prodGrid");
  clearGrid();

  if (!S.products.length) {
    grid.innerHTML = `<div class="no-results"><div class="nr-ico">🔍</div><p>No products found. Try adjusting your filters.</p></div>`;
    return;
  }

  S.products.forEach((p, i) => grid.appendChild(makeCard(p, i)));
}

function makeCard(p, idx) {
  const el = document.createElement("div");
  el.className = "pcard";
  el.style.animationDelay = `${idx * 0.04}s`;

  const emoji = EMO[p.category] || "📦";
  const disc = Math.floor(Math.random() * 32) + 8;
  const origP = Math.round(p.price * (1 + disc / 100));
  const lowSt = p.stock > 0 && p.stock < 10;
  const outSt = p.stock === 0;
  const stClass = outSt ? "out" : lowSt ? "low" : "";
  const stTxt = outSt
    ? "❌ Out of stock"
    : lowSt
      ? `Only ${p.stock} left`
      : "In Stock";
  const rat = (p.rating || 4).toFixed(1);
  const reviews = Math.floor(Math.random() * 3000 + 100).toLocaleString();

  el.innerHTML = `
    <div class="pcard-img">
      ${emoji}
      <span class="pcard-badge">${disc}% OFF</span>
      <button class="pcard-wish" onclick="event.stopPropagation()" title="Wishlist">
        <i class="far fa-heart"></i>
      </button>
    </div>
    <div class="pcard-body">
      <div class="pcard-brand">${p.brand || "Brand"}</div>
      <div class="pcard-title">${p.title}</div>
      <div class="pcard-rating">
        <span class="pcard-rat-badge"><i class="fas fa-star"></i> ${rat}</span>
        <span class="pcard-rat-count">(${reviews})</span>
      </div>
      <div class="pcard-price">
        <span class="pcard-price-now">₹${fmt(p.price)}</span>
        <span class="pcard-price-was">₹${fmt(origP)}</span>
        <span class="pcard-price-off">(${disc}% off)</span>
      </div>
      <div class="pcard-stock ${stClass}">${stTxt}</div>
    </div>
    <div class="pcard-actions">
      <button class="pca-btn pca-cart" onclick="event.stopPropagation();addToCart(${p.id})">
        <i class="fas fa-shopping-bag"></i> ADD
      </button>
      <button class="pca-btn pca-buy" onclick="event.stopPropagation();buyNow(${p.id})">
        BUY NOW
      </button>
    </div>`;

  el.addEventListener("click", () => openDetail(p));
  return el;
}

function clearGrid() {
  const g = document.getElementById("prodGrid");
  g.innerHTML = "";
}

/* ═══════════════════════════════════════════
   PAGINATION (10 per page, numbered links)
═══════════════════════════════════════════ */
function renderPagination() {
  const totalPages = Math.ceil(S.total / S.limit);
  const block = document.getElementById("pagiBlock");
  const links = document.getElementById("pagiLinks");
  const summ = document.getElementById("pagiSummary");

  if (totalPages <= 1) {
    block.style.display = "none";
    return;
  }
  block.style.display = "flex";

  const from = (S.page - 1) * S.limit + 1;
  const to = Math.min(S.page * S.limit, S.total);
  summ.innerHTML = `Showing <strong>${from}–${to}</strong> of <strong>${S.total.toLocaleString()}</strong> products`;

  links.innerHTML = "";

  // PREV
  const prev = mkPgBtn(
    "← Prev",
    S.page === 1,
    () => toPage(S.page - 1),
    "nav-arrow",
  );
  links.appendChild(prev);

  // PAGE NUMBERS
  smartPageNums(S.page, totalPages).forEach((n) => {
    if (n === "…") {
      const s = document.createElement("span");
      s.textContent = "…";
      s.style.cssText =
        "padding:0 6px;color:var(--text3);font-size:0.85rem;display:flex;align-items:center;";
      links.appendChild(s);
    } else {
      const b = mkPgBtn(n, false, () => toPage(n));
      if (n === S.page) b.classList.add("active");
      links.appendChild(b);
    }
  });

  // NEXT
  const next = mkPgBtn(
    "Next →",
    S.page === totalPages,
    () => toPage(S.page + 1),
    "nav-arrow",
  );
  links.appendChild(next);
}

function mkPgBtn(label, disabled, cb, extra = "") {
  const b = document.createElement("button");
  b.className = `pg-btn${extra ? " " + extra : ""}`;
  b.textContent = label;
  b.disabled = disabled;
  b.addEventListener("click", cb);
  return b;
}

function smartPageNums(cur, total) {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 5) return [1, 2, 3, 4, 5, 6, "…", total - 1, total];
  if (cur >= total - 4)
    return [
      1,
      2,
      "…",
      total - 5,
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ];
  return [1, 2, "…", cur - 1, cur, cur + 1, "…", total - 1, total];
}

function toPage(n) {
  S.page = n;
  fetchProducts();
  document
    .getElementById("shopSection")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── TOOLBAR ── */
function updateToolbar() {
  const el = document.getElementById("resultLabel");
  const cat = S.category === "all" ? "All Products" : S.category;
  el.innerHTML = `<span class="hl">${S.total.toLocaleString()}</span> items found in <span class="hl">${cat}</span>`;
}

/* ── ACTIVE FILTER CHIPS ── */
function renderActiveChips() {
  const wrap = document.getElementById("activeChips");
  wrap.innerHTML = "";
  const chips = [];

  if (S.category !== "all")
    chips.push({
      label: S.category,
      clear: () => {
        S.category = "all";
        document.querySelector("[name=fcat][value=all]").checked = true;
        syncAndFetch();
      },
    });
  if (S.search)
    chips.push({
      label: `"${S.search}"`,
      clear: () => {
        S.search = "";
        document.getElementById("searchInput").value = "";
        document.getElementById("sClear").style.display = "none";
        syncAndFetch();
      },
    });
  if (S.minPrice > 0)
    chips.push({
      label: `Min ₹${fmt(S.minPrice)}`,
      clear: () => {
        S.minPrice = 0;
        document.getElementById("sliderMin").value = 0;
        syncSliders();
        syncAndFetch();
      },
    });
  if (S.maxPrice < 200000)
    chips.push({
      label: `Max ₹${fmt(S.maxPrice)}`,
      clear: () => {
        S.maxPrice = 200000;
        document.getElementById("sliderMax").value = 200000;
        syncSliders();
        syncAndFetch();
      },
    });
  if (S.rating)
    chips.push({
      label: `${S.rating}+ Stars`,
      clear: () => {
        S.rating = "";
        document.querySelector('[name=frat][value=""]').checked = true;
        syncAndFetch();
      },
    });

  wrap.style.display = chips.length ? "flex" : "none";

  chips.forEach((c) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `${c.label} <button class="chip-x" title="Remove"><i class="fas fa-times"></i></button>`;
    chip.querySelector(".chip-x").addEventListener("click", c.clear);
    wrap.appendChild(chip);
  });
}

/* ═══════════════════════════════════════════
   CATEGORY / SEARCH / FILTERS
═══════════════════════════════════════════ */
function navCat(cat, btn) {
  S.category = cat;
  S.page = 1;
  S.search = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("sClear").style.display = "none";

  // Sync nav-links
  document.querySelectorAll(".nl").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    const found = document.querySelector(`.nl[data-cat="${cat}"]`);
    if (found) {
      document
        .querySelectorAll(".nl")
        .forEach((b) => b.classList.remove("active"));
      found.classList.add("active");
    }
  }

  // Sync sidebar radio
  const r = document.querySelector(`[name=fcat][value="${cat}"]`);
  if (r) r.checked = true;

  // Hide hero if not all
  const hero = document.getElementById("hero");
  const cats = document.getElementById("shopCats");
  const statsBar = document.getElementById("statsBar");
  if (cat !== "all") {
    hero.style.display = "none";
    cats.style.display = "none";
  } else {
    hero.style.display = "";
    cats.style.display = "";
  }
  statsBar.style.display = cat !== "all" ? "none" : "";

  fetchProducts();
  document.getElementById("shopSection").scrollIntoView({ behavior: "smooth" });
}

function setCatFilter(cat) {
  S.category = cat;
  S.page = 1;
  // Sync nav buttons
  document.querySelectorAll(".nl").forEach((b) => {
    b.classList.toggle("active", b.dataset.cat === cat);
  });
  // Hero/cats visibility
  const hero = document.getElementById("hero");
  const catSec = document.getElementById("shopCats");
  const statsBar = document.getElementById("statsBar");
  hero.style.display = cat !== "all" ? "none" : "";
  catSec.style.display = cat !== "all" ? "none" : "";
  statsBar.style.display = cat !== "all" ? "none" : "";
  fetchProducts();
}

function doSearch() {
  const q = document.getElementById("searchInput").value.trim();
  if (!q) return;
  S.search = q;
  S.category = "all";
  S.page = 1;
  document.querySelectorAll(".nl").forEach((b) => b.classList.remove("active"));
  document.querySelector('.nl[data-cat="all"]').classList.add("active");
  document.querySelector("[name=fcat][value=all]").checked = true;
  document.getElementById("hero").style.display = "none";
  document.getElementById("shopCats").style.display = "none";
  document.getElementById("statsBar").style.display = "none";
  fetchProducts();
  document.getElementById("shopSection").scrollIntoView({ behavior: "smooth" });
}

function clearSearch() {
  S.search = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("sClear").style.display = "none";
  fetchProducts();
}

function setRatFilter(val) {
  S.rating = val;
  S.page = 1;
  fetchProducts();
}

function setSortFilter(by, order) {
  S.sortBy = by;
  S.sortOrder = order;
  S.page = 1;
  fetchProducts();
}

function applyFilters() {
  S.minPrice = parseInt(document.getElementById("sliderMin").value) || 0;
  S.maxPrice = parseInt(document.getElementById("sliderMax").value) || 200000;
  S.page = 1;
  fetchProducts();
}

function clearFilters() {
  S.category = "all";
  S.search = "";
  S.minPrice = 0;
  S.maxPrice = 200000;
  S.rating = "";
  S.sortBy = "createdAt";
  S.sortOrder = "DESC";
  S.page = 1;

  document.getElementById("searchInput").value = "";
  document.getElementById("sClear").style.display = "none";
  document.getElementById("sliderMin").value = 0;
  document.getElementById("sliderMax").value = 200000;
  syncSliders();

  document
    .querySelectorAll(".nl")
    .forEach((b) => b.classList.toggle("active", b.dataset.cat === "all"));
  const all = document.querySelector("[name=fcat][value=all]");
  if (all) all.checked = true;
  const ratAll = document.querySelector('[name=frat][value=""]');
  if (ratAll) ratAll.checked = true;
  const sortDef = document.querySelector(
    '[name=fsort][value="createdAt|DESC"]',
  );
  if (sortDef) sortDef.checked = true;

  document
    .querySelectorAll(".pp-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("hero").style.display = "";
  document.getElementById("shopCats").style.display = "";
  document.getElementById("statsBar").style.display = "";
  fetchProducts();
}

function syncAndFetch() {
  S.page = 1;
  fetchProducts();
}

/* PRICE SLIDERS */
function syncSliders() {
  let minV = parseInt(document.getElementById("sliderMin").value);
  let maxV = parseInt(document.getElementById("sliderMax").value);
  if (minV > maxV) {
    [minV, maxV] = [maxV, minV];
  }
  document.getElementById("priceMin").textContent = fmt(minV);
  document.getElementById("priceMax").textContent = fmt(maxV);
}

function setPreset(min, max) {
  document.getElementById("sliderMin").value = min;
  document.getElementById("sliderMax").value = max;
  syncSliders();
  document
    .querySelectorAll(".pp-btn")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");
  S.minPrice = min;
  S.maxPrice = max;
  S.page = 1;
  fetchProducts();
}

/* FILTER PANEL ACCORDION */
function toggleBlock(titleEl) {
  titleEl.classList.toggle("collapsed");
  const body = titleEl.nextElementSibling;
  body.classList.toggle("hidden");
}

/* MOBILE FILTER */
function toggleFilterPanel() {
  document.getElementById("filterPanel").classList.toggle("open");
  document.getElementById("mobFilterOverlay").classList.toggle("open");
}

/* VIEW TOGGLE */
function setView(v) {
  S.view = v;
  const grid = document.getElementById("prodGrid");
  grid.classList.toggle("list-view", v === "list");
  document.getElementById("vGrid").classList.toggle("active", v === "grid");
  document.getElementById("vList").classList.toggle("active", v === "list");
}

/* ═══════════════════════════════════════════
   CART DRAWER
═══════════════════════════════════════════ */
let cartOpen = false;

function toggleCart() {
  cartOpen = !cartOpen;
  document.getElementById("cartDrawer").classList.toggle("open", cartOpen);
  document.getElementById("cartOverlay").classList.toggle("open", cartOpen);
  document.body.style.overflow = cartOpen ? "hidden" : "";
  if (cartOpen) renderCartDrawer();
}

function openCartModal() {
  if (!cartOpen) toggleCart();
}

function addToCart(id) {
  const p = S.products.find((x) => x.id === id);
  if (!p) return;
  const ex = S.cart.find((c) => c.id === id);
  if (ex) ex.qty++;
  else S.cart.push({ ...p, qty: 1 });
  save("cz_cart", S.cart);
  refreshBadge();
  renderProducts();
  toast(`🛍️ "${p.title.slice(0, 28)}…" added to bag!`, "ok");
  if (!cartOpen) toggleCart();
}

function removeFromCart(id) {
  S.cart = S.cart.filter((c) => c.id !== id);
  save("cz_cart", S.cart);
  refreshBadge();
  renderCartDrawer();
}

function changeQty(id, d) {
  const item = S.cart.find((c) => c.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  save("cz_cart", S.cart);
  refreshBadge();
  renderCartDrawer();
}

function refreshBadge() {
  const n = S.cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById("cartBadge").textContent = n;
}

function renderCartDrawer() {
  const itemsWrap = document.getElementById("cdItems");
  const footer = document.getElementById("cdFooter");
  const banner = document.getElementById("cdBanner");
  const cdCount = document.getElementById("cdCount");

  itemsWrap.innerHTML = "";

  if (!S.cart.length) {
    cdCount.textContent = "";
    footer.style.display = "none";
    banner.className = "cd-banner";
    banner.innerHTML = `<i class="fas fa-truck"></i> Add ₹999 more for FREE delivery!`;
    itemsWrap.innerHTML = `
      <div class="cd-empty">
        <div class="cde-icon">🛍️</div>
        <p class="cde-title">Your bag is empty</p>
        <p class="cde-sub">Looks like you haven't added anything yet.</p>
        <button class="cde-btn" onclick="toggleCart()">Continue Shopping</button>
      </div>`;
    return;
  }

  const totalQty = S.cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = S.cart.reduce((s, c) => s + c.price * c.qty, 0);
  cdCount.textContent = `${totalQty} item${totalQty !== 1 ? "s" : ""}`;

  // Delivery banner
  const FREE_THRESHOLD = 999;
  if (subtotal >= FREE_THRESHOLD) {
    banner.className = "cd-banner done";
    banner.innerHTML = `<i class="fas fa-check-circle"></i> You've unlocked FREE delivery! 🎉`;
  } else {
    banner.className = "cd-banner";
    banner.innerHTML = `<i class="fas fa-truck"></i> Add <strong>₹${fmt(FREE_THRESHOLD - subtotal)}</strong> more for FREE delivery!`;
  }

  S.cart.forEach((item) => {
    const emoji = EMO[item.category] || "📦";
    const disc = (Math.abs(item.id * 7) % 25) + 5;
    const origP = Math.round(item.price * (1 + disc / 100));
    const lineTotal = item.price * item.qty;
    const el = document.createElement("div");
    el.className = "cd-item";
    el.innerHTML = `
      <div class="cd-item-thumb">${emoji}</div>
      <div class="cd-item-body">
        <div class="cd-item-brand">${item.brand || "Brand"}</div>
        <div class="cd-item-name">${item.title}</div>
        <div class="cd-item-desc">${item.description || "Premium quality product from CART-ZY."}</div>
        <div class="cd-item-cat">${emoji} ${item.category}</div>
        <div class="cd-item-bottom">
          <div>
            <div class="cd-item-price">₹${fmt(lineTotal)}</div>
            <div class="cd-item-per">
              ₹${fmt(item.price)} each &nbsp;·&nbsp;
              <s style="color:var(--text3)">₹${fmt(origP)}</s>
              <span style="color:var(--green);font-size:0.68rem"> ${disc}% off</span>
            </div>
          </div>
          <div class="cd-qty">
            <button class="cd-qty-btn" onclick="changeQty(${item.id},-1)">−</button>
            <div class="cd-qty-num">${item.qty}</div>
            <button class="cd-qty-btn" onclick="changeQty(${item.id},1)">+</button>
          </div>
        </div>
        <button class="cd-item-remove" onclick="removeFromCart(${item.id})">
          <i class="fas fa-trash-alt"></i> Remove
        </button>
      </div>`;
    itemsWrap.appendChild(el);
  });

  footer.style.display = "block";
  document.getElementById("cdItemCount").textContent = totalQty;
  document.getElementById("cdSubtotal").textContent = "₹" + fmt(subtotal);
  document.getElementById("cdGrand").textContent = "₹" + fmt(subtotal);
  document.getElementById("cdCheckoutAmt").textContent = "₹" + fmt(subtotal);
}

function doCheckout() {
  if (!S.user) {
    toggleCart();
    setTimeout(() => openLoginModal(), 300);
    toast("Please login to place your order!", "err");
    return;
  }
  S.cart = [];
  save("cz_cart", S.cart);
  refreshBadge();
  toggleCart();
  toast("🎉 Order placed! Thank you for shopping with CART-ZY!", "ok");
}

function buyNow(id) {
  addToCart(id);
}

/* ═══════════════════════════════════════════
   PRODUCT DETAIL MODAL
═══════════════════════════════════════════ */
function openDetail(p) {
  const emoji = EMO[p.category] || "📦";
  const disc = Math.floor(Math.random() * 32) + 8;
  const origP = Math.round(p.price * (1 + disc / 100));
  const lowSt = p.stock > 0 && p.stock < 10;
  const rat = (p.rating || 4).toFixed(1);
  const rev = Math.floor(Math.random() * 4000 + 200).toLocaleString();

  document.getElementById("detailInner").innerHTML = `
    <div class="dm-wrap">
      <div class="dm-img">${emoji}</div>
      <div class="dm-info">
        <div class="dm-brand">${p.brand || "Brand"} · ${p.category}</div>
        <div class="dm-title">${p.title}</div>
        <div class="dm-rating">
          <span class="pcard-rat-badge"><i class="fas fa-star"></i> ${rat}</span>
          <span class="pcard-rat-count">${rev} ratings</span>
        </div>
        <div class="dm-price-now">₹${fmt(p.price)}</div>
        <div class="dm-price-row">
          <span class="dm-was">₹${fmt(origP)}</span>
          <span class="dm-off">${disc}% off</span>
          <span style="font-size:0.8rem;color:var(--green)">· FREE Delivery</span>
        </div>
        <div class="dm-desc">${p.description || "No description provided for this product."}</div>
        <div class="dm-stock ${lowSt ? "low" : ""}">
          ${
            p.stock === 0
              ? "❌ Out of Stock"
              : lowSt
                ? `⚠️ Hurry! Only ${p.stock} left`
                : `✅ In Stock (${p.stock || "50+"} units available)`
          }
        </div>
        <div class="dm-actions">
          <button class="dm-add" onclick="addToCart(${p.id});closeModal('detailModal')">
            <i class="fas fa-shopping-bag"></i> Add to Bag
          </button>
          <button class="dm-buy" onclick="buyNow(${p.id});closeModal('detailModal')">
            Buy Now
          </button>
        </div>
      </div>
    </div>`;

  openModal("detailModal");
}

/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
function openLoginModal() {
  if (S.user) {
    S.user = null;
    localStorage.removeItem("cz_user");
    refreshNavUser();
    toast("Logged out.", "inf");
    return;
  }
  openModal("loginModal");
}

function switchTab(e, formId) {
  document
    .querySelectorAll(".lm-tab")
    .forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".lf").forEach((f) => f.classList.remove("active"));
  e.target.classList.add("active");
  document.getElementById(formId).classList.add("active");
}

function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  if (!email || !pass) {
    toast("Please fill all fields!", "err");
    return;
  }
  S.user = { name: email.split("@")[0] || "User", email };
  save("cz_user", S.user);
  refreshNavUser();
  closeModal("loginModal");
  toast(`Welcome back, ${S.user.name}! 👋`, "ok");
}

function handleSignup() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPass").value.trim();
  if (!name || !email || !pass) {
    toast("Please fill all fields!", "err");
    return;
  }
  if (pass.length < 6) {
    toast("Password must be at least 6 characters.", "err");
    return;
  }
  S.user = { name, email };
  save("cz_user", S.user);
  refreshNavUser();
  closeModal("loginModal");
  toast(`Welcome to CART-ZY, ${name}! 🎉`, "ok");
}

function refreshNavUser() {
  const btn = document.getElementById("userBtn");
  const lbl = document.getElementById("userLabel");
  if (S.user) {
    lbl.textContent = S.user.name;
    btn.querySelector("i").className = "fas fa-user-check";
    btn.title = "Click to logout";
  } else {
    lbl.textContent = "Login";
    btn.querySelector("i").className = "fas fa-user";
    btn.title = "";
  }
}

/* ═══════════════════════════════════════════
   CART MODAL OPEN
═══════════════════════════════════════════ */
function openCartModal() {
  renderCartBody();
  openModal("cartModal");
}

/* ═══════════════════════════════════════════
   ADD PRODUCT
═══════════════════════════════════════════ */
function openAddProductModal() {
  ["apTitle", "apBrand", "apDesc", "apPrice", "apStock", "apRating"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    },
  );
  document.getElementById("apCat").value = "";
  openModal("addModal");
}

async function submitProduct() {
  const title = document.getElementById("apTitle").value.trim();
  const brand = document.getElementById("apBrand").value.trim();
  const desc = document.getElementById("apDesc").value.trim();
  const price = parseFloat(document.getElementById("apPrice").value);
  const category = document.getElementById("apCat").value;
  const stock = parseInt(document.getElementById("apStock").value) || 100;
  const rating = parseFloat(document.getElementById("apRating").value) || 4.0;

  if (!title || !brand || !desc || isNaN(price) || !category) {
    toast("Please fill all required fields!", "err");
    return;
  }
  if (price < 0) {
    toast("Price must be positive.", "err");
    return;
  }
  if (rating < 1 || rating > 5) {
    toast("Rating must be 1–5.", "err");
    return;
  }

  const payload = {
    title,
    brand,
    description: desc,
    price,
    category,
    stock,
    rating,
  };

  try {
    const r = await fetch(`${API}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (r.ok || r.status === 201) {
      closeModal("addModal");
      toast(`✅ "${title}" listed on CART-ZY!`, "ok");
      if (S.category === "all" || S.category === category) {
        S.page = 1;
        fetchProducts();
        fetchStats();
      }
    } else {
      const e = await r.json().catch(() => ({}));
      toast(e.message || "Failed to add product.", "err");
    }
  } catch {
    toast("⚠️ Cannot reach server at localhost:3001", "err");
  }
}

/* ═══════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}

/* ── SCROLL TO SHOP ── */
function scrollToShop() {
  document.getElementById("shopSection").scrollIntoView({ behavior: "smooth" });
}

/* ── GO HOME ── */
function goHome() {
  S.search = "";
  S.category = "all";
  S.page = 1;
  document.getElementById("searchInput").value = "";
  document.getElementById("sClear").style.display = "none";
  document.getElementById("hero").style.display = "";
  document.getElementById("shopCats").style.display = "";
  document.getElementById("statsBar").style.display = "";
  document
    .querySelectorAll(".nl")
    .forEach((b) => b.classList.toggle("active", b.dataset.cat === "all"));
  const allR = document.querySelector("[name=fcat][value=all]");
  if (allR) allR.checked = true;
  fetchProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── LOADING ── */
function showLoading(show) {
  const el = document.getElementById("loadingEl");
  if (!el) return;
  if (show) {
    clearGrid();
    const grid = document.getElementById("prodGrid");
    grid.appendChild(el);
    el.style.display = "flex";
  } else {
    el.style.display = "none";
  }
}

function showError() {
  const grid = document.getElementById("prodGrid");
  clearGrid();
  grid.innerHTML = `<div class="no-results"><div class="nr-ico">⚠️</div><p>Could not connect to server at <strong>localhost:3001</strong>. Please start your backend.</p></div>`;
}

/* ── TOAST ── */
let _tt;
function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show${type ? " " + type : ""}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ═══════════════════════════════════════════
   URL QUERY PARAMS
   ─────────────────────────────────────────
   Keeps the browser URL in sync with the
   current app state so pages & products are
   shareable / bookmarkable / back-button safe.

   Params written to URL:
     • ?product=ID   – when a product detail is open
       (also writes: title, category, brand, price,
        rating, stock for human-readable links)
     • ?category=    – active category filter
     • ?search=      – active search query
     • ?page=        – current page number
     • ?sortBy=      – sort field
     • ?sortOrder=   – ASC | DESC
     • ?minPrice=    – min price filter (if > 0)
     • ?maxPrice=    – max price filter (if < 200000)
     • ?rating=      – min rating filter (if set)
═══════════════════════════════════════════ */

/* ── Internal: build a URLSearchParams from current S state ── */
function _stateToParams() {
  const p = new URLSearchParams();

  if (S.category && S.category !== "all") p.set("category", S.category);
  if (S.search) p.set("search", S.search);
  if (S.page > 1) p.set("page", S.page);
  if (S.sortBy && S.sortBy !== "createdAt") p.set("sortBy", S.sortBy);
  if (S.sortOrder && S.sortOrder !== "DESC") p.set("sortOrder", S.sortOrder);
  if (S.minPrice > 0) p.set("minPrice", S.minPrice);
  if (S.maxPrice < 200000) p.set("maxPrice", S.maxPrice);
  if (S.rating) p.set("rating", S.rating);

  return p;
}

/* ── Push state params (filter/search/page changes) ── */
function pushStateParams() {
  const p = _stateToParams();
  const qs = p.toString();
  const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.pushState({ cartzy: "state" }, "", newUrl);
}

/* ── Push product params when detail modal opens ── */
function pushProductParams(p) {
  const params = _stateToParams(); // keep existing filter params
  params.set("product", p.id);
  params.set("title", p.title);
  params.set("category", p.category);
  if (p.brand) params.set("brand", p.brand);
  if (p.price) params.set("price", p.price);
  if (p.rating) params.set("rating_val", (p.rating || 4).toFixed(1));
  if (p.stock !== undefined) params.set("stock", p.stock);
  history.pushState(
    { cartzy: "product", id: p.id },
    "",
    `${location.pathname}?${params}`,
  );
}

/* ── Pop product params when detail modal closes ── */
function popProductParams() {
  const p = _stateToParams(); // restore filter-only params
  const qs = p.toString();
  const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.pushState({ cartzy: "state" }, "", newUrl);
}

/* ── Read URL params on page load and restore state ── */
function readParamsFromURL() {
  const p = new URLSearchParams(location.search);

  if (p.has("category") && p.get("category") !== "all")
    S.category = p.get("category");
  if (p.has("search")) S.search = p.get("search");
  if (p.has("page")) S.page = Math.max(1, parseInt(p.get("page")) || 1);
  if (p.has("sortBy")) S.sortBy = p.get("sortBy");
  if (p.has("sortOrder")) S.sortOrder = p.get("sortOrder");
  if (p.has("minPrice")) S.minPrice = parseInt(p.get("minPrice")) || 0;
  if (p.has("maxPrice")) S.maxPrice = parseInt(p.get("maxPrice")) || 200000;
  if (p.has("rating")) S.rating = p.get("rating");

  // Sync UI controls to match restored state
  _syncUIFromState();

  // If a product ID is in the URL, open its detail after products load
  if (p.has("product")) {
    const productId = parseInt(p.get("product"));
    if (productId) _pendingProductId = productId;
  }
}

/* ── Sync UI filter controls to match S state ── */
function _syncUIFromState() {
  // Search input
  const si = document.getElementById("searchInput");
  if (si && S.search) {
    si.value = S.search;
    const sc = document.getElementById("sClear");
    if (sc) sc.style.display = "flex";
  }

  // Nav category buttons
  document.querySelectorAll(".nl").forEach((b) => {
    b.classList.toggle(
      "active",
      b.dataset.cat === S.category ||
        (S.category === "all" && b.dataset.cat === "all"),
    );
  });

  // Sidebar category radio
  const catRadio = document.querySelector(`[name=fcat][value="${S.category}"]`);
  if (catRadio) catRadio.checked = true;

  // Sidebar rating radio
  if (S.rating) {
    const ratRadio = document.querySelector(`[name=frat][value="${S.rating}"]`);
    if (ratRadio) ratRadio.checked = true;
  }

  // Sort radios
  const sortVal = `${S.sortBy}|${S.sortOrder}`;
  const sortRadio = document.querySelector(`[name=fsort][value="${sortVal}"]`);
  if (sortRadio) sortRadio.checked = true;

  // Price sliders
  const slMin = document.getElementById("sliderMin");
  const slMax = document.getElementById("sliderMax");
  if (slMin) slMin.value = S.minPrice;
  if (slMax) slMax.value = S.maxPrice;
  if (typeof syncSliders === "function") syncSliders();

  // Hero/cats visibility
  const hero = document.getElementById("hero");
  const shopCats = document.getElementById("shopCats");
  const statsBar = document.getElementById("statsBar");
  if (S.category !== "all" || S.search) {
    if (hero) hero.style.display = "none";
    if (shopCats) shopCats.style.display = "none";
    if (statsBar) statsBar.style.display = "none";
  }
}

/* ── Pending product to open after first render ── */
let _pendingProductId = null;

/* ── Try to open pending product once products are rendered ── */
function _tryOpenPendingProduct() {
  if (_pendingProductId === null) return;
  const found = S.products.find((x) => x.id === _pendingProductId);
  if (found) {
    _pendingProductId = null;
    openDetail(found); // opens modal — pushProductParams is called inside openDetail
  }
  // If not found on this page, leave pending (maybe on another page)
}

/* ── Browser back/forward button support ── */
window.addEventListener("popstate", (e) => {
  const p = new URLSearchParams(location.search);

  // If no product in URL but modal is open, close it
  if (!p.has("product")) {
    const dm = document.getElementById("detailModal");
    if (dm && dm.classList.contains("open")) {
      dm.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  // Restore state from URL
  S.category = p.get("category") || "all";
  S.search = p.get("search") || "";
  S.page = parseInt(p.get("page")) || 1;
  S.sortBy = p.get("sortBy") || "createdAt";
  S.sortOrder = p.get("sortOrder") || "DESC";
  S.minPrice = parseInt(p.get("minPrice")) || 0;
  S.maxPrice = parseInt(p.get("maxPrice")) || 200000;
  S.rating = p.get("rating") || "";

  _syncUIFromState();
  fetchProducts();
});

/* ── PATCH: intercept openDetail to also push URL params ── */
const _origOpenDetail = openDetail;
openDetail = function (p) {
  pushProductParams(p); // update URL with product details
  _origOpenDetail(p); // run the original function unchanged
};

/* ── PATCH: intercept closeModal to pop product params on detail close ── */
const _origCloseModal = closeModal;
closeModal = function (id) {
  _origCloseModal(id); // run original first
  if (id === "detailModal") {
    popProductParams(); // restore filter-only URL
  }
};

/* ── PATCH: intercept fetchProducts to push state params after each fetch ── */
const _origFetchProducts = fetchProducts;
fetchProducts = async function () {
  await _origFetchProducts();
  pushStateParams(); // update URL to reflect current filters/page
  _tryOpenPendingProduct(); // open product from URL if pending
};

/* ── INIT: read URL params before first fetch ── */
// We hook into DOMContentLoaded — but since it may have already fired,
// we use a small wrapper that is safe either way.
(function initURLParams() {
  function run() {
    readParamsFromURL();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run(); // DOM already ready
  }
})();
