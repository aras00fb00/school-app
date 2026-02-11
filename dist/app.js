/* =========================================================
9) SERVICES MODULE — FINAL
- Modal: #servicePickModal
- Buttons: .svcPickBtn[data-svc="A".."F"], #svcCancelBtn, #svcRemoveBtn
- Seçilen öğrenci: App.ui.schoolLock.__pendingStudentId
- ✅ Marker badge güncellenir
- ✅ Panel listeleri re-render edilir
========================================================= */
function initServicesModule(map) {
  if (window.App.inited.services) return;
  window.App.inited.services = true;

  const modal = document.getElementById("servicePickModal");
  if (!modal) return;

  const cancelBtn = document.getElementById("svcCancelBtn");
  const removeBtn = document.getElementById("svcRemoveBtn");
  const nameEl = document.getElementById("svcStudentName");

  const serviceState = window.App.panel.serviceState;

  function close() {
    modal.classList.remove("active");
    window.App.ui.schoolLock.__pendingStudentId = null;
  }

  function ensureArray(letter) {
    if (!serviceState["sv" + letter]) serviceState["sv" + letter] = [];
    return serviceState["sv" + letter];
  }

  function setStudentService(studentId, letter) {
    const s = window.App.panel.students?.find(x => x.id === studentId);
    if (!s) return;

    // remove from old
    if (s.service) {
      const arrOld = ensureArray(s.service);
      const i = arrOld.indexOf(studentId);
      if (i >= 0) arrOld.splice(i, 1);
    }

    s.service = letter;

    // add to new
    const arr = ensureArray(letter);
    if (!arr.includes(studentId)) arr.push(studentId);

    window.__updateStudentMarkerIcon?.(studentId);
    window.__renderPanelLists?.();
    softToast(`Servis ${letter} atandı`, "ok");
  }

  function removeStudentService(studentId) {
    const s = window.App.panel.students?.find(x => x.id === studentId);
    if (!s) return;

    if (s.service) {
      const arr = ensureArray(s.service);
      const i = arr.indexOf(studentId);
      if (i >= 0) arr.splice(i, 1);
    }

    s.service = null;
    window.__updateStudentMarkerIcon?.(studentId);
    window.__renderPanelLists?.();
    softToast("Servisten çıkarıldı", "warn");
  }

  // expose
  window.__removeStudentFromService = function (studentId) {
    removeStudentService(studentId);
  };

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  cancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });

  removeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const id = window.App.ui.schoolLock.__pendingStudentId;
    if (!id) return;
    removeStudentService(id);
    close();
  });

  modal.querySelectorAll(".svcPickBtn,[data-svc]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = window.App.ui.schoolLock.__pendingStudentId;
      const letter = btn.getAttribute("data-svc");
      if (!id || !letter) return;
      setStudentService(id, letter);
      close();
    });
  });

  // when modal opens, update label if possible
  const obs = new MutationObserver(() => {
    if (!modal.classList.contains("active")) return;
    const id = window.App.ui.schoolLock.__pendingStudentId;
    const s = window.App.panel.students?.find(x => x.id === id);
    if (nameEl) nameEl.textContent = s ? `— ${s.name}` : "—";
    if (removeBtn) removeBtn.style.display = s?.service ? "block" : "none";
  });
  obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
}

/* =========================================================
10) PANEL SEARCH MODULE — FINAL (OWNER of docking)
- #panel-search (tek DOM) hem panelde hem map nav dock’ta kullanılır
- ✅ Menü açılınca gizlenir
- ✅ Harita sayfasında: okul sabit değilse görünmez
- ✅ Harita sayfasında: nav altı ortalı dock’a taşınır (mapSearchDock)
- ✅ Öneriler sade + pointer
========================================================= */
function initPanelSearchModule(map) {
  if (window.App.inited.panelSearch) return;
  window.App.inited.panelSearch = true;

  ensureInjectedUiStyles();

  const searchWrap = document.getElementById("panel-search");
  const input = document.getElementById("search-input");
  const suggest = document.getElementById("search-suggest");
  const mapDock = document.getElementById("mapSearchDock"); // ✅ nav altı dock container

  if (!searchWrap || !input || !suggest) return;

  let aborter = null;
  let lastQuery = "";
  let lastList = [];
  let selectionMarker = null;

  function hideSuggest() {
    suggest.classList.remove("active");
    suggest.innerHTML = "";
    lastList = [];
  }
  window.__hidePanelSuggest = hideSuggest;

  function showSuggest(list) {
    suggest.innerHTML = "";
    if (!list || !list.length) {
      hideSuggest();
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((r, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.idx = String(idx);
      div.textContent = r.display_name || "Adres";
      div.style.cursor = "pointer";
      frag.appendChild(div);
    });
    suggest.appendChild(frag);
    suggest.classList.add("active");
  }

  async function nominatimSearchTR(q) {
    if (aborter) { try { aborter.abort(); } catch(e){} }
    aborter = new AbortController();

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      "format=json&limit=7&countrycodes=tr&accept-language=tr&q=" +
      encodeURIComponent(q);

    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: aborter.signal });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }

  function ensureSelectionMarker(lat, lng) {
    const ll = L.latLng(lat, lng);
    if (!selectionMarker) {
      selectionMarker = L.marker(ll, {
        interactive: false,
        keyboard: false,
        opacity: 0.95
      }).addTo(map);
    } else {
      selectionMarker.setLatLng(ll);
    }
    return selectionMarker;
  }

  function selectResult(r) {
    if (!r) return;

    const lat = +r.lat, lng = +r.lon;
    window.App.activeSearchSelection = { lat, lng, display_name: r.display_name || "" };
    window.__activeSearchSelection = window.App.activeSearchSelection;

    // ✅ "kayıtlı olmayan adreslere tıklanınca marker oluşmuyor" FIX
    ensureSelectionMarker(lat, lng);

    // okul sabit değilse: okulu bu adrese preview yap (harita modunda da aynı davranış)
    if (!isSchoolFixed()) {
      window.setSchoolFromSearch?.(lat, lng, r.display_name || "");
      enforceSchoolLock();
    } else {
      map.flyTo([lat, lng], 16, { animate: true, duration: 0.7 });
      pulseAt?.(lat, lng, "rgba(13,202,240,.85)", 900);
    }

    hideSuggest();
    input.blur();
  }

  // ✅ Map Search görünürlüğü (Maps page’de)
  window.setMapSearchVisible =
    window.setMapSearchVisible ||
    function setMapSearchVisible(visible) {
      const v = !!visible;
      // Menü gizleme override
      if (window.App.hooks.panelSearch.hiddenByMenu) {
        searchWrap.style.display = "none";
        if (mapDock) mapDock.style.display = "none";
        return;
      }

      if (!mapDock) {
        // fallback: direkt göster/gizle
        searchWrap.style.display = v ? "" : "none";
        return;
      }

      if (v) {
        mapDock.style.display = "block";
        searchWrap.classList.add("is-navdock");
        if (searchWrap.parentElement !== mapDock) mapDock.appendChild(searchWrap);
        searchWrap.style.display = "block";
      } else {
        hideSuggest();
        mapDock.style.display = "none";
        searchWrap.style.display = "none";
      }
    };

  // Menü aç/kapa ile senkron
  (window.App.hooks.panelSearch.onMenuToggle || []).push((hidden) => {
    if (hidden) {
      hideSuggest();
      if (mapDock) mapDock.style.display = "none";
    } else {
      // maps page’de okul sabitse tekrar aç
      const mapsActive = document.getElementById("pageMaps")?.classList.contains("active");
      if (mapsActive) window.setMapSearchVisible?.(isSchoolFixed());
    }
  });

  // input behavior
  input.addEventListener("input", window.App.utils.debounce(async () => {
    const q = input.value.trim();
    lastQuery = q;

    if (q.length < 3) {
      hideSuggest();
      return;
    }

    let list = [];
    try { list = await nominatimSearchTR(q); } catch(e) { return; }
    if (q !== lastQuery) return;

    // sadeleştir: aynı görünenleri azalt
    const seen = new Set();
    list = (list || []).filter(r => {
      const t = (r.display_name || "").trim();
      if (!t) return false;
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    lastList = list;
    showSuggest(list);
  }, 260));

  // click suggest (delegate)
  suggest.addEventListener("click", (e) => {
    const item = e.target.closest?.(".item");
    if (!item) return;
    const idx = +item.dataset.idx;
    const r = lastList[idx];
    selectResult(r);
  });

  // outside click close
  if (!window.App.inited.__panelSearchOutsideClose) {
    window.App.inited.__panelSearchOutsideClose = true;
    document.addEventListener("click", (e) => {
      if (e.target.closest("#panel-search")) return;
      hideSuggest();
    });
  }

  // enter key => first result
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (lastList && lastList[0]) selectResult(lastList[0]);
    } else if (e.key === "Escape") {
      hideSuggest();
      input.blur();
    }
  });

  // initial state
  try {
    const mapsActive = document.getElementById("pageMaps")?.classList.contains("active");
    if (mapsActive) window.setMapSearchVisible?.(isSchoolFixed());
    else window.setMapSearchVisible?.(false);
  } catch(e){}
}

/* =========================================================
11) STUDENT MINI POPUP MODULE — FINAL
- ✅ Marker tıklanınca her seferinde açılır (force)
- ✅ Minimal gri popup + Rota + Servise Ekle
========================================================= */
function initStudentPopupModule(map) {
  if (window.App.inited.studentPopups) return;
  window.App.inited.studentPopups = true;

  let openId = null;
  let openPopup = null;
  let splitMenu = null;

  function closeSplitMenu() {
    if (splitMenu) {
      splitMenu.remove();
      splitMenu = null;
    }
  }

  function buildSplitMenu(anchorEl, studentId) {
    closeSplitMenu();

    const rect = anchorEl.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "split-menu";
    menu.style.left = Math.round(rect.left) + "px";
    menu.style.top = Math.round(rect.bottom + 6) + "px";

    const mk = (txt, act, disabled = false) => {
      const d = document.createElement("div");
      d.className = "mi";
      d.textContent = txt;
      if (disabled) d.setAttribute("aria-disabled", "true");
      d.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        closeSplitMenu();

        if (act === "verify") window.__verifyStudent?.(studentId);
        if (act === "removeSvc") window.__removeStudentFromService?.(studentId);
      });
      return d;
    };

    const s = window.App.panel.students?.find(x => x.id === studentId);
    menu.appendChild(mk("Doğrula", "verify", s?.accuracy === "exact"));
    menu.appendChild(mk("Servisten Çıkar", "removeSvc", !s?.service));

    document.body.appendChild(menu);
    splitMenu = menu;

    setTimeout(() => {
      const onDoc = (ev) => {
        if (ev.target.closest(".split-menu")) return;
        closeSplitMenu();
        document.removeEventListener("click", onDoc, true);
      };
      document.addEventListener("click", onDoc, true);
    }, 0);
  }

  function popupHTML(s) {
    const svcText = s.service ? `Servis ${s.service}` : "Servis —";
    const addr = (s.site || s.street || s.avenue || s.raw || "—");
    const pickup = s.pickup || "—";
    const drop = s.drop || "—";

    const lockedSchool = !isSchoolFixed();
    const disabledAttr = lockedSchool ? "disabled" : "";

    return `
      <div class="stu-card" data-popup-stu="${s.id}">
        <div class="top">
          <div>
            <div class="nm">${s.name}</div>
            <div class="meta">${svcText}</div>
          </div>
          <div class="pill">${s.accuracy === "exact" ? "✅" : s.accuracy === "approx" ? "⚠️" : "❌"}</div>
        </div>

        <div class="addr">${addr}</div>

        <div class="grid">
          <div class="kv"><div class="k">Alınış</div><div class="v">${pickup}</div></div>
          <div class="kv"><div class="k">Bırakış</div><div class="v">${drop}</div></div>
        </div>

        <div class="actions">
          <div class="split">
            <button class="main" data-act="route" ${disabledAttr}>
              <i class="fa-solid fa-route"></i> Rota
            </button>
            <button class="more" data-act="more" aria-label="more">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>

          <button class="mainBtn" data-act="svc" ${disabledAttr}
            style="border:none;border-radius:4px;padding:9px 10px;font-size:12px;font-weight:800;cursor:pointer;
              background:rgba(255,205,57,.14);color:#fff;border:1px solid rgba(255,205,57,.22)">
            <i class="fa-solid fa-bus"></i> Servise Ekle
          </button>
        </div>

        ${lockedSchool ? `<div style="margin-top:8px;font-size:11px;opacity:.75">Önce okul adresini sabitle.</div>` : ""}
      </div>
    `;
  }

  function openPopupFor(studentId, opts = {}) {
    const s = window.App.panel.students?.find(x => x.id === studentId);
    const m = window.App.panel.markers?.get(studentId);
    if (!s || !m) return;

    const latlng = m.getLatLng();
    openId = studentId;

    // önceki popup kapat
    try { if (openPopup) map.closePopup(openPopup); } catch(e){}
    closeSplitMenu();

    openPopup = L.popup({
      autoClose: false,
      closeOnClick: false,
      className: "stu-mini-popup",
      offset: L.point(0, -6)
    })
      .setLatLng(latlng)
      .setContent(popupHTML(s));

    openPopup.openOn(map);

    // action binding (popup DOM hazır olunca)
    window.App.utils.raf2(() => {
      const root = document.querySelector(`.stu-card[data-popup-stu="${studentId}"]`);
      if (!root) return;

      root.addEventListener("click", async (e) => {
        const btn = e.target.closest?.("[data-act]");
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const act = btn.getAttribute("data-act");

        if (act === "route") {
          if (!requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.")) return;
          const p = m.getLatLng();
          map.flyTo(p, 17, { animate: true, duration: 0.6 });
          await window.drawSingleRouteToSchool(p.lat, p.lng);
          return;
        }

        if (act === "svc") {
          if (!requireSchoolFixedOrRedirect("Önce okul adresini seçip sabitle.")) return;
          window.App.ui.schoolLock.__pendingStudentId = studentId;
          const nm = document.getElementById("svcStudentName");
          if (nm) nm.textContent = `— ${s.name}`;
          const rm = document.getElementById("svcRemoveBtn");
          if (rm) rm.style.display = s.service ? "block" : "none";
          document.getElementById("servicePickModal")?.classList.add("active");
          return;
        }

        if (act === "more") {
          buildSplitMenu(btn, studentId);
          return;
        }
      }, { once: true });
    });
  }

  window.__openStudentMiniPopup = function (studentId, opts = {}) {
    // ✅ force ile her tıklamada aç
    if (!opts.force && openId === studentId) return;
    openPopupFor(studentId, opts);
  };

  // popup kapatınca state temizle
  map.on("popupclose", () => {
    openId = null;
    openPopup = null;
    closeSplitMenu();
  });
}

/* =========================================================
12) STUDENTS PAGE INIT/DESTROY — FINAL (safe no-op)
========================================================= */
window.StudentsPageInit =
  window.StudentsPageInit ||
  function StudentsPageInit() {
    // panel listeleri zaten render ediliyor; ekstra gerekiyorsa burada yapılır
    // şimdilik no-op (hata vermesin diye)
  };

window.StudentsPageDestroy =
  window.StudentsPageDestroy ||
  function StudentsPageDestroy() {
    // no-op
  };

/* =========================================================
BOOTSTRAP — FINAL
- DOM hazır olunca miniMap zaten initPages içinde hazırlanıyor.
- Harita sayfasına girince initMainMap() çalışıyor.
========================================================= */
(function bootOnce() {
  window.App.utils.once("__bootOnce", () => {
    ensureInjectedUiStyles();
  });
})();
