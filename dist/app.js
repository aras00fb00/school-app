/* =========================================================
0) CORE / STATE + HELPERS (App Namespace) — FINAL
- ✅ Özellik/fonksiyon silinmedi
- ✅ Duplicate handler/DOM thrash/yarış durumları azaltıldı
- ✅ Guard + throttle + abort + delegate + leak fix
========================================================= */

const ORS_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdlMTk4ZTE0MTg5ZTRjNzJiMDY2MjM0NDM3ZTEyNjIxIiwiaCI6Im11cm11cjY0In0=";

window.App = window.App || {
  inited: {
    accordion: false,
    pages: false,
    miniMap: false,
    mainMap: false,
    mapUi: false,
    school: false,
    routes: false,
    mapSearch: false,
    hoverGhost: false,
    panel: false,
    students: false,
    services: false,
    panelSearch: false,
    statusHeaders: false,
    __panelSearchOutsideClose: false,
    schoolLock: false,
    studentPopups: false
  },

  map: null,
  miniMap: null,

  // route state
  routes: [],
  routeLabels: [],
  activeSearchSelection: null,

  // school state
  school: {
    editPermission: { canEdit: false },
    state: {
      status: "none", // none | preview | fixed
      latlng: null,
      address: null,
      marker: null
    }
  },

  // panel state
  panel: {
    markers: new Map(),
    students: [],
    serviceState: { svA: [], svB: [], svC: [], svD: [], svE: [], svF: [], assignable: [] },
    __markersReady: false
  },

  ui: {
    schoolLock: {
      active: false,
      previewLatLng: null,
      previewAddress: null,
      __searchTimer: null,
      __toastTimer: null,
      __pendingStudentId: null
    },
    studentsTab: {
      openId: null,
      __hoverId: null,
      __pulseLayer: null,
      __pulseTimer: null
    }
  },

  timers: {
    searchTimeout: null
  },

  utils: {
    __bound: new WeakMap(),
    isFn(fn) { return typeof fn === "function"; },
    clamp(n, a, b) { return Math.max(a, Math.min(b, n)); },
    raf2(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); },
    once(key, fn) {
      window.App.__once = window.App.__once || new Set();
      if (window.App.__once.has(key)) return;
      window.App.__once.add(key);
      fn();
    },
    bindOnce(el, key, type, handler, opts) {
      if (!el) return;
      const wm = window.App.utils.__bound;
      let map = wm.get(el);
      if (!map) { map = new Set(); wm.set(el, map); }
      const k = key + "::" + type;
      if (map.has(k)) return;
      map.add(k);
      el.addEventListener(type, handler, opts);
    },
    debounce(fn, wait = 250) {
      let t = null;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },
    throttle(fn, wait = 200) {
      let last = 0;
      let t = null;
      let lastArgs = null;
      return function (...args) {
        const now = Date.now();
        const remaining = wait - (now - last);
        lastArgs = args;
        if (remaining <= 0) {
          last = now;
          fn.apply(this, args);
        } else if (!t) {
          t = setTimeout(() => {
            t = null;
            last = Date.now();
            fn.apply(this, lastArgs);
          }, remaining);
        }
      };
    },
    safeJSONParse(s, fallback = null) {
      try { return JSON.parse(s); } catch (e) { return fallback; }
    },
    fetchWithTimeout(url, opts = {}, timeoutMs = 9000) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const merged = { ...opts, signal: ctrl.signal };
      return fetch(url, merged).finally(() => clearTimeout(t));
    }
  },

  hooks: {
    panelSearch: {
      hiddenByMenu: false,
      onMenuToggle: [],
      onHideSuggest: []
    }
  }
};

// Back-compat globals
window.__routes = window.__routes || window.App.routes;
window.__routeLabels = window.__routeLabels || window.App.routeLabels;
window.__activeSearchSelection = window.__activeSearchSelection || window.App.activeSearchSelection;

window.__schoolState = window.__schoolState || window.App.school.state;
window.SchoolState = window.__schoolState;

// Map proxy (getMap() davranışı korunur)
window.MapController = window.MapController || {};
try {
  Object.defineProperty(window.MapController, "map", {
    configurable: true,
    get() {
      return window.App.map || window.__mainMap || this.___map || null;
    },
    set(v) {
      this.___map = v;
      window.__mainMap = v;
      window.App.map = v;
    }
  });
} catch (e) {
  window.MapController.map = window.App.map || window.__mainMap || null;
}

function getMap() {
  return window.App.map || window.__mainMap || (window.MapController && window.MapController.map) || null;
}
function getSchoolState() {
  return window.__schoolState || window.SchoolState || null;
}
function isSchoolFixed() {
  const st = getSchoolState();
  return !!(st && st.status === "fixed" && st.latlng);
}

/* =========================================================
✅ UI STYLE INJECT (JS içinde minimal zorunlu stiller) — FINAL
- ✅ idempotent (tek kez)
- ✅ mapSearchDock (nav altı ortalı) + panel-search navdock stilleri eklendi
========================================================= */
function ensureInjectedUiStyles() {
  if (document.getElementById("__appInjectedStyles")) return;

  const style = document.createElement("style");
  style.id = "__appInjectedStyles";
  style.textContent = `
    /* marker service badge colors */
    .svc-badge{display:inline-flex;align-items:center;justify-content:center;
      font-weight:800;font-size:10px;line-height:1;
      width:16px;height:16px;border-radius:4px;margin-left:4px;
      box-shadow:0 0 0 2px rgba(0,0,0,.25);
      color:#111;background:#fff;
    }
    .svc-A{background:#ff4d4d;color:#111;}
    .svc-B{background:#ffcd39;color:#111;}
    .svc-C{background:#75b798;color:#111;}
    .svc-D{background:#0dcaf0;color:#111;}
    .svc-E{background:#b197fc;color:#111;}
    .svc-F{background:#ff7edb;color:#111;}

    /* Students tab accordion */
    .stu-acc{border:1px solid rgba(255,255,255,.08);border-radius:4px;overflow:hidden;margin:6px 0;background:rgba(255,255,255,.03);}
    .stu-acc .stu-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px;cursor:pointer;}
    .stu-acc .stu-head .left{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
    .stu-acc .stu-head .title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .stu-acc .stu-head .sub{font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .stu-acc .stu-head .svcNo{font-size:11px;opacity:.85;white-space:nowrap;}
    .stu-acc .stu-body{display:none;padding:10px;border-top:1px solid rgba(255,255,255,.08);}
    .stu-acc.is-open .stu-body{display:block;}
    .stu-acc.is-highlight{box-shadow:0 0 0 2px rgba(13,202,240,.35), 0 0 18px rgba(13,202,240,.25);}

    /* popup tune */
    .leaflet-popup-content-wrapper{background:transparent;box-shadow:none}
    .leaflet-popup-content{margin:0}

    /* marker popup student card */
    .stu-card{min-width:260px;max-width:320px;padding:10px;border-radius:4px;
      background:rgba(20,20,20,.92);color:#fff;border:1px solid rgba(255,255,255,.10);
      box-shadow:0 12px 26px rgba(0,0,0,.35);
    }
    .stu-card .top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
    .stu-card .nm{font-weight:800;font-size:13px;line-height:1.15;max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .stu-card .meta{font-size:11px;opacity:.78;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .stu-card .pill{font-size:11px;font-weight:800;padding:4px 8px;border-radius:4px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
    .stu-card .addr{font-size:12px;opacity:.9;padding:8px 9px;border-radius:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
    .stu-card .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    .stu-card .kv{padding:8px 9px;border-radius:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .stu-card .k{font-size:11px;opacity:.72;margin-bottom:3px}
    .stu-card .v{font-size:12px;font-weight:700;opacity:.92}
    .stu-card .actions{display:flex;gap:8px;margin-top:10px}

    .split{display:inline-flex;align-items:center;border-radius:4px;overflow:hidden;
      border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);
    }
    .split button{border:none;background:transparent;color:#fff;cursor:pointer}
    .split .main{padding:9px 10px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:8px}
    .split .more{width:36px;display:inline-flex;align-items:center;justify-content:center;border-left:1px solid rgba(255,255,255,.12)}
    .split:hover{background:rgba(255,255,255,.10)}
    .split:active{transform:scale(.995)}
    .split button[disabled]{opacity:.45;cursor:not-allowed}

    .split-menu{position:absolute;z-index:9999;min-width:170px;color:#eee;
      border-radius:4px;background:rgba(20,20,20,.96);border:1px solid rgba(255,255,255,.12);
      box-shadow:0 14px 30px rgba(0,0,0,.45);overflow:hidden;
    }
    .split-menu .mi{padding:10px;font-size:12px;cursor:pointer;display:flex;gap:8px;align-items:center}
    .split-menu .mi:hover{background:rgba(255,255,255,.07)}
    .split-menu .mi[aria-disabled="true"]{opacity:.45;cursor:not-allowed}
    .split-menu .sep{height:1px;background:rgba(255,255,255,.08);margin:4px 0}

    /* suggest pointer */
    #search-suggest .item{cursor:pointer}

    /* ✅ NAV ALTINDA ORTALI ARAMA DOCK */
    #mapSearchDock{
      width: 100%;
      display:none;
      position: relative;
      padding: 10px 0 4px;
    }
    #mapSearchDock #panel-search.is-navdock{
      margin: 0 auto;
      width: min(360px, calc(100% - 24px));
      display:block;
      pointer-events:auto;
    }
    #mapSearchDock #panel-search.is-navdock *{pointer-events:auto;}
  `;
  document.head.appendChild(style);
}

/* =========================================================
🔒 SCHOOL LOCK (toast + blur modal)
========================================================= */
function showSchoolLockUI() {
  const toast = document.getElementById("schoolLockToast");
  const modal = document.getElementById("schoolLockModal");
  if (toast) toast.style.display = "flex";
  if (modal) modal.classList.add("active");
  window.App.ui.schoolLock.active = true;
}
function hideSchoolLockUI() {
  const toast = document.getElementById("schoolLockToast");
  const modal = document.getElementById("schoolLockModal");
  if (toast) toast.style.display = "none";
  if (modal) modal.classList.remove("active");
  window.App.ui.schoolLock.active = false;
}
function enforceSchoolLock() {
  if (isSchoolFixed()) {
    hideSchoolLockUI();
    return true;
  }
  showSchoolLockUI();
  return false;
}
function openSchoolLockModal() { showSchoolLockUI(); }

function softToast(msg, type = "info") {
  const id = "__softToast";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "app-toast";
    document.body.appendChild(el);
  }
  el.style.pointerEvents = "none";
  el.style.display = "flex";
  el.style.background =
    type === "ok" ? "rgba(117,183,152,.18)" :
    type === "warn" ? "rgba(255,205,57,.18)" :
    "rgba(13,202,240,.16)";
  el.style.color = "#fff";
  el.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${msg}</span>`;

  clearTimeout(window.App.ui.schoolLock.__toastTimer);
  window.App.ui.schoolLock.__toastTimer = setTimeout(() => { el.style.display = "none"; }, 1200);
}

function requireSchoolFixedOrRedirect(message = "") {
  if (isSchoolFixed()) return true;
  if (message) softToast(message, "warn");
  openSchoolLockModal();
  return false;
}

/* =========================================================
Route midpoint helper (labels)
========================================================= */
window.getRouteMidLatLng =
  window.getRouteMidLatLng ||
  function (routeLayer) {
    try {
      const feature = routeLayer?.toGeoJSON()?.features?.[0];
      const coords = feature?.geometry?.coordinates;
      if (!coords || coords.length === 0) return null;
      const mid = Math.floor(coords.length / 2);
      return L.latLng(coords[mid][1], coords[mid][0]);
    } catch (e) {
      return null;
    }
  };

/* =========================================================
1) MENU / ACCORDION + MENU GUARDS — FINAL
========================================================= */
(function initAccordion() {
  if (window.App.inited.accordion) return;
  window.App.inited.accordion = true;

  $(function () {
    const $accordion = $("#accordion");
    const $submenus = $accordion.find(".submenu");
    const $nav = $(".nav-wrapper");

    function setMenuOpenState(isOpen) {
      if (typeof window.setPanelSearchHiddenByMenu === "function") {
        window.setPanelSearchHiddenByMenu(!!isOpen);
        return;
      }

      const wrap = document.getElementById("panel-wrap");
      const toggle = document.getElementById("panelToggle");
      const search = document.getElementById("panel-search");

      if (wrap) wrap.style.display = isOpen ? "none" : "";
      if (toggle) toggle.style.display = isOpen ? "none" : "";
      if (search) search.style.display = isOpen ? "none" : "";
    }

    $accordion.off("click.__acc", ".link").on("click.__acc", ".link", function (e) {
      e.preventDefault();

      const $box = $(this).next(".submenu");
      const $toggle = $(this).find(".toggle");
      const willOpen = !$box.is(":visible");

      $box.stop(true, true).slideToggle(320);
      $(this).parent().toggleClass("open", willOpen);
      $toggle.text(willOpen ? "−" : "+");

      $submenus
        .not($box)
        .stop(true, true)
        .slideUp(320)
        .parent()
        .removeClass("open")
        .find(".toggle")
        .text("+");

      setMenuOpenState(willOpen);
    });

    $(window).off("scroll.__navfull").on("scroll.__navfull", function () {
      if ($(this).scrollTop() > 20) $nav.addClass("full");
      else $nav.removeClass("full");
    });
  });
})();

function closeMenuUI() {
  $("#accordion .submenu").stop(true, true).slideUp(200);
  $("#accordion > li").removeClass("open");
  $("#accordion .toggle").text("+");

  if (typeof window.setPanelSearchHiddenByMenu === "function") {
    window.setPanelSearchHiddenByMenu(false);
  } else {
    const wrap = document.getElementById("panel-wrap");
    const toggle = document.getElementById("panelToggle");
    const search = document.getElementById("panel-search");
    if (wrap) wrap.style.display = "";
    if (toggle) toggle.style.display = "";
    if (search) search.style.display = "";
  }
}

(function initMenuGuards() {
  $("#accordion")
    .off("click.menuGuards", ".submenu a")
    .on("click.menuGuards", ".submenu a", function () { closeMenuUI(); });

  $(document)
    .off("click.menuGuards")
    .on("click.menuGuards", function (e) {
      if (!$(e.target).closest(".nav-wrapper").length) closeMenuUI();
    });

  $("#accordion")
    .off("click.menuGuards2", ".link")
    .on("click.menuGuards2", ".link", function (e) { e.stopPropagation(); });

  $("#accordion")
    .off("click.menuGuards3", ".submenu a")
    .on("click.menuGuards3", ".submenu a", function (e) { e.stopPropagation(); });
})();

/* =========================================================
2) PAGES (Dashboard ↔ Maps ↔ Students) — FINAL
========================================================= */
(function initPages() {
  if (window.App.inited.pages) return;
  window.App.inited.pages = true;

  function $dashboardPage(){ return $("#pageDashboard"); }
  function $mapsPage(){ return $("#pageMaps"); }
  function $studentsPage(){ return $("#pageStudents"); }

  function setPanelVisible(on) {
    const wrap = document.getElementById("panel-wrap");
    const toggle = document.getElementById("panelToggle");

    if (wrap) wrap.style.display = on ? "" : "none";
    if (toggle) toggle.style.display = on ? "" : "none";
    if (!on && wrap) wrap.classList.remove("open");
  }

  function hideAllPages() {
    $dashboardPage().removeClass("active");
    $mapsPage().removeClass("active");
    $studentsPage().removeClass("active");
  }

  function showDashboard() {
    hideAllPages();
    $dashboardPage().addClass("active");

    setPanelVisible(false);
    hideSchoolLockUI();

    try { if (typeof window.setMapSearchVisible === "function") window.setMapSearchVisible(false); } catch(e){}
    try { if (typeof window.StudentsPageDestroy === "function") window.StudentsPageDestroy(); } catch(e){}

    if (window.App.miniMap) setTimeout(() => window.App.miniMap.invalidateSize(true), 50);
  }

  function showMaps() {
    closeMenuUI();

    hideAllPages();
    $mapsPage().addClass("active");

    setPanelVisible(true);

    window.App.utils.raf2(() => {
      initMainMap();
      const map = getMap();
      if (map) map.invalidateSize(true);

      enforceSchoolLock();

      try {
        if (typeof window.setMapSearchVisible === "function") window.setMapSearchVisible(isSchoolFixed());
      } catch(e){}
    });

    try { if (typeof window.StudentsPageDestroy === "function") window.StudentsPageDestroy(); } catch(e){}
  }

  function showStudents() {
    closeMenuUI();

    hideAllPages();
    $studentsPage().addClass("active");

    setPanelVisible(false);
    hideSchoolLockUI();

    try { if (typeof window.setMapSearchVisible === "function") window.setMapSearchVisible(false); } catch(e){}
    try { if (typeof window.StudentsPageInit === "function") window.StudentsPageInit(); } catch(e){}
  }

  // =========================================================
  // ✅ TEK ROUTER HANDLER (ezilmeye dayanıklı)
  // - Menü + dashboard kartları + butonlar
  // - data-page olan her şeyi yönetir
  // =========================================================
  $(document)
    .off("click.routerPages", "[data-page]")
    .on("click.routerPages", "[data-page]", function (e) {
      const page = this.getAttribute("data-page");
      if (!page) return;

      // link/button varsayılanını engelle
      e.preventDefault();

      // Eğer başka handler'lar stopPropagation yapıyorsa bile
      // document delegation çoğu senaryoda çalışır.
      // (Ama capture değil; yine de en dayanıklı yol bu.)

      if (page === "maps") return showMaps();
      if (page === "students") return showStudents();
      if (page === "dashboard") return showDashboard();
    });

  function showStudents() {
    closeMenuUI();

    hideAllPages();
    $studentsPage.addClass("active");

    // maps UI kapat
    setPanelVisible(false);
    hideSchoolLockUI();

    try { if (typeof window.setMapSearchVisible === "function") window.setMapSearchVisible(false); } catch(e){}

    // students init
    try { if (typeof window.StudentsPageInit === "function") window.StudentsPageInit(); } catch(e){}
  }

  // Menü linkleri
  $("#accordion")
    .off("click.pages", ".submenu a[data-page='maps']")
    .on("click.pages", ".submenu a[data-page='maps']", function (e) {
      e.preventDefault();
      showMaps();
    });

  $("#accordion")
    .off("click.pages", ".submenu a[data-page='students']")
    .on("click.pages", ".submenu a[data-page='students']", function (e) {
      e.preventDefault();
      showStudents();
    });

  // Dashboard kartları (data-page olan her şey)
  $(document)
    .off("click.pages", "[data-page='maps']")
    .on("click.pages", "[data-page='maps']", function (e) {
      e.preventDefault();
      showMaps();
    });

  $(document)
    .off("click.pages", "[data-page='students']")
    .on("click.pages", "[data-page='students']", function (e) {
      e.preventDefault();
      showStudents();
    });

  // Map geri
  $("#backToDashboard")
    .off("click.pages")
    .on("click.pages", function (e) {
      e.preventDefault();
      showDashboard();
    });

  // Students geri (butonuna data-page="dashboard" verdiysen bu da çalışır)
  $(document)
    .off("click.pages", "[data-page='dashboard']")
    .on("click.pages", "[data-page='dashboard']", function (e) {
      e.preventDefault();
      showDashboard();
    });

  function initMiniMap() {
    if (window.App.inited.miniMap) return;
    window.App.inited.miniMap = true;

    const el = document.getElementById("miniMap");
    if (!el) return;

    const mini = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false
    }).setView([41.015, 28.979], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(mini);
    window.App.miniMap = mini;
    window.__miniMap = mini;
  }

  $(initMiniMap);

  // başlangıçta hangi sayfa aktifse ona göre UI
  if ($mapsPage.hasClass("active")) setPanelVisible(true);
  else setPanelVisible(false);
})();

/* =========================================================
MAIN MAP + MODULE BOOTSTRAP — FINAL
========================================================= */
function initMainMap() {
  // ✅ Var olan map'i yakala (daha önce oluşturulmuş olabilir)
  const existing = getMap();
  if (existing) {
    window.App.map = existing;
    window.__mainMap = existing;
    try { window.MapController.map = existing; } catch (e) {}
    window.App.inited.mainMap = true;

    initMapUI(existing);
    initSchoolModule(existing);
    initRouteModule(existing);
    initSchoolLockModule(existing);
    initPanelModules(existing);
    initStudentPopupModule(existing);

    return;
  }

  const el = document.getElementById("mainMap");
  if (!el) return;

  const map = L.map(el, {
    zoomControl: false,
    fullscreenControl: false
  }).setView([41.067217, 29.049597], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

  window.App.map = map;
  window.__mainMap = map;
  window.MapController.map = map;

  window.App.inited.mainMap = true;

  if (!map.__routeLabelBound) {
    map.__routeLabelBound = true;
    map.on("moveend", window.App.utils.throttle(() => {
      const pool = window.App.routeLabels || [];
      pool.forEach((item) => {
        const p = window.getRouteMidLatLng(item.routeLayer);
        if (p && item.label) item.label.setLatLng(p);
      });
    }, 120));
  }

  initMapUI(map);
  initSchoolModule(map);
  initRouteModule(map);
  initSchoolLockModule(map);
  initPanelModules(map);
  initStudentPopupModule(map);
}

function initMapUI(map) {
  if (window.App.inited.mapUi) return;
  window.App.inited.mapUi = true;

  try { map.zoomControl && map.zoomControl.remove(); } catch(e){}
  try { map.fullscreenControl && map.fullscreenControl.remove(); } catch(e){}

  const $icon = $("#mapFullscreen i");

  function setFsIcon(isFs) {
    if (!$icon.length) return;
    if (isFs) $icon.removeClass("fa-expand").addClass("fa-compress");
    else $icon.removeClass("fa-compress").addClass("fa-expand");
  }
  function isNativeFullscreen() { return !!document.fullscreenElement; }
  function toggleNativeFullscreen() {
    const el = map.getContainer();
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  window.App.utils.bindOnce(document, "fschange", "fullscreenchange", () => {
    setFsIcon(isNativeFullscreen());
    setTimeout(() => map.invalidateSize(true), 80);
  });

  $("#mapZoomIn").off("click.mapUi").on("click.mapUi", function () { map.zoomIn(); });
  $("#mapZoomOut").off("click.mapUi").on("click.mapUi", function () { map.zoomOut(); });
  $("#mapFullscreen").off("click.mapUi").on("click.mapUi", function () { toggleNativeFullscreen(); });

  setFsIcon(isNativeFullscreen());
}

/* =========================================================
4) SCHOOL MODULE — FINAL
- ✅ okul sabitlenince arama box (nav dock) görünür
========================================================= */
function initSchoolModule(map) {
  if (window.App.inited.school) return;
  window.App.inited.school = true;

  window.App.school.editPermission = window.App.school.editPermission || { canEdit: false };
  window.__schoolEditPermission = window.__schoolEditPermission || window.App.school.editPermission;

  window.App.school.state = window.App.school.state || window.__schoolState || {
    status: "none",
    latlng: null,
    address: null,
    marker: null
  };
  window.__schoolState = window.App.school.state;
  window.SchoolState = window.__schoolState;

  const SCHOOL_RGB = "171,41,106";
  window.SCHOOL_RGB = window.SCHOOL_RGB || SCHOOL_RGB;

  window.schoolIcon =
    window.schoolIcon ||
    function schoolIcon(isPreview = true) {
      return L.divIcon({
        className: "",
        html: `
          <div class="school-preview ${isPreview ? "is-preview" : ""}">
            <i class="fa-solid fa-school"></i>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
    };

  window.schoolFixedIcon =
    window.schoolFixedIcon ||
    function schoolFixedIcon() {
      return L.divIcon({
        className: "",
        html: `
          <div style="
            width:48px;height:48px;
            background:rgba(255,255,255,.5);
            border-radius:20%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 0 4px rgba(${SCHOOL_RGB},.35), 0 6px 18px rgba(0,0,0,.35);
          ">
            <i class="fa-solid fa-school" style="color:rgb(${SCHOOL_RGB});font-size:24px"></i>
          </div>
        `,
        iconSize: [64, 64],
        iconAnchor: [32, 32]
      });
    };

  window.renderSchoolUI =
    window.renderSchoolUI ||
    function renderSchoolUI() {
      const st = window.__schoolState;
      const $panel = $("#schoolPanel");
      const $toggle = $("#schoolPanelToggle");
      const $addr = $("#schoolAddress");
      const $fixBtn = $("#schoolFixBtn");

      $toggle.removeClass("danger warning success info primary secondary locked");

      if (st.status === "none") {
        $panel.removeClass("active");
        $toggle.addClass("danger").show();
        $addr.text("Okul adresi seçilmedi.");
        $fixBtn.prop("disabled", true);
        return;
      }

      if (st.status === "preview") {
        $panel.addClass("active");
        $toggle.addClass("warning").show();
        $addr.text(st.address || "Seçilen konum");
        $fixBtn.prop("disabled", false);
        return;
      }

      if (st.status === "fixed") {
        $panel.removeClass("active");
        $toggle.addClass("success locked").show();
        $addr.text(st.address || "Sabit okul");
        $fixBtn.prop("disabled", true);
      }
    };

  $("#schoolPanelClose").off("click.school").on("click.school", function (e) {
    e.preventDefault();
    e.stopPropagation();

    $("#schoolPanel").removeClass("active");
    $("#schoolPanelToggle").show();

    if (typeof window.setPickSchoolMode === "function") window.setPickSchoolMode(false);

    const st = window.__schoolState;
    if (st?.marker) {
      const el = st.marker.getElement();
      el?.querySelector(".school-preview")?.classList.remove("is-preview");
    }
  });

  $("#schoolPanelToggle").off("click.school").on("click.school", function (e) {
    e.preventDefault();
    if (e.detail > 1) return;

    const st = window.__schoolState;

    if (st.status === "fixed" && st.latlng) {
      map.flyTo([st.latlng.lat, st.latlng.lng], 17, { animate: true, duration: 0.8 });
      return;
    }

    $("#schoolPanel").addClass("active");
    $(this).hide();
  });

  $("#schoolPanelToggle").off("dblclick.school").on("dblclick.school", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const st = window.__schoolState;
    if (st.status !== "fixed") return;

    if (!window.__schoolEditPermission.canEdit) {
      alert("Düzenleme yetkiniz bulunmamaktadır.");
      return;
    }

    st.status = "preview";

    $("#schoolPanel").addClass("active");
    $(this).hide();

    window.setPickSchoolMode(true);

    if (st.marker) {
      st.marker.setIcon(window.schoolIcon(true));
      st.marker.dragging && st.marker.dragging.enable();
      const el = st.marker.getElement();
      el?.querySelector(".school-preview")?.classList.add("is-preview");
    }

    window.renderSchoolUI();
  });

  window.__pickSchoolMode = window.__pickSchoolMode || false;

  window.setPickSchoolMode =
    window.setPickSchoolMode ||
    function setPickSchoolMode(on) {
      window.__pickSchoolMode = !!on;
      $("#schoolPickBtn")
        .toggleClass("danger", window.__pickSchoolMode)
        .toggleClass("info", !window.__pickSchoolMode);

      $("#schoolPickBtn i")
        .toggleClass("fa-location-crosshairs", !window.__pickSchoolMode)
        .toggleClass("fa-hand-pointer", window.__pickSchoolMode);
    };

  $("#schoolPickBtn").off("click.school").on("click.school", function (e) {
    e.preventDefault();
    if (window.__schoolState.status === "fixed") return;
    window.setPickSchoolMode(!window.__pickSchoolMode);
  });

  window.reverseGeocodeTR =
    window.reverseGeocodeTR ||
    async function reverseGeocodeTR(lat, lon) {
      reverseGeocodeTR._cache = reverseGeocodeTR._cache || new Map();
      reverseGeocodeTR._inflight = reverseGeocodeTR._inflight || new Map();

      const key = lat.toFixed(5) + "," + lon.toFixed(5);
      if (reverseGeocodeTR._cache.has(key)) return reverseGeocodeTR._cache.get(key);
      if (reverseGeocodeTR._inflight.has(key)) return reverseGeocodeTR._inflight.get(key);

      const url =
        "https://nominatim.openstreetmap.org/reverse" +
        "?format=json&zoom=18&addressdetails=1&accept-language=tr" +
        "&lat=" + encodeURIComponent(lat) +
        "&lon=" + encodeURIComponent(lon);

      const p = (async () => {
        try {
          const res = await window.App.utils.fetchWithTimeout(url, {
            headers: { "Accept-Language": "tr", "Accept": "application/json" }
          }, 8000);

          const data = await res.json().catch(() => ({}));
          const address = (data && (data.display_name || "")) || "";
          reverseGeocodeTR._cache.set(key, address);
          return address;
        } catch (e) {
          return "";
        } finally {
          reverseGeocodeTR._inflight.delete(key);
        }
      })();

      reverseGeocodeTR._inflight.set(key, p);
      return p;
    };

  // ✅ okul sabitlenince: kilit UI kapanır + arama dock görünür
  function onSchoolFixed() {
    hideSchoolLockUI();
    try { if (typeof window.setMapSearchVisible === "function") window.setMapSearchVisible(true); } catch(e){}
  }
  window.App.onSchoolFixed = onSchoolFixed;

  let __rgTimer = null;
  map.on("click", function (ev) {
    if (!window.__pickSchoolMode) return;
    if (window.__schoolState.status === "fixed") return;

    const latlng = ev.latlng;

    if (window.__schoolState.marker) {
      window.__schoolState.marker.setLatLng(latlng);
    } else {
      window.__schoolState.marker = L.marker(latlng, {
        icon: window.schoolIcon(true),
        interactive: true,
        draggable: true,
        keyboard: false
      }).addTo(map);

      window.__schoolState.marker.off("dragend").on("dragend", async function (e) {
        const pos = e.target.getLatLng();
        window.__schoolState.latlng = pos;
        const addr = await window.reverseGeocodeTR(pos.lat, pos.lng);
        window.__schoolState.address = addr || "Seçilen konum";
        window.renderSchoolUI();
      });
    }

    window.__schoolState.status = "preview";
    window.__schoolState.latlng = latlng;

    requestAnimationFrame(() => {
      const el = window.__schoolState.marker?.getElement();
      el?.querySelector(".school-preview")?.classList.add("is-preview");
    });

    clearTimeout(__rgTimer);
    __rgTimer = setTimeout(async () => {
      const addr = await window.reverseGeocodeTR(latlng.lat, latlng.lng);
      window.__schoolState.address = addr || "Seçilen konum";
      window.renderSchoolUI();
    }, 220);
  });

  $("#schoolFixBtn").off("click.school").on("click.school", async function (e) {
    e.preventDefault();

    const st = window.__schoolState;
    if (st.status !== "preview" || !st.latlng) return;

    st.status = "fixed";
    window.setPickSchoolMode(false);

    window.__schoolLatLng = st.latlng;
    window.__schoolState = st;
    window.SchoolState = window.__schoolState;
    window.App.school.state = window.__schoolState;

    if (st.marker) {
      st.marker.dragging && st.marker.dragging.disable();
      st.marker.setIcon(window.schoolFixedIcon());
    }

    $("#schoolPanel").removeClass("active");
    $("#schoolPanelToggle").addClass("locked").show();

    window.renderSchoolUI();
    window.App.onSchoolFixed?.();
  });

  window.setSchoolFromSearch =
    window.setSchoolFromSearch ||
    async function setSchoolFromSearch(lat, lon, addrText = "") {
      const st = window.__schoolState;
      const latlng = L.latLng(lat, lon);

      if (st.status === "fixed") {
        map.flyTo([lat, lon], 16, { animate: true });
        return;
      }

      st.status = "preview";
      st.latlng = latlng;
      st.address = addrText || (await window.reverseGeocodeTR(lat, lon)) || "Seçilen konum";

      if (st.marker) {
        st.marker.setLatLng(latlng);
        st.marker.setIcon(window.schoolIcon(true));
        st.marker.dragging && st.marker.dragging.enable();
      } else {
        st.marker = L.marker(latlng, {
          icon: window.schoolIcon(true),
          interactive: true,
          draggable: true,
          keyboard: false
        }).addTo(map);

        st.marker.off("dragend").on("dragend", async function (e) {
          const pos = e.target.getLatLng();
          st.latlng = pos;
          st.address = (await window.reverseGeocodeTR(pos.lat, pos.lng)) || "Seçilen konum";
          window.renderSchoolUI();
        });
      }

      requestAnimationFrame(() => {
        const el = st.marker?.getElement();
        el?.querySelector(".school-preview")?.classList.add("is-preview");
      });

      window.renderSchoolUI();
      map.flyTo([lat, lon], 16, { animate: true });
    };

  window.renderSchoolUI();
}

/* =========================================================
5) ROUTE MODULE (single route + labels + ORS) — FINAL
========================================================= */
function initRouteModule(map) {
  if (window.App.inited.routes) return;
  window.App.inited.routes = true;

  window.App.routes = window.App.routes || [];
  window.App.routeLabels = window.App.routeLabels || [];
  window.__routes = window.App.routes;
  window.__routeLabels = window.App.routeLabels;

  window.App.singleRoute = window.App.singleRoute || { marker: null, route: null, label: null };

  function clearSingleRoute() {
    const sr = window.App.singleRoute;
    if (sr.label) { try { map.removeLayer(sr.label); } catch (e) {} sr.label = null; }
    if (sr.route) { try { map.removeLayer(sr.route); } catch (e) {} sr.route = null; }
    if (sr.marker) { try { map.removeLayer(sr.marker); } catch (e) {} sr.marker = null; }
  }

  function trafficFactor(hour) {
    if (hour >= 7 && hour <= 9) return 1.35;
    if (hour >= 16 && hour <= 19) return 1.45;
    return 1.10;
  }

  async function drawRealRoute(map, from, to, color) {
    drawRealRoute._cache = drawRealRoute._cache || new Map();

    const fr = { lat: +from.lat.toFixed(5), lng: +from.lng.toFixed(5) };
    const tr = { lat: +to.lat.toFixed(5), lng: +to.lng.toFixed(5) };
    const key = `${fr.lat},${fr.lng}|${tr.lat},${tr.lng}|${color}`;
    if (drawRealRoute._cache.has(key)) return drawRealRoute._cache.get(key);

    const res = await window.App.utils.fetchWithTimeout(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: ORS_KEY },
        body: JSON.stringify({
          coordinates: [
            [fr.lng, fr.lat],
            [tr.lng, tr.lat]
          ]
        })
      },
      12000
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("ORS error:", res.status, txt);
      throw new Error(`ORS hata: ${res.status}`);
    }

    const geo = await res.json().catch(() => null);
    const feat = geo?.features?.[0];
    const summary = feat?.properties?.summary;

    if (!feat || !summary) {
      console.error("ORS invalid response:", geo);
      throw new Error("ORS response invalid");
    }

    const km = (summary.distance / 1000).toFixed(2);
    const baseMin = summary.duration / 60;

    const morning = Math.round(baseMin * trafficFactor(8));
    const evening = Math.round(baseMin * trafficFactor(17));

    const layer = L.geoJSON(geo, {
      style: { color: color, weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round" }
    });

    layer.routeInfo = { km, base: Math.round(baseMin), morning, evening };
    drawRealRoute._cache.set(key, layer);
    return layer;
  }

  window.App._drawRealRoute = drawRealRoute;

  window.addRouteLabel =
    window.addRouteLabel ||
    function addRouteLabel(map, routeLayer, textColor = "#1e8e3e") {
      const mid = window.getRouteMidLatLng(routeLayer);
      if (!mid) return null;
      const info = routeLayer.routeInfo || { km: "?", morning: "?", evening: "?" };
      const html = `
        <div class="gmaps-route-label">
          <div class="gmaps-icon">🚗</div>
          <div class="gmaps-text">
            <div class="gmaps-time" style="color:${textColor}">${info.morning} dk</div>
            <div class="gmaps-dist">${info.km} km</div>
          </div>
        </div>
      `;
      return L.marker(mid, {
        interactive: false,
        icon: L.divIcon({ className: "", html, iconSize: [160, 38], iconAnchor: [80, 19] })
      }).addTo(map);
    };

  window.drawSingleRouteToSchool =
    window.drawSingleRouteToSchool ||
    async function drawSingleRouteToSchool(lat, lng) {
      if (!requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.")) return;

      const st = getSchoolState();
      const theme = { line: "rgba(176,42,55,.65)", text: "#b02a37" };

      try {
        clearSingleRoute();

        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          color: theme.text,
          weight: 2,
          fillOpacity: 0
        }).addTo(map);

        const route = await drawRealRoute(map, { lat, lng }, st.latlng, theme.line);
        route.addTo(map);

        const label = window.addRouteLabel(map, route, theme.text);

        window.App.singleRoute.marker = marker;
        window.App.singleRoute.route = route;
        window.App.singleRoute.label = label;

        map.fitBounds(route.getBounds(), { padding: [60, 60] });
      } catch (err) {
        console.error(err);
        alert("Rota çizilemedi. ORS hatasını kontrol et (API key / limit / CORS).");
      }
    };
}

/* =========================================================
🔒 6) SCHOOL LOCK MODULE — FINAL
========================================================= */
function initSchoolLockModule(map) {
  if (window.App.inited.schoolLock) return;
  window.App.inited.schoolLock = true;

  const modal = document.getElementById("schoolLockModal");
  const input = document.getElementById("schoolLockSearchInput");
  const results = document.getElementById("schoolLockSearchResults");
  const selectedText = document.getElementById("schoolLockSelectedText");
  const fixBtn = document.getElementById("schoolLockFixBtn");
  if (!modal || !input || !results || !selectedText || !fixBtn) return;

  let _searchAbort = null;

  async function nomSearch(q) {
    if (_searchAbort) { try { _searchAbort.abort(); } catch(e){} }
    _searchAbort = new AbortController();

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      "format=json&limit=6&countrycodes=tr&accept-language=tr&q=" +
      encodeURIComponent(q);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: _searchAbort.signal
    });

    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }

  function setPreview(lat, lon, label) {
    window.setSchoolFromSearch?.(lat, lon, label || "");

    window.App.ui.schoolLock.previewLatLng = L.latLng(lat, lon);
    window.App.ui.schoolLock.previewAddress = label || "Seçilen konum";
    selectedText.textContent = window.App.ui.schoolLock.previewAddress;
    fixBtn.disabled = false;
  }

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(window.App.ui.schoolLock.__searchTimer);

    if (q.length < 3) {
      results.classList.remove("active");
      results.innerHTML = "";
      return;
    }

    window.App.ui.schoolLock.__searchTimer = setTimeout(async () => {
      let list = [];
      try { list = await nomSearch(q); } catch (e) { return; }

      results.innerHTML = "";
      results.classList.add("active");

      if (!list.length) {
        const div = document.createElement("div");
        div.className = "item";
        div.style.opacity = ".7";
        div.textContent = "Sonuç bulunamadı";
        results.appendChild(div);
        return;
      }

      const frag = document.createDocumentFragment();
      list.forEach((r) => {
        const div = document.createElement("div");
        div.className = "item";
        div.textContent = r.display_name || "Adres";
        div.style.cursor = "pointer";
        div.addEventListener("click", () => {
          setPreview(+r.lat, +r.lon, r.display_name || "");
          results.classList.remove("active");
        });
        frag.appendChild(div);
      });
      results.appendChild(frag);
    }, 350);
  });

  map.on("click", async (ev) => {
    if (isSchoolFixed()) return;
    if (!window.App.ui.schoolLock.active) return;

    const latlng = ev.latlng;
    const addr = await window.reverseGeocodeTR(latlng.lat, latlng.lng).catch(() => "");
    setPreview(latlng.lat, latlng.lng, addr || "Seçilen konum");
  });

  fixBtn.addEventListener("click", async () => {
    const st = getSchoolState();
    if (!st || st.status !== "preview" || !st.latlng) return;
    $("#schoolFixBtn").trigger("click");
  });

  enforceSchoolLock();
}

/* =========================================================
7) PANEL MODULES — FINAL
- ✅ panel search docking
- ✅ menu hide/show hooks stabilize
========================================================= */
function initPanelModules(map) {
  if (window.App.inited.panel) return;
  window.App.inited.panel = true;

  ensureInjectedUiStyles();

  const panelWrap   = document.getElementById("panel-wrap");
  const panelToggle = document.getElementById("panelToggle");
  const panelSearch = document.getElementById("panel-search");

  const originalParent = panelSearch?.parentElement || null;
  const originalNextSibling = panelSearch?.nextElementSibling || null;

  function dockSearch() {
    if (!panelSearch) return;
    panelSearch.classList.add("is-docked");
    panelSearch.style.display = "";
    if (panelSearch.parentElement !== document.body) document.body.appendChild(panelSearch);
  }

  function undockSearch() {
    if (!panelSearch) return;
    panelSearch.classList.remove("is-docked");

    if (originalParent) {
      if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
        originalParent.insertBefore(panelSearch, originalNextSibling);
      } else {
        originalParent.appendChild(panelSearch);
      }
    } else if (panelWrap) {
      panelWrap.prepend(panelSearch);
    }
  }

  window.setPanelSearchHiddenByMenu =
    window.setPanelSearchHiddenByMenu ||
    function setPanelSearchHiddenByMenu(on) {
      const hide = !!on;
      window.App.hooks.panelSearch.hiddenByMenu = hide;

      if (panelWrap) panelWrap.style.display = hide ? "none" : "";
      if (panelToggle) panelToggle.style.display = hide ? "none" : "";
      if (panelSearch) panelSearch.style.display = hide ? "none" : "";

      try {
        (window.App.hooks.panelSearch.onMenuToggle || []).forEach(fn => {
          try { fn(hide); } catch(e){}
        });
      } catch(e){}

      if (hide && typeof window.__hidePanelSuggest === "function") window.__hidePanelSuggest();
    };

  if (panelWrap && panelToggle) {
    panelWrap.classList.remove("open");
    panelToggle.textContent = "»";

    dockSearch();

    window.App.utils.bindOnce(panelToggle, "panelToggleClick", "click", () => {
      const open = panelWrap.classList.toggle("open");
      panelToggle.textContent = open ? "«" : "»";
      if (open) undockSearch();
      else dockSearch();
    });
  } else {
    dockSearch();
  }

  initStudentsModule(map);
  initStatusHeadersModule();
  initServicesModule(map);
  initPanelSearchModule(map);

  window.__APP__ = {
    map,
    markers: window.App.panel.markers,
    serviceState: window.App.panel.serviceState
  };
}

/* =========================================================
8) STUDENTS + STATUS HEADERS + SERVICES — FINAL
========================================================= */
function initStudentsModule(map) {
  if (window.App.inited.students) return;
  window.App.inited.students = true;

  const markers = window.App.panel.markers;

  const students = [
    { id: 1, name: "Öğrenci 1", raw: "istiklal Mahallesi", avenue: "Lokman hekim cd", street: "Turkuaz Sokak", site: "Yıldızkent sitesi", district: "ümraniye" },
    { id: 2, name: "A2", raw: "Ulus Mahallesi", site: "Ulus Siral Sitesi", district: "Beşiktaş" },
    { id: 3, name: "A3", raw: "Ulus Mahallesi", site: "Ulus Konakları", avenue: "Adnan Saygun Caddesi", district: "Beşiktaş" },
    { id: 4, name: "A4", raw: "Beşiktaş", site: "Panaroma Konutları", street: "Kelaynak Sokak", district: "Beşiktaş" },
    { id: 5, name: "A5", raw: "Beşiktaş", street: "Gözde Sokak", district: "Beşiktaş" }
  ];

  students.forEach((s) => {
    s.score = 0;
    s.accuracy = "weak";   // exact | approx | weak
    s.group = "pool";
    s.locked = false;
    s.editing = false;
    s.dirty = false;
    s.dirtyMoved = false;
    s.__snap = null;
    s.lat = null;
    s.lng = null;
    s.service = null; // A-F
    s.pickup = s.pickup || "—";
    s.drop = s.drop || "—";
  });

  window.App.panel.students = students;

  function displayAddress(s) {
    if (s.site) return s.site;
    if (s.street) return s.street;
    if (s.avenue) return s.avenue;
    return s.raw || "";
  }

  function svcClass(letter) {
    return letter ? `svc-badge svc-${letter}` : "";
  }

  function icon(type, serviceLetter = null) {
    const badge = serviceLetter ? `<span class="${svcClass(serviceLetter)}">${serviceLetter}</span>` : "";
    return L.divIcon({
      className: "",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<div class="addr-icon ${type}">${type === "exact" ? "👤" : type === "approx" ? "!" : "✖"}${badge}</div>`
    });
  }

  window.__updateStudentMarkerIcon = function __updateStudentMarkerIcon(id) {
    const s = students.find(x => x.id === id);
    const m = markers.get(id);
    if (!s || !m) return;
    m.setIcon(icon(s.accuracy, s.service));
  };

  function pulseIcon(color) {
    return L.divIcon({
      className: "",
      html: `
        <div class="ghost-halo is-pulse" style="
          width:18px;height:18px;border-radius:999px;
          background:${color};
          box-shadow: 0 0 0 10px ${color}55, 0 0 22px ${color}aa, 0 0 40px ${color}88;">
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  function removePulse() {
    const st = window.App.ui.studentsTab;
    if (st.__pulseLayer) {
      try { map.removeLayer(st.__pulseLayer); } catch(e){}
      st.__pulseLayer = null;
    }
    if (st.__pulseTimer) {
      clearTimeout(st.__pulseTimer);
      st.__pulseTimer = null;
    }
  }

  const pulseAt = window.App.utils.throttle(function (lat, lng, color = "rgba(13,202,240,.85)", ms = 900) {
    removePulse();
    const st = window.App.ui.studentsTab;
    st.__pulseLayer = L.marker([lat, lng], { interactive: false, icon: pulseIcon(color) }).addTo(map);
    st.__pulseTimer = setTimeout(removePulse, ms);
  }, 120);

  const highlightPanelItem = window.App.utils.throttle(function (studentId) {
    const st = window.App.ui.studentsTab;
    const el = document.querySelector(`[data-stu-acc="${studentId}"]`);
    if (!el) return;

    document.querySelectorAll(".stu-acc.is-highlight").forEach(x => x.classList.remove("is-highlight"));
    el.classList.add("is-highlight");

    try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch(e){}

    st.__hoverId = studentId;
    setTimeout(() => {
      if (st.__hoverId === studentId) {
        el.classList.remove("is-highlight");
        st.__hoverId = null;
      }
    }, 900);
  }, 120);

  function openStudentsAccordion(studentId, focusMap = true) {
    const st = window.App.ui.studentsTab;
    st.openId = (st.openId === studentId ? null : studentId);

    renderStudentsTabPools();

    if (focusMap) {
      const m = markers.get(studentId);
      if (m) {
        const p = m.getLatLng();
        map.flyTo(p, 17, { animate: true });
        pulseAt(p.lat, p.lng, "rgba(13,202,240,.85)", 1200);
      }
    }
  }

  const __normCache = new Map();
  function normalizeTR(str) {
    if (!str) return "";
    if (__normCache.has(str)) return __normCache.get(str);
    let s = str.toLowerCase();
    s = s.replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u");
    s = s.replace(/[.,:/\-]/g, " ");
    s = s.replace(/\b(sk|sok|sokak|sokagi|sokağı)\b/g, "sokak");
    s = s.replace(/\b(cd|cad|cadde|caddesi)\b/g, "cadde");
    s = s.replace(/\b(no|no:|d|daire|kat|blok)\s*\d+/g, "");
    const joins = { "sehit han": "sehithan", "hakkı sehit han": "hakkisehithan", panaroma: "panorama", siral: "siral" };
    Object.keys(joins).forEach((k) => (s = s.replace(new RegExp(k, "g"), joins[k])));
    s = s.replace(/\s+/g, " ").trim();
    __normCache.set(str, s);
    return s;
  }

  function buildSmartQueries(s) {
    const q = new Set();
    const d = normalizeTR(s.district || "istanbul");
    q.add(normalizeTR(s.raw));
    if (s.site) q.add(`${normalizeTR(s.site)} ${d}`);
    if (s.street) q.add(`${normalizeTR(s.street)} ${d}`);
    if (s.avenue) q.add(`${normalizeTR(s.avenue)} ${d}`);
    q.add(d);
    return [...q];
  }

  function classify(meta) {
    const k = meta.lastKey;
    if (k === "site" && meta.siteMatch) return "exact";
    if (k === "street" && meta.streetMatch) return "exact";
    if (k === "avenue" && meta.avenueMatch) return "exact";
    const g = (meta.rawMatch || meta.districtMatch) && !(meta.siteMatch || meta.streetMatch || meta.avenueMatch);
    if (g) return "weak";
    if (meta.siteMatch || meta.streetMatch || meta.avenueMatch) return "approx";
    if ((meta.importance || 0) >= 0.45) return "approx";
    return "weak";
  }

  function scoreResult(s, r) {
    const a = normalizeTR(r.display_name || "");
    const sn = normalizeTR(s.site || "");
    const stn = normalizeTR(s.street || "");
    const an = normalizeTR(s.avenue || "");
    const dn = normalizeTR(s.district || "");
    const rn = normalizeTR(s.raw || "");
    const siteMatch = !!(s.site && sn && a.includes(sn));
    const streetMatch = !!(s.street && stn && a.includes(stn));
    const avenueMatch = !!(s.avenue && an && a.includes(an));
    const districtMatch = !!(s.district && dn && a.includes(dn));
    const rawMatch = !!(s.raw && rn && a.includes(rn));
    const lastKey = s.site ? "site" : s.street ? "street" : s.avenue ? "avenue" : "raw";
    const importance = Number(r.importance || 0);
    const acc = classify({ lastKey, siteMatch, streetMatch, avenueMatch, districtMatch, rawMatch, importance });

    let score = 0.15;
    if (siteMatch) score += 0.55;
    if (streetMatch) score += 0.35;
    if (avenueMatch) score += 0.25;
    if (districtMatch) score += 0.15;
    if (rawMatch) score += 0.1;
    score += Math.min(0.2, importance);

    if (acc === "exact") score = Math.max(score, 0.9);
    if (acc === "approx") score = Math.max(score, 0.6);
    if (acc === "weak") score = Math.min(score, 0.49);

    return Math.min(score, 1);
  }

  const __queryCache = new Map();
  let __backoffMs = 0;
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function fetchJsonCached(url) {
    if (__queryCache.has(url)) return __queryCache.get(url);

    const p = (async () => {
      if (__backoffMs > 0) await sleep(__backoffMs);

      let res;
      try {
        res = await window.App.utils.fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 9000);
      } catch (e) {
        __queryCache.delete(url);
        return [];
      }

      if (res.status === 429) {
        __backoffMs = Math.min(2000, __backoffMs ? Math.round(__backoffMs * 1.8) : 300);
        __queryCache.delete(url);
        await sleep(__backoffMs);
        return fetchJsonCached(url);
      } else if (__backoffMs > 0) {
        __backoffMs = Math.max(0, Math.round(__backoffMs * 0.6));
      }

      return res.json().catch(() => []);
    })();

    __queryCache.set(url, p);
    return p;
  }

  async function smartGeocode(s) {
    const qs = buildSmartQueries(s);
    let best = null;

    for (const q of qs) {
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=tr&q=" + encodeURIComponent(q);
      const data = await fetchJsonCached(url);
      if (!data || !data.length) continue;

      for (const r of data) {
        const sc = scoreResult(s, r);
        if (!best || sc > best.score) {
          best = {
            lat: +r.lat,
            lng: +r.lon,
            score: sc,
            accuracy: classify({
              lastKey: s.site ? "site" : s.street ? "street" : s.avenue ? "avenue" : "raw",
              siteMatch: normalizeTR(r.display_name || "").includes(normalizeTR(s.site || "")),
              streetMatch: normalizeTR(r.display_name || "").includes(normalizeTR(s.street || "")),
              avenueMatch: normalizeTR(r.display_name || "").includes(normalizeTR(s.avenue || "")),
              districtMatch: normalizeTR(r.display_name || "").includes(normalizeTR(s.district || "")),
              rawMatch: normalizeTR(r.display_name || "").includes(normalizeTR(s.raw || "")),
              importance: Number(r.importance || 0)
            })
          };
        }
        if (best.accuracy === "exact") break;
      }
      if (best && best.accuracy === "exact") break;
    }
    return best;
  }

  function ensureStudentsTabPools() {
    if (document.getElementById("students-pool-exact")) return;

    const host =
      document.querySelector('.tab-panel[data-tab="ogrenciler"]') ||
      document.getElementById("studentsList")?.parentElement ||
      document.getElementById("panel") ||
      document.body;

    const wrap = document.createElement("div");
    wrap.id = "__studentsPoolsWrap";
    wrap.style.cssText = "padding:10px";

    wrap.innerHTML = `
      <h3 class="status-head exact"><span class="label">✅ Doğrulanmış</span><span class="count">(0)</span></h3>
      <ul id="students-pool-exact" class="status-list expanded"></ul>

      <h3 class="status-head approx"><span class="label">⚠️ Teyit Gereken</span><span class="count">(0)</span></h3>
      <ul id="students-pool-approx" class="status-list collapsed"></ul>

      <h3 class="status-head weak"><span class="label">❌ Hatalı</span><span class="count">(0)</span></h3>
      <ul id="students-pool-weak" class="status-list collapsed"></ul>
    `;

    const studentsList = document.getElementById("studentsList");
    if (studentsList) studentsList.style.display = "none";

    host.appendChild(wrap);
    window.__bindStatusHeaders?.(wrap);
  }

  function snap(s) {
    return JSON.parse(JSON.stringify({
      raw: s.raw, site: s.site, street: s.street, avenue: s.avenue, district: s.district,
      lat: s.lat, lng: s.lng, accuracy: s.accuracy
    }));
  }

  function restore(s) {
    if (!s.__snap) return;
    Object.assign(s, s.__snap);
    s.editing = false;
    s.dirty = false;
    s.dirtyMoved = false;

    const m = markers.get(s.id);
    if (m && s.lat != null && s.lng != null) m.setLatLng([s.lat, s.lng]);
    if (m) m.setIcon(icon(s.accuracy, s.service));

    s.locked = s.accuracy === "exact";
    if (m) s.locked ? m.dragging.disable() : m.dragging.enable();
  }

  function lockGreen(s) {
    s.accuracy = "exact";
    s.locked = true;
    s.editing = false;
    s.dirty = false;
    s.dirtyMoved = false;

    const m = markers.get(s.id);
    if (m) m.setIcon(icon("exact", s.service));
    if (m) m.dragging.disable();
  }

  window.__verifyStudent = function __verifyStudent(studentId) {
    const s = students.find(x => x.id === studentId);
    if (!s) return;

    lockGreen(s);
    window.__updateStudentMarkerIcon?.(studentId);
    window.__renderPanelLists?.();
    softToast("Doğrulandı", "ok");
  };

  function unlockEdit(s) {
    s.__snap = snap(s);
    s.locked = false;
    s.accuracy = "approx";

    const m = markers.get(s.id);
    if (m) m.setIcon(icon("approx", s.service));
    if (m) m.dragging.enable();
  }

  function updateCountsForPools(poolIds) {
    Object.values(poolIds).forEach((id) => {
      const ul = document.getElementById(id);
      const h = ul?.previousElementSibling;
      if (!ul || !h) return;
      const countEl = h.querySelector(".count");
      if (countEl) countEl.textContent = `(${ul.children.length})`;
    });
  }

  const __addrPools = { exact: "pool-exact", approx: "pool-approx", weak: "pool-weak" };
  const __stuPools  = { exact: "students-pool-exact", approx: "students-pool-approx", weak: "students-pool-weak" };

  function sortTR(a, b) {
    return (a.name || "").localeCompare((b.name || ""), "tr", { sensitivity: "base" });
  }

  async function initMarkersOnce() {
    if (window.App.panel.__markersReady) return;
    window.App.panel.__markersReady = true;

    for (const s of students) {
      const r = await smartGeocode(s);
      if (!r) continue;

      s.score = r.score;
      s.accuracy = r.accuracy;
      s.locked = s.accuracy === "exact";
      s.lat = r.lat;
      s.lng = r.lng;

      const m = L.marker([r.lat, r.lng], { icon: icon(s.accuracy, s.service), draggable: !s.locked }).addTo(map);

      m.on("click", (ev) => {
        try { L.DomEvent.stop(ev); } catch(e){}
        if (typeof window.__openStudentMiniPopup === "function") {
          window.__openStudentMiniPopup(s.id, { force: true });
        }
      });

      m.on("mouseover", () => {
        highlightPanelItem(s.id);
        const p = m.getLatLng();
        pulseAt(p.lat, p.lng, "rgba(255,205,57,.85)", 650);
      });

      m.on("mouseout", () => { removePulse(); });

      m.on("dragend", () => {
        if (s.locked) return;
        const p = m.getLatLng();
        s.lat = p.lat;
        s.lng = p.lng;
        s.dirtyMoved = true;
      });

      markers.set(s.id, m);
    }
  }

  function renderAddressesTab() {
    ["pool-exact", "pool-approx", "pool-weak"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    const fragExact = document.createDocumentFragment();
    const fragApprox = document.createDocumentFragment();
    const fragWeak = document.createDocumentFragment();

    students.forEach((s) => {
      const li = document.createElement("li");
      li.className = s.accuracy;

      if (s.locked && s.accuracy === "exact") {
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.innerHTML = `<span style="flex:1">${s.name}</span>`;
        const b = document.createElement("button");
        b.textContent = "🔒";
        b.style.cssText = "border:none;background:#111;color:#fff;padding:4px 6px;border-radius:4px;cursor:pointer";
        b.onclick = (e) => { e.stopPropagation(); unlockEdit(s); renderAll(); };
        li.appendChild(b);
      } else {
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";
        li.style.gap = "10px";

        const left = document.createElement("div");
        left.style.flex = "1";
        left.innerHTML = `
          <div style="font-weight:600">${s.name}</div>
          <div style="opacity:.85;font-size:11px">${displayAddress(s)}</div>
        `;

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "6px";

        const btn = (t) => {
          const x = document.createElement("button");
          x.textContent = t;
          x.style.cssText = "border:none;border-radius:4px;padding:5px 8px;font-size:11px;cursor:pointer;background:#333;color:#fff";
          return x;
        };

        const ebtn = btn(s.editing ? "Vazgeç" : "Düzenle");
        const okbtn = btn("Onayla");

        ebtn.onclick = (e) => {
          e.stopPropagation();
          s.editing ? restore(s) : (s.editing = true);
          renderAll();
        };

        okbtn.onclick = async (e) => {
          e.stopPropagation();
          if (s.dirty && !s.dirtyMoved) {
            const r = await smartGeocode(s);
            if (r) {
              s.lat = r.lat;
              s.lng = r.lng;
              markers.get(s.id)?.setLatLng([r.lat, r.lng]);
            }
          }
          lockGreen(s);
          renderAll();
        };

        right.appendChild(ebtn);
        right.appendChild(okbtn);

        li.appendChild(left);
        li.appendChild(right);
      }

      li.addEventListener("mouseenter", () => {
        const m = markers.get(s.id);
        if (!m) return;
        const p = m.getLatLng();
        pulseAt(p.lat, p.lng, "rgba(117,183,152,.85)", 650);
      }, { passive: true });

      li.addEventListener("mouseleave", () => removePulse(), { passive: true });

      li.onclick = () => {
        const m = markers.get(s.id);
        if (m) {
          map.flyTo(m.getLatLng(), 17, { animate: true });
          window.__openStudentMiniPopup?.(s.id, { force: true });
        }
      };

      if (s.accuracy === "exact") fragExact.appendChild(li);
      else if (s.accuracy === "approx") fragApprox.appendChild(li);
      else fragWeak.appendChild(li);
    });

    document.getElementById("pool-exact")?.appendChild(fragExact);
    document.getElementById("pool-approx")?.appendChild(fragApprox);
    document.getElementById("pool-weak")?.appendChild(fragWeak);

    updateCountsForPools(__addrPools);
  }

  function renderStudentsTabPools() {
    ensureStudentsTabPools();

    ["students-pool-exact", "students-pool-approx", "students-pool-weak"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    const byAcc = {
      exact: students.filter(s => s.accuracy === "exact").sort(sortTR),
      approx: students.filter(s => s.accuracy === "approx").sort(sortTR),
      weak: students.filter(s => s.accuracy === "weak").sort(sortTR)
    };

    const frag = {
      exact: document.createDocumentFragment(),
      approx: document.createDocumentFragment(),
      weak: document.createDocumentFragment()
    };

    ["exact", "approx", "weak"].forEach((acc) => {
      byAcc[acc].forEach((s) => {
        const svcNo = "SV-" + String(s.id).padStart(3, "0");
        const svcText = s.service ? `Servis ${s.service}` : "Servis —";

        const accWrap = document.createElement("li");
        accWrap.className = s.accuracy;

        const box = document.createElement("div");
        box.className = "stu-acc";
        box.dataset.stuAcc = s.accuracy;
        box.dataset.stuId = String(s.id);
        box.setAttribute("data-stu-acc", String(s.id));
        if (window.App.ui.studentsTab.openId === s.id) box.classList.add("is-open");

        const head = document.createElement("div");
        head.className = "stu-head";
        head.innerHTML = `
          <div class="left">
            <div class="title">${s.name} <span style="opacity:.75;font-weight:700">• ${svcText}</span></div>
            <div class="sub">${displayAddress(s)}</div>
          </div>
          <div class="svcNo">${svcNo}</div>
        `;

        const body = document.createElement("div");
        body.className = "stu-body";

        const lockedSchool = !isSchoolFixed();
        const disabledAttr = lockedSchool ? "disabled" : "";

        body.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="opacity:.9;font-size:12px">
              <div style="font-weight:700;margin-bottom:4px">Adres</div>
              <div style="opacity:.85">${displayAddress(s)}</div>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="stu-act" data-act="route" ${disabledAttr}
                style="border:none;border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;background:rgba(13,202,240,.16);color:#fff;border:1px solid rgba(13,202,240,.22)">
                <i class="fa-solid fa-route"></i> Rota
              </button>

              <button class="stu-act" data-act="svc" ${disabledAttr}
                style="border:none;border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;background:rgba(255,205,57,.14);color:#fff;border:1px solid rgba(255,205,57,.22)">
                <i class="fa-solid fa-bus"></i> Servise Ekle
              </button>

              ${s.accuracy !== "exact" ? `
                <button class="stu-act" data-act="verify"
                  style="border:none;border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;background:rgba(117,183,152,.18);color:#fff;border:1px solid rgba(117,183,152,.25)">
                  <i class="fa-solid fa-circle-check"></i> Doğrula
                </button>
              ` : ""}

              ${s.service ? `
                <button class="stu-act" data-act="svc-remove"
                  style="border:none;border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;background:rgba(255,77,77,.14);color:#fff;border:1px solid rgba(255,77,77,.22)">
                  <i class="fa-solid fa-xmark"></i> Servisten Çıkar
                </button>
              ` : ""}
            </div>

            ${lockedSchool ? `<div style="font-size:11px;opacity:.75">Önce okul adresini sabitle.</div>` : ""}
          </div>
        `;

        head.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openStudentsAccordion(s.id, true);
        });

        box.addEventListener("mouseenter", () => {
          const m = markers.get(s.id);
          if (!m) return;
          const p = m.getLatLng();
          pulseAt(p.lat, p.lng, "rgba(13,202,240,.85)", 650);
        }, { passive: true });

        box.addEventListener("mouseleave", () => removePulse(), { passive: true });

        body.addEventListener("click", async (e) => {
          const btn = e.target.closest?.(".stu-act");
          if (!btn) return;

          e.preventDefault();
          e.stopPropagation();

          const act = btn.dataset.act;
          const m = markers.get(s.id);
          const p = m?.getLatLng?.();

          if (act === "verify") {
            window.__verifyStudent?.(s.id);
            return;
          }

          if (act === "route") {
            if (!requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.")) return;
            if (!p) return;
            map.flyTo(p, 17, { animate: true });
            await window.drawSingleRouteToSchool(p.lat, p.lng);
            return;
          }

          if (act === "svc") {
            if (!requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.")) return;
            window.App.ui.schoolLock.__pendingStudentId = s.id;
            const nm = document.getElementById("svcStudentName");
            if (nm) nm.textContent = `— ${s.name}`;
            const modal = document.getElementById("servicePickModal");
            const rm = document.getElementById("svcRemoveBtn");
            if (rm) rm.style.display = s.service ? "block" : "none";
            modal?.classList.add("active");
            return;
          }

          if (act === "svc-remove") {
            window.__removeStudentFromService?.(s.id);
            return;
          }
        });

        box.appendChild(head);
        box.appendChild(body);
        accWrap.appendChild(box);

        frag[s.accuracy]?.appendChild(accWrap);
      });
    });

    document.getElementById("students-pool-exact")?.appendChild(frag.exact);
    document.getElementById("students-pool-approx")?.appendChild(frag.approx);
    document.getElementById("students-pool-weak")?.appendChild(frag.weak);

    updateCountsForPools(__stuPools);
  }

  function renderAll() {
    renderAddressesTab();
    renderStudentsTabPools();
  }

  window.__renderPanelLists = renderAll;

  (async () => {
    await initMarkersOnce();
    renderAll();
  })();
}

function initStatusHeadersModule() {
  if (window.App.inited.statusHeaders) return;
  window.App.inited.statusHeaders = true;

  function bind(root = document) {
    root.querySelectorAll(".status-head").forEach((h) => {
      if (h.__bound) return;
      h.__bound = true;

      const ul = h.nextElementSibling;
      if (!ul) return;

      ul.classList.add("status-list");

      const isExact = h.classList.contains("exact");
      ul.classList.toggle("expanded", isExact);
      ul.classList.toggle("collapsed", !isExact);
      h.classList.toggle("collapsed", !isExact);

      h.addEventListener("click", () => {
        if (h.classList.contains("disabled")) return;
        const collapsed = ul.classList.toggle("collapsed");
        ul.classList.toggle("expanded", !collapsed);
        h.classList.toggle("collapsed", collapsed);
      });
    });
  }

  window.__bindStatusHeaders = bind;
  bind(document);
}

function initServicesModule(map) {
  if (window.App.inited.services) return;
  window.App.inited.services = true;

  const students = window.App.panel.students;
  const markers = window.App.panel.markers;
  const serviceState = window.App.panel.serviceState;

  function rebuildAssignable() {
    const assigned = new Set([
      ...serviceState.svA, ...serviceState.svB,
      ...serviceState.svC, ...serviceState.svD,
      ...serviceState.svE, ...serviceState.svF
    ]);
    serviceState.assignable = students
      .filter((s) => s.accuracy === "exact")
      .map((s) => s.id)
      .filter((id) => !assigned.has(id));
  }

  function makeServiceLi(id, from) {
    const s = students.find((x) => x.id === id);
    const li = document.createElement("li");
    li.textContent = s ? s.name : "#" + id;
    li.draggable = true;
    li.dataset.sid = String(id);
    li.dataset.from = from;

    li.addEventListener("mouseenter", window.App.utils.throttle(() => {
      const m = markers.get(id);
      if (!m) return;
      const p = m.getLatLng();
      try {
        const tmp = L.circleMarker([p.lat, p.lng], { radius: 12, weight: 2, fillOpacity: 0.05 }).addTo(map);
        setTimeout(() => { try { map.removeLayer(tmp); } catch(e){} }, 550);
      } catch(e){}
    }, 160), { passive: true });

    return li;
  }

  let __dragSid = null;

  function removeFromAll(id) {
    ["svA", "svB", "svC", "svD", "svE", "svF", "assignable"].forEach((k) => {
      serviceState[k] = serviceState[k].filter((x) => x !== id);
    });
  }

  function insertInto(list, id) {
    const arr = serviceState[list];
    if (!arr) return;
    arr.push(id);
  }

  function enableServicesDnD() {
    const uls = document.querySelectorAll(".service-drop");

    uls.forEach((ul) => {
      if (ul.__dndBound) return;
      ul.__dndBound = true;

      ul.addEventListener("dragstart", (e) => {
        const li = e.target?.closest?.("li");
        if (!li) return;
        li.classList.add("dragging");
        __dragSid = Number(li.dataset.sid);
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(__dragSid));
        } catch (err) {}
      });

      ul.addEventListener("dragend", (e) => {
        const li = e.target?.closest?.("li");
        li?.classList.remove("dragging");
        __dragSid = null;
      });

      ul.addEventListener("dragover", (e) => e.preventDefault());

      ul.addEventListener("drop", (e) => {
        e.preventDefault();
        const id = __dragSid || Number(e.dataTransfer?.getData?.("text/plain"));
        if (!id) return;

        const list = ul.id; // svA..svF / assignable
        removeFromAll(id);
        insertInto(list, id);

        const s = students.find(x => x.id === id);
        if (s) {
          if (list.startsWith("sv")) s.service = list.replace("sv", "");
          else s.service = null;
          window.__updateStudentMarkerIcon?.(id);
          window.__renderPanelLists?.();
        }

        renderServicesTab();
      });
    });
  }

  function renderServicesTab() {
    rebuildAssignable();
    ["svA", "svB", "svC", "svD", "svE", "svF", "assignable"].forEach((k) => {
      const ul = document.getElementById(k);
      if (!ul) return;
      ul.innerHTML = "";
      (serviceState[k] || []).forEach((id) => ul.appendChild(makeServiceLi(id, k)));
    });
    enableServicesDnD();
  }

  document.querySelectorAll(".service-header").forEach((h) => {
    if (h.__svcBound) return;
    h.__svcBound = true;
    h.addEventListener("click", () => {
      h.closest(".service-box")?.classList.toggle("open");
    });
  });

  document.querySelectorAll("#tabs .tab").forEach((btn) => {
    if (btn.__tabBound) return;
    btn.__tabBound = true;

    btn.addEventListener("click", () => {
      document.querySelectorAll("#tabs .tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const panel = document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`);
      panel?.classList.add("active");

      if (btn.dataset.tab === "servisler") renderServicesTab();
      if (btn.dataset.tab === "adresler" || btn.dataset.tab === "ogrenciler") window.__renderPanelLists?.();
    });
  });

  window.__assignStudentToService = function __assignStudentToService(studentId, svcLetter) {
    const listKey = "sv" + svcLetter;
    if (!serviceState[listKey]) return;

    ["svA","svB","svC","svD","svE","svF","assignable"].forEach(k => {
      serviceState[k] = (serviceState[k]||[]).filter(x => x !== studentId);
    });

    serviceState[listKey].push(studentId);

    const s = students.find(x => x.id === studentId);
    if (s) s.service = svcLetter;

    window.__updateStudentMarkerIcon?.(studentId);
    window.__renderPanelLists?.();
    softToast("Eklendi", "ok");
  };

  window.__removeStudentFromService = function __removeStudentFromService(studentId) {
    ["svA","svB","svC","svD","svE","svF"].forEach(k => {
      serviceState[k] = (serviceState[k]||[]).filter(x => x !== studentId);
    });

    const s = students.find(x => x.id === studentId);
    if (s) s.service = null;

    window.__updateStudentMarkerIcon?.(studentId);
    window.__renderPanelLists?.();
    softToast("Çıkarıldı", "warn");
  };
}

/* =========================================================
9) PANEL SEARCH — FINAL
- ✅ Panel başlangıçta kapalı kalsın (panel modülü yönetir)
- ✅ Önerilerden “kayıtlı öğrenci/adres” tıklanınca panel otomatik açılsın
- ✅ Arama box sadece harita sayfasında görünsün
- ✅ Arama box panelin açık-kapalı olmasından etkilenmesin
- ✅ Okul sabitlenmeden arama box görünmesin
- ✅ Üst menünün altında tam ortalı ve submenu ile birlikte hareket etsin (nav altına dock)
- ✅ Dış arama sonucu tıklanınca marker görünsün (circleMarker)
========================================================= */
function initPanelSearchModule(map) {
  if (window.App.inited.panelSearch) return;
  window.App.inited.panelSearch = true;

  /* ---------------------------------------------------------
  🔧 Nav altına dock (submenu ile birlikte hareket eder)
  --------------------------------------------------------- */
  function ensureMapSearchDock() {
    const nav = document.querySelector(".nav-wrapper");
    if (!nav) return null;

    let dock = document.getElementById("mapSearchDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "mapSearchDock";
      // submenu/accordion ile birlikte hareket etsin diye nav içine
      nav.appendChild(dock);
    }
    return dock;
  }

  function movePanelSearchToNavDock() {
    const ps = document.getElementById("panel-search");
    const dock = ensureMapSearchDock();
    if (!ps || !dock) return;

    ps.classList.add("is-navdock");
    if (ps.parentElement !== dock) dock.appendChild(ps);
  }

  function setMapSearchVisible(on) {
    const ps = document.getElementById("panel-search");
    const dock = document.getElementById("mapSearchDock") || ensureMapSearchDock();
    if (!ps || !dock) return;

    const mapsActive = document.getElementById("pageMaps")?.classList.contains("active");
    const menuHidden = !!window.App?.hooks?.panelSearch?.hiddenByMenu;

    const visible = !!on && !!mapsActive && !menuHidden;

    dock.style.display = visible ? "block" : "none";
    ps.style.display = visible ? "block" : "none";
  }

  // Dock’u hazırla
  movePanelSearchToNavDock();

  /* ---------------------------------------------------------
  📍 External click marker
  --------------------------------------------------------- */
  let extClickMarker = null;
  function setExternalClickMarker(lat, lon) {
    try { if (extClickMarker) map.removeLayer(extClickMarker); } catch (e) {}
    extClickMarker = L.circleMarker([lat, lon], {
      radius: 7,
      weight: 3,
      fillOpacity: 0.15,
      interactive: false
    }).addTo(map);
  }

  const students = window.App.panel.students;
  const markers = window.App.panel.markers;

  const searchInput = document.getElementById("searchBox");
  const suggestBox = document.getElementById("search-suggest");
  const panelSearch = document.getElementById("panel-search");
  if (!searchInput || !suggestBox || !panelSearch) return;

  const extCache = new Map();
  let lastPreviewTs = 0;
  const PREVIEW_THROTTLE = 220;

  let ghostSearchMarker = null;

  let activeIndex = -1;
  function getItems() { return Array.from(suggestBox.querySelectorAll(".item[data-action]")); }
  function setActive(idx) {
    const items = getItems();
    items.forEach((el) => el.classList.remove("is-active"));
    if (!items.length) { activeIndex = -1; return; }
    activeIndex = window.App.utils.clamp(idx, 0, items.length - 1);
    const el = items[activeIndex];
    el.classList.add("is-active");
    try { el.scrollIntoView({ block: "nearest" }); } catch(e){}
  }

  function displayAddress(s) {
    if (s.site) return s.site;
    if (s.street) return s.street;
    if (s.avenue) return s.avenue;
    return s.raw || "";
  }
  function addressText(s) { return [s.site, s.street, s.avenue, s.raw, s.district].filter(Boolean).join(" "); }

  function hideSuggest() {
    suggestBox.style.display = "none";
    document.body.classList.remove("suggest-open");
    activeIndex = -1;
  }
  function showSuggest() {
    if (window.App.hooks.panelSearch.hiddenByMenu) return;
    suggestBox.style.display = "block";
    document.body.classList.add("suggest-open");
  }

  function removeGhost() {
    if (ghostSearchMarker) {
      try { map.removeLayer(ghostSearchMarker); } catch(e){}
      ghostSearchMarker = null;
    }
  }

  function stopAllPointer(el) {
    el.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
  }

  // Menü açılınca arama gizlensin (submenu ile tutarlı)
  window.App.hooks.panelSearch.onMenuToggle.push((hidden) => {
    if (hidden) {
      hideSuggest();
      removeGhost();
      setMapSearchVisible(false);
      try { searchInput.blur(); } catch(e){}
    } else {
      movePanelSearchToNavDock();
      setMapSearchVisible(isSchoolFixed());
    }
  });

  // Dış tıklama ile suggest kapansın
  window.App.utils.once("__panelSearchOutsideClose", () => {
    document.addEventListener("click", (e) => {
      const root = panelSearch || searchInput;
      if (!root) return;
      if (!root.contains(e.target)) hideSuggest();
    }, true);
  });

  // Keyboard nav
  searchInput.addEventListener("keydown", (e) => {
    const isOpen = suggestBox.style.display === "block";
    const items = getItems();

    if (e.key === "Escape") {
      hideSuggest();
      removeGhost();
      return;
    }
    if (!isOpen || !items.length) return;

    if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIndex + 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIndex - 1); return; }
    if (e.key === "Enter") {
      if (activeIndex < 0) return;
      e.preventDefault();
      items[activeIndex].click();
    }
  });

  searchInput.addEventListener("focus", () => {
    if (window.App.hooks.panelSearch.hiddenByMenu) return;
    if (suggestBox.innerHTML.trim()) showSuggest();
  });

  function addSeparator(label) {
    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = label;
    suggestBox.appendChild(sep);
  }
  function addHr() {
    const hr = document.createElement("hr");
    hr.style.cssText = `border:none;border-top:1px solid rgba(255,255,255,.08);margin:0;`;
    suggestBox.appendChild(hr);
  }

  let _extAbort = null;
  async function fetchExternalTop3(q) {
    const key = q.trim().toLowerCase();
    if (extCache.has(key)) return extCache.get(key);

    if (_extAbort) { try { _extAbort.abort(); } catch(e){} }
    _extAbort = new AbortController();

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      "format=json&limit=3&countrycodes=tr&q=" +
      encodeURIComponent(q + " istanbul");

    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: _extAbort.signal });
    const data = await res.json().catch(() => []);
    const results = Array.isArray(data) ? data : [];
    extCache.set(key, results);
    return results;
  }

  function canPreviewNow() {
    const now = Date.now();
    if (now - lastPreviewTs < PREVIEW_THROTTLE) return false;
    lastPreviewTs = now;
    return true;
  }

  function makeItem(text, action, payload = {}, cls = "") {
    const div = document.createElement("div");
    div.className = `item ${cls}`.trim();
    div.dataset.action = action;
    div.dataset.payload = JSON.stringify(payload);
    div.textContent = text;
    div.style.cursor = "pointer";
    stopAllPointer(div);
    return div;
  }

  function pulseIcon(color) {
    return L.divIcon({
      className: "",
      html: `
        <div class="ghost-halo is-pulse" style="
          background:${color};
          width:18px;height:18px;border-radius:999px;
          box-shadow: 0 0 0 10px ${color}55, 0 0 22px ${color}aa, 0 0 40px ${color}88;">
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  function previewPulse(lat, lon, color) {
    if (window.App.hooks.panelSearch.hiddenByMenu) return;
    if (!lat || !lon) return;
    if (!canPreviewNow()) return;

    removeGhost();

    ghostSearchMarker = L.marker([lat, lon], {
      interactive: false,
      icon: pulseIcon(color)
    }).addTo(map);

    map.flyTo([lat, lon], 16, { animate: true });
  }

  // ✅ paneli otomatik aç (toggle davranışına dokunmadan)
  function autoOpenPanel() {
    const wrap = document.getElementById("panel-wrap");
    const toggle = document.getElementById("panelToggle");
    if (!wrap || !toggle) return;

    if (!wrap.classList.contains("open")) {
      wrap.classList.add("open");
      toggle.textContent = "«";
    }
  }

  async function handleAction(action, payload) {
    if (window.App.hooks.panelSearch.hiddenByMenu) return;

    removeGhost();

    // ✅ kayıtlıdan tıklanınca panel otomatik aç
    if (action === "STUDENT" || action === "ADDRESS") {
      autoOpenPanel();

      const id = payload?.id;
      const m = markers.get(id);
      if (!m) return;

      hideSuggest();

      const p = m.getLatLng();

      // okul sabit değilse rota çizme zorlanmaz, sadece odak
      if (!isSchoolFixed()) {
        requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.");
        map.flyTo(p, 16, { animate: true });
        return;
      }

      map.flyTo(p, 17, { animate: true });
      await window.drawSingleRouteToSchool(p.lat, p.lng);
      return;
    }

    if (action === "EXT_PICK") {
      const { lat, lon, label } = payload || {};
      if (!lat || !lon) return;

      hideSuggest();
      setExternalClickMarker(lat, lon);

      if (!isSchoolFixed()) {
        await window.setSchoolFromSearch(lat, lon, label || "");
        openSchoolLockModal();
        return;
      }

      map.flyTo([lat, lon], 18, { animate: true });
      await window.drawSingleRouteToSchool(lat, lon);
      return;
    }
  }

  searchInput.addEventListener("input", async () => {
    if (window.App.hooks.panelSearch.hiddenByMenu) return;

    // ✅ sadece harita sayfasında çalışsın
    const mapsActive = document.getElementById("pageMaps")?.classList.contains("active");
    if (!mapsActive) return;

    const q = searchInput.value.trim().toLowerCase();

    removeGhost();
    hideSuggest();
    suggestBox.innerHTML = "";
    activeIndex = -1;

    if (!q) return;

    const studentResults = students.filter((s) => (s.name || "").toLowerCase().includes(q));
    if (studentResults.length) {
      addSeparator("Kayıtlı Öğrenciler");
      studentResults.forEach((s, idx) => {
        const div = makeItem(`👤 ${s.name}`, "STUDENT", { id: s.id }, "grp-student");
        div.addEventListener("mouseenter", () => {
          const m = markers.get(s.id);
          if (m) previewPulse(m.getLatLng().lat, m.getLatLng().lng, "rgba(255,205,57,.85)");
        }, { passive: true });
        div.addEventListener("mouseleave", () => removeGhost(), { passive: true });
        div.addEventListener("click", async () => handleAction("STUDENT", { id: s.id }));
        suggestBox.appendChild(div);
        if (idx < studentResults.length - 1) addHr();
      });
    }

    const addressResults = students.filter((s) => addressText(s).toLowerCase().includes(q));
    if (addressResults.length) {
      addSeparator("Kayıtlı Adresler");
      addressResults.forEach((s, idx) => {
        const div = makeItem(`🏠 ${displayAddress(s)}`, "ADDRESS", { id: s.id }, "grp-address");
        div.addEventListener("mouseenter", () => {
          const m = markers.get(s.id);
          if (m) previewPulse(m.getLatLng().lat, m.getLatLng().lng, "rgba(117,183,152,.85)");
        }, { passive: true });
        div.addEventListener("mouseleave", () => removeGhost(), { passive: true });
        div.addEventListener("click", async () => handleAction("ADDRESS", { id: s.id }));
        suggestBox.appendChild(div);
        if (idx < addressResults.length - 1) addHr();
      });
    }

    addSeparator("Kayıtlı Olmayan Adresler");

    let results = [];
    try { results = await fetchExternalTop3(q); } catch (e) { return; }

    if (!results.length) {
      const empty = makeItem("Sonuç bulunamadı", "NOOP", {}, "grp-external");
      empty.style.opacity = "0.7";
      suggestBox.appendChild(empty);
      showSuggest();
      return;
    }

    results.forEach((r, idx) => {
      const lat = +r.lat;
      const lon = +r.lon;
      const label = (r.display_name || "").slice(0, 90);

      const div = makeItem(`📍 ${label}`, "EXT_PICK", { lat, lon, label }, "grp-external");
      div.addEventListener("mouseenter", () => previewPulse(lat, lon, "rgba(13,202,240,.85)"), { passive: true });
      div.addEventListener("mouseleave", () => removeGhost(), { passive: true });
      div.addEventListener("click", async () => handleAction("EXT_PICK", { lat, lon, label }));

      suggestBox.appendChild(div);
      if (idx < results.length - 1) addHr();
    });

    showSuggest();
    setActive(0);
  });

  // ✅ başlangıç görünürlüğü: sadece okul sabitse + maps aktifse
  setTimeout(() => {
    movePanelSearchToNavDock();
    setMapSearchVisible(isSchoolFixed());
  }, 0);
}

/* =========================================================
👤 10) STUDENT MARKER CARD POPUP + SERVİS MODAL — FINAL
- ✅ popup: paneldeki gibi öğrenci kartı
- ✅ split-btn (main + more)
- ✅ marker her tıkta tekrar açılır (force)
========================================================= */
function initStudentPopupModule(map) {
  if (window.App.inited.studentPopups) return;
  window.App.inited.studentPopups = true;

  ensureInjectedUiStyles();

  const svcModal = document.getElementById("servicePickModal");
  const svcStudentName = document.getElementById("svcStudentName");
  const svcRemoveBtn = document.getElementById("svcRemoveBtn");

  let __menuEl = null;
  function __docCloseMenu(e) {
    if (!__menuEl) return;
    if (__menuEl.contains(e.target)) return;
    closeMenu();
  }
  function closeMenu() {
    if (__menuEl && __menuEl.parentNode) __menuEl.parentNode.removeChild(__menuEl);
    __menuEl = null;
    document.removeEventListener("click", __docCloseMenu, true);
  }
  function openMenu(anchorEl, items = []) {
    closeMenu();

    const r = anchorEl.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "split-menu";
    el.style.left = Math.round(r.left) + "px";
    el.style.top = Math.round(r.bottom + 6) + "px";

    items.forEach((it) => {
      if (it.type === "sep") {
        const s = document.createElement("div");
        s.className = "sep";
        el.appendChild(s);
        return;
      }

      const mi = document.createElement("div");
      mi.className = "mi";
      mi.textContent = it.label || "Seçenek";
      if (it.disabled) mi.setAttribute("aria-disabled", "true");

      mi.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (it.disabled) return;
        try { it.onClick && it.onClick(); } finally { closeMenu(); }
      });

      el.appendChild(mi);
    });

    document.body.appendChild(el);
    __menuEl = el;
    document.addEventListener("click", __docCloseMenu, true);
  }

  function openServiceModal(studentId) {
    const s = window.App.panel.students.find(x => x.id === studentId);
    if (!s) return;

    window.App.ui.schoolLock.__pendingStudentId = studentId;
    if (svcStudentName) svcStudentName.textContent = `— ${s.name}`;
    if (svcModal) svcModal.classList.add("active");
    if (svcRemoveBtn) svcRemoveBtn.style.display = s.service ? "block" : "none";
  }

  function closeServiceModal() {
    if (svcModal) svcModal.classList.remove("active");
    window.App.ui.schoolLock.__pendingStudentId = null;
  }

  svcModal?.querySelector(".svc-backdrop")?.addEventListener("click", closeServiceModal);

  svcModal?.querySelectorAll(".svc-btn")?.forEach(btn => {
    btn.addEventListener("click", () => {
      const sid = window.App.ui.schoolLock.__pendingStudentId;
      const svc = btn.dataset.svc;
      if (!sid || !svc) return;
      window.__assignStudentToService?.(sid, svc);
      closeServiceModal();
      // popup refresh
      window.__openStudentMiniPopup?.(sid, { force: true });
    });
  });

  svcRemoveBtn?.addEventListener("click", () => {
    const sid = window.App.ui.schoolLock.__pendingStudentId;
    if (!sid) return;
    window.__removeStudentFromService?.(sid);
    closeServiceModal();
    window.__openStudentMiniPopup?.(sid, { force: true });
  });

  function buildCardHtml(s) {
    const svcNo = "SV-" + String(s.id).padStart(3, "0");
    const svcText = s.service ? `Servis ${s.service}` : "Servis —";
    const locked = !isSchoolFixed();
    const dis = locked ? "disabled" : "";

    const pickup = s.pickup || "—";
    const drop = s.drop || "—";

    const addr = (function () {
      if (s.site) return s.site;
      if (s.street) return s.street;
      if (s.avenue) return s.avenue;
      return s.raw || "";
    })();

    const statusPill =
      s.accuracy === "exact" ? "✅ Doğrulandı" :
      s.accuracy === "approx" ? "⚠️ Teyit" : "❌ Hatalı";

    return `
      <div class="stu-card" data-stu="${s.id}">
        <div class="top">
          <div style="min-width:0;flex:1">
            <div class="nm">${s.name}</div>
            <div class="meta">${svcNo} • ${svcText}</div>
          </div>
          <div class="pill">${statusPill}</div>
        </div>

        <div class="addr">${addr}</div>

        <div class="grid">
          <div class="kv">
            <div class="k">Alınış</div>
            <div class="v">${pickup}</div>
          </div>
          <div class="kv">
            <div class="k">Bırakış</div>
            <div class="v">${drop}</div>
          </div>
        </div>

        <div class="actions">
          <div class="split" data-split="route">
            <button class="main" data-act="route-main" ${dis}>
              <i class="fa-solid fa-route"></i><span>Rota</span>
            </button>
            <button class="more" data-act="route-more" ${dis} aria-label="Rota seçenekleri">
              <i class="fa-solid fa-chevron-down"></i>
            </button>
          </div>

          <div class="split" data-split="svc">
            <button class="main" data-act="svc-main" ${dis}>
              <i class="fa-solid fa-bus"></i><span>Servis</span>
            </button>
            <button class="more" data-act="svc-more" ${dis} aria-label="Servis seçenekleri">
              <i class="fa-solid fa-chevron-down"></i>
            </button>
          </div>

          ${s.accuracy !== "exact" ? `
            <div class="split" data-split="verify">
              <button class="main" data-act="verify-main">
                <i class="fa-solid fa-circle-check"></i><span>Doğrula</span>
              </button>
              <button class="more" data-act="verify-more" aria-label="Doğrulama seçenekleri">
                <i class="fa-solid fa-chevron-down"></i>
              </button>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  function openStudentCard(studentId, opts = {}) {
    const s = window.App.panel.students.find(x => x.id === studentId);
    const m = window.App.panel.markers.get(studentId);
    if (!s || !m) return;

    const html = buildCardHtml(s);

    try { m.unbindPopup(); } catch (e) {}

    m.bindPopup(html, {
      closeButton: false,
      autoPan: true,
      offset: [0, -10],
      autoClose: true,
      closeOnClick: true,
      keepInView: true
    });

    try { m.openPopup(); } catch (e) {}
  }

  window.__openStudentMiniPopup = function __openStudentMiniPopup(studentId, opts = {}) {
    openStudentCard(studentId, opts);

    setTimeout(() => {
      const m = window.App.panel.markers.get(studentId);
      const popupEl = m?.getPopup?.()?.getElement?.();
      if (!popupEl) return;

      const root = popupEl.querySelector(`.stu-card[data-stu="${studentId}"]`);
      if (!root) return;

      const s = window.App.panel.students.find(x => x.id === studentId);
      if (!s) return;

      root.addEventListener("click", (e) => { e.stopPropagation(); });

      const locked = !isSchoolFixed();

      const btnRouteMain = root.querySelector(`[data-act="route-main"]`);
      const btnRouteMore = root.querySelector(`[data-act="route-more"]`);
      const btnSvcMain   = root.querySelector(`[data-act="svc-main"]`);
      const btnSvcMore   = root.querySelector(`[data-act="svc-more"]`);
      const btnVerifyMain = root.querySelector(`[data-act="verify-main"]`);
      const btnVerifyMore = root.querySelector(`[data-act="verify-more"]`);

      btnVerifyMain?.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        window.__verifyStudent?.(studentId);
        window.__openStudentMiniPopup?.(studentId, { force: true });
      });

      btnVerifyMore?.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        openMenu(btnVerifyMore, [
          { label: "Doğrula (kilitle)", onClick: () => window.__verifyStudent?.(studentId) },
          { type: "sep" },
          { label: "Sadece haritada odakla", onClick: () => {
              const p = m.getLatLng();
              map.flyTo(p, 17, { animate: true });
            }
          }
        ]);
        setTimeout(() => window.__openStudentMiniPopup?.(studentId, { force: true }), 0);
      });

      btnRouteMain?.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (locked) { requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle."); return; }
        const p = m.getLatLng();
        map.flyTo(p, 17, { animate: true });
        await window.drawSingleRouteToSchool(p.lat, p.lng);
      });

      btnRouteMore?.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (locked) { requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle."); return; }

        openMenu(btnRouteMore, [
          { label: "Rota çiz (Tek rota)", onClick: async () => {
              const p = m.getLatLng();
              map.flyTo(p, 17, { animate: true });
              await window.drawSingleRouteToSchool(p.lat, p.lng);
            }
          },
          { type: "sep" },
          { label: "Haritada odakla", onClick: () => {
              const p = m.getLatLng();
              map.flyTo(p, 17, { animate: true });
            }
          }
        ]);
      });

      btnSvcMain?.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (locked) { requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle."); return; }
        openServiceModal(studentId);
      });

      btnSvcMore?.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (locked) { requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle."); return; }

        openMenu(btnSvcMore, [
          { label: "Servise ekle/değiştir", onClick: () => openServiceModal(studentId) },
          { type: "sep" },
          { label: "Servisten çıkar", disabled: !s.service, onClick: () => window.__removeStudentFromService?.(studentId) }
        ]);
      });

    }, 0);
  };
}
