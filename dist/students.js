/* ==========================================
1) VERİ VE GLOBAL DEĞİŞKENLER
===========================================*/
let ogrenciler = [
  {
    id: 1,
    servis_no: "1",
    ad_soyad: "Ad-Soyad",
    adres: "AdresAdresAdresAdres AdresAdresAdresAdres AdresAdresAdresAdresAdres AdresAdres",
    sinif: "1E",
    sabah: "07:25",
    aksam: "16:25",
    baba: "Ahmet Mahmutoğlu",
    baba_tel: "0532 000 11 22",
    anne: "Nurten Keskinoğlu",
    anne_tel: "0533 000 11 22",
    not: "Servis kapıdan alsın."
  },
  {
    id: 2,
    servis_no: "2",
    ad_soyad: "Merkez",
    adres: "34 OLP 123",
    sabah: "2024",
    aksam: "Crafter",
    baba: "Savaş",
    baba_tel: "0532 000 11 22",
    anne: "Ayşe",
    anne_tel: "0533 000 11 22",
    not: "XYZ Turizm"
  }
];

let filtered = [...ogrenciler];
let sortCol = null;
let sortDir = 1;
let openedRow = null;
let recordToDelete = null;

/* =========================================================
2) TABLO — SIRALAMA (FINAL)
=========================================================*/
$(".tbl-header th[data-col]").on("click", function () {
  const col = $(this).data("col");

  // aynı kolona basılırsa yön değiş
  sortDir = sortCol === col ? sortDir * -1 : 1;
  sortCol = col;

  filtered.sort((a, b) => {
    /* =========================
       SERVİS NO — SAF NUMERIC
       1,2,3...10,11
    ========================= */
    if (col === "servis_no") {
      const av = Number(a[col] ?? 0);
      const bv = Number(b[col] ?? 0);
      return (av - bv) * sortDir;
    }

    /* =========================
       DİĞER TÜM SÜTUNLAR
    ========================= */
    return naturalSort(a[col], b[col]) * sortDir;
  });

  updateSortIcons();
  renderTable();
});

/* =========================================================
NATURAL SORT (GENEL)
=========================================================*/
function naturalSort(a = "", b = "") {
  a = a ?? "";
  b = b ?? "";

  const ax = split(a);
  const bx = split(b);
  const len = Math.max(ax.length, bx.length);

  for (let i = 0; i < len; i++) {
    const x = ax[i];
    const y = bx[i];

    if (x === undefined) return -1;
    if (y === undefined) return 1;

    if (typeof x === "number" && typeof y === "number") {
      if (x !== y) return x - y;
    }

    if (typeof x === "string" && typeof y === "string") {
      const cmp = x.localeCompare(y, "tr", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;

  function split(v) {
    return v
      .toString()
      .trim()
      .split(/(\d+)/)
      .filter((p) => p !== "")
      .map((p) => (isNaN(p) ? p.toLowerCase() : Number(p)));
  }
}

/* ==============================================
SORT ICON GÜNCELLEME
==========================================*/
function updateSortIcons() {
  $(".tbl-header th").removeClass("active asc desc");

  if (!sortCol) return;

  const th = $(`.tbl-header th[data-col='${sortCol}']`);
  th.addClass("active").addClass(sortDir === 1 ? "asc" : "desc");
}

/* ===========================================
3) TABLO — RENDER
============================================*/
function renderTable() {
  const tbody = $("#tableBody");
  tbody.empty();

  if (!filtered.length) {
    $("#emptyTableMessage").removeClass("d-none");
    $(".rows_count").text("Gösterilecek kayıt yok");
    $(".pagination").empty();
    return;
  }

  $("#emptyTableMessage").addClass("d-none");

  filtered.forEach((a) =>
    tbody.append(`
    <tr data-id="${a.id}">
    <td class="detail-srv-center">
          <span class="detail-srv">${a.servis_no}</span>
        </td>
<td class="route">${a.ad_soyad}</td>
      <td>
        <div class="plate-tr">
          <div class="plate-left">TR</div>
          <div class="plate-right">${a.adres}</div>
        </div>
      </td>
      <td class="hst">${a.sinif}</td>
      <td class="hst">${a.sabah}</td>
      <td class="hst">${a.aksam}</td>
      <td class="hst">${a.anne}</td>
      <td class="drv">${a.baba}</td>
      <td class="text-center">
        <button class="more-btn btn btn-sm btn-light">
          <i class="fa fa-ellipsis-h"></i>
        </button>
      </td>
    </tr>
  `)
  );

  applyPagination();
}

/* ==========================================
4) HEADER SCROLL — SENKRON
==========================================*/
$(".tbl-content").on("scroll", function () {
  $(".tbl-header").scrollLeft($(this).scrollLeft());
});

/* =============================================
5) CHILD ROW — DETAY
===========================================*/
$(document).on("click", "#dataTable tbody tr", function (e) {
  if ($(e.target).closest("button").length) return;

  const tr = $(this);

  // Kapat
  if (tr.hasClass("row-open")) {
    tr.removeClass("row-open");
    tr.next(".detail-row").remove();
    openedRow = null;
    return;
  }

  // Diğer açık satırı kapat
  if (openedRow) {
    openedRow.removeClass("row-open");
    openedRow.next(".detail-row").remove();
  }

  // Yeni aç
  tr.addClass("row-open");
  openedRow = tr;

  const id = tr.data("id");
  const item = ogrenciler.find((x) => x.id == id);
  const w = window.innerWidth;
  const colspan = w <= 576 ? 4 : w <= 768 ? 6 : w <= 992 ? 7 : 9;

  tr.after(buildDetailRow(item, colspan));

  const shell = tr.next(".detail-row").find(".detail-shell");

  requestAnimationFrame(() => {
    shell.css("height", shell.prop("scrollHeight") + "px");
    tr.next(".detail-row").addClass("show");
  });
});

// buton da açsın
$(document).on("click", ".more-btn", function (e) {
  e.stopPropagation();
  $(this).closest("tr").trigger("click");
});

function buildDetailRow(item, colspan) {
  return `
<tr class="detail-row">
<td colspan="${colspan}">
  <div class="detail-shell">
    <div class="detail-content">

      <div class="detail-grid">

        <!-- 1: Servis No + Servis Listesi -->
<div class="detail-srv-center">
  <button
    type="button"
    class="split-btn info student-btn">
    <span class="icon-part">
      <i class="fa-solid fa-users"></i>
    </span>
    <span class="label-part">Servis Listesi</span>
  </button>
</div>


        <!-- 2: Ad-Soyad -->
        <div class="detail-route-center">
  <button
  class="split-btn secondary route-detail-btn">
    <span class="icon-part"><i class="fa-solid fa-route"></i>
  </span>
  <span class="label-part">Güzergah Detay</span>
</button>

</div>

        <!-- 3: Not -->
        <div class="detail-not">
          ${item.not}</div>

        <!-- 4: Sınıf -->
        <div class="detail-sinif">
          ${item.sinif}
        </div>

        <!-- 5: Sabah -->
        <div class="detail-sabah">
          ${item.sabah}</div>

        <!-- 6: Akşam -->
        <div class="detail-aksam">
          ${item.aksam}
        </div>

        <!-- 7: Anne Tel-->
        <div class="detail-anne">
          <i class="fa fa-phone"></i>
          <a href="tel:${item.anne_tel}">
            ${item.anne_tel}
          </a>
        </div>

        <!-- 8: Baba Tel -->
        <div class="detail-baba">
          <i class="fa fa-phone"></i>
          <a href="tel:${item.baba_tel}">
            ${item.baba_tel}
          </a>
        </div>

        <!-- 9: Aksiyon -->
        <div class="detail-islemler">
          <button class="split-btn is-interactive primary edit" data-id="${item.id}">
            <span class="icon-part"><i class="fa fa-edit"></i></span> 
            <span class="label-part">Düzenle </span>
          </button>
          <button class="split-btn is-interactive danger delete" data-id="${item.id}">
            <span class="icon-part"><i class="fa fa-trash"></i></span> 
            <span class="label-part">Sil </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</td>
</tr>`;
}

window.addEventListener("resize", () => {
  if (openedRow) {
    openedRow.trigger("click"); // kapat
  }
});

/* =========================================================
6) SAYFALAMA — FINAL (SPLIT + SMART)
========================================================= */

let currentPage = 1;

/* ===============================
   SMART PAGE BUILDER
=============================== */
function buildSmartPages(totalPages, currentPage) {
  const pages = [];
  const delta = 1;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    }
  }

  const result = [];
  let last = 0;

  for (const p of pages) {
    if (p - last > 1) result.push("…");
    result.push(p);
    last = p;
  }

  return result;
}

/* ===============================
   PAGINATION OLUŞTUR
=============================== */
function applyPagination() {
  const maxRows = parseInt($("#maxRows").val());
  const total = filtered.length;
  const totalPages = Math.ceil(total / maxRows);
  const $pagination = $(".pagination");

  $pagination.empty();

  /* tek sayfa */
  if (totalPages <= 1) {
    $("#dataTable tbody tr").show();
    $(".rows_count").text(`Toplam ${total} kayıt`);
    currentPage = 1;
    return;
  }

  /* FIRST */
  $pagination.append(`
    <li class="page-item first ${currentPage === 1 ? "disabled" : ""}">
      <a class="split-btn dark">
        <span class="icon-part"><i class="fa-solid fa-backward-step"></i></span>
        <span class="label-part">İlk Sayfa</span>
      </a>
    </li>
  `);

  /* PREV */
  $pagination.append(`
    <li class="page-item prev ${currentPage === 1 ? "disabled" : ""}">
      <a class="split-btn excel">
        <span class="icon-part"><i class="fa-solid fa-chevron-left"></i></span>
        <span class="label-part">Önceki</span>
      </a>
    </li>
  `);

  /* SAYFA NUMARALARI */
  buildSmartPages(totalPages, currentPage).forEach((p) => {
    if (p === "…") {
      $pagination.append(`
        <li class="page-item dots disabled">
    <a class="split-btn warning dots-btn">
      <span class="icon-part">…</span>
    </a>
  </li>
      `);
      return;
    }

    $pagination.append(`
      <li class="page-item number ${
        p === currentPage ? "active" : ""
      }" data-page="${p}">
        <a class="split-btn ${p === currentPage ? "success" : "warning"}">
          <span class="icon-part">${p}</span>
        </a>
      </li>
    `);
  });

  /* NEXT */
  $pagination.append(`
    <li class="page-item next ${currentPage === totalPages ? "disabled" : ""}">
      <a class="split-btn excel">
        <span class="icon-part"><i class="fa-solid fa-chevron-right"></i></span>
        <span class="label-part">Sonraki</span>
      </a>
    </li>
  `);

  /* LAST */
  $pagination.append(`
    <li class="page-item last ${currentPage === totalPages ? "disabled" : ""}">
      <a class="split-btn dark">
        <span class="icon-part"><i class="fa-solid fa-forward-step"></i></span>
        <span class="label-part">Son Sayfa</span>
      </a>
    </li>
  `);

  bindPaginationEvents();
  showPage(currentPage, false);
}

/* ===============================
   SAYFA GÖSTER
=============================== */
function showPage(page, rebuild = true) {
  const maxRows = parseInt($("#maxRows").val());
  const totalPages = Math.ceil(filtered.length / maxRows);

  if (page < 1 || page > totalPages) return;

  currentPage = page;

  const start = (page - 1) * maxRows;
  const end = start + maxRows;

  $("#dataTable tbody tr").hide().slice(start, end).show();

  $(".rows_count").text(
    `${start + 1} – ${Math.min(end, filtered.length)} / Toplam ${
      filtered.length
    }`
  );

  if (rebuild) applyPagination();
}

/* ===============================
   EVENT BIND
=============================== */
function bindPaginationEvents() {
  $(".pagination")
    .off("click")

    /* numaralar */
    .on("click", ".page-item.number:not(.active):not(.disabled)", function () {
      showPage(parseInt($(this).data("page")));
    })

    /* first / last / prev / next */
    .on("click", ".page-item.first:not(.disabled)", () => showPage(1))
    .on("click", ".page-item.last:not(.disabled)", () => {
      const maxRows = parseInt($("#maxRows").val());
      showPage(Math.ceil(filtered.length / maxRows));
    })
    .on("click", ".page-item.prev:not(.disabled)", () =>
      showPage(currentPage - 1)
    )
    .on("click", ".page-item.next:not(.disabled)", () =>
      showPage(currentPage + 1)
    );
}

/* ===============================
   MAX ROWS CHANGE
=============================== */
$("#maxRows").on("change", function () {
  currentPage = 1;
  applyPagination();
});

/* ===============================
   KEYBOARD ← →
=============================== */
$(document).on("keydown", function (e) {
  if ($(".modal.show").length) return;

  const tag = e.target.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return;

  const maxRows = parseInt($("#maxRows").val());
  const totalPages = Math.ceil(filtered.length / maxRows);

  if (e.key === "ArrowLeft" && currentPage > 1) showPage(currentPage - 1);
  if (e.key === "ArrowRight" && currentPage < totalPages)
    showPage(currentPage + 1);
});

/* =========================================================
7) ARAMA
=========================================================*/
$("#searchInput").on("keyup", function () {
  const t = $(this).val().toLowerCase();

  filtered = ogrenciler.filter((r) =>
    Object.values(r).join(" ").toLowerCase().includes(t)
  );

  renderTable();
});

$("#maxRows").change(renderTable);

/* =========================================================
8) MODAL — YENİ KAYIT
=========================================================*/
$("#addNewBtn").on("click", () => {
  $("#aracForm")[0].reset();
  $("#editIndex").val("");

  clearValidation();

  new bootstrap.Modal("#aracModal").show();
});

/* =========================================================
9) FORM YARDIMCI — TELEFON
=========================================================*/
function getDigits(s) {
  return (s || "").replace(/\D/g, "");
}

function isValidTel(s) {
  const d = getDigits(s);
  if (!d) return false;

  if (d.startsWith("0")) return d.length === 11 && d[1] === "5";

  if (d.startsWith("5")) return d.length === 10;

  return false;
}

/* =========================================================
10) FORM VALIDASYON
=========================================================*/
function clearValidation() {
  $("#aracForm .is-invalid").removeClass("is-invalid");
  $("#aracForm .invalid-feedback").text("");
}

function fail(sel, msg) {
  $(sel).addClass("is-invalid");
  $(sel).next(".invalid-feedback").text(msg);
}

function validateForm() {
  clearValidation();

  let ok = true;

  function req(sel, msg) {
    if (!$(sel).val()) {
      fail(sel, msg);
      ok = false;
    }
  }

  req("#adres", "adres zorunludur");
  req("#servis_no", "Servis seçiniz");
  req("#ad-soyad", "Güzergah seçiniz");
  req("#aksam", "aksam seçiniz");
  req("#sabah", "sabah seçiniz");

  if (!isValidTel($("#baba_tel").val())) ok = false;
  if (!isValidTel($("#anne_tel").val())) ok = false;
  if (!isValidTel($("#not_tel").val())) ok = false;

  return ok;
}

/* =========================================================
11) KAYDET
=========================================================*/
$("#btnSave").on("click", () => {
  if (!validateForm()) return;

  const id = $("#editIndex").val();

  const data = getFormData(id);

  if (id) ogrenciler = ogrenciler.map((x) => (x.id == id ? data : x));
  else ogrenciler.push(data);

  filtered = [...ogrenciler];
  renderTable();

  bootstrap.Modal.getInstance("#aracModal").hide();
});

function getFormData(id) {
  function gv(sel) {
    return ($(sel).val() || "").trim();
  }

  return {
    id: id ? Number(id) : Math.max(0, ...ogrenciler.map((x) => x.id)) + 1,
    adres: gv("#adres"),
    servis_no: gv("#servis_no"),
    ad_soyad: gv("#ad_soyad"),
    sabah: gv("#sabah"),
    aksam: gv("#aksam"),
    baba: gv("#baba_ad"),
    baba_tel: gv("#baba_tel"),
    anne: gv("#anne_ad"),
    anne_tel: gv("#anne_tel"),
    not: gv("#not"),
    not_tel: gv("#not_tel")
  };
}

/* =========================================================
12) DÜZENLE
=========================================================*/
$(document).on("click", ".edit", function (e) {
  e.stopPropagation();

  const id = $(this).data("id");
  const a = ogrenciler.find((x) => x.id == id);

  $("#editIndex").val(a.id);

  $("#adres").val(a.adres);
  $("#servis_no").val(a.servis_no);
  $("#ad-soyad").val(a.ad_soyad);
  $("#sabah").val(a.sabah);
  $("#aksam").val(a.aksam);

  $("#baba_ad").val(a.baba);
  $("#baba_tel").val(a.baba_tel);

  $("#anne_ad").val(a.anne);
  $("#anne_tel").val(a.anne_tel);

  $("#not").val(a.not);
  $("#not_tel").val(a.not_tel);

  clearValidation();

  new bootstrap.Modal("#aracModal").show();
});

/* =========================================================
13) SİL
=========================================================*/
$(document).on("click", ".delete", function (e) {
  e.stopPropagation();

  recordToDelete = $(this).data("id");

  const r = ogrenciler.find((x) => x.id == recordToDelete);
  $("#deleteRecordDetails").text(r.adres);

  new bootstrap.Modal("#deleteModal").show();
});

$("#confirmDeleteBtn").on("click", () => {
  ogrenciler = ogrenciler.filter((x) => x.id != recordToDelete);

  filtered = [...ogrenciler];
  renderTable();

  bootstrap.Modal.getInstance("#deleteModal").hide();
});

/* =========================================================
14) YENİLE
=========================================================*/
$("#refreshBtn").on("click", () => {
  $("#searchInput").val("");
  filtered = [...ogrenciler];
  renderTable();
});

/* =========================================================
15) EXPORT / PDF / PRINT
=========================================================*/
function buildExportMatrix(colsOverride) {
  // Print modal checkbox'ları varsa seçili kolonları al
  let cols = Array.isArray(colsOverride) ? colsOverride : null;

  if (!cols || cols.length === 0) {
    if (typeof getPrintColumns === "function") {
      cols = getPrintColumns();
    }
  }

  // Eğer hiç kolon seçili değilse default kolonlar
  if (!cols || cols.length === 0) {
    cols = [
      { key: "servis_no", title: "Servis No" },
      { key: "ad-soyad", title: "Güzergah" },
      { key: "adres", title: "adres" },
      { key: "baba", title: "Sürücü" },
      { key: "anne", title: "anne" },
      { key: "not", title: "Tedarikçi" }
    ];
  }

  // Header satırı
  const headerRow = cols.map((c) => c.title);

  // Veri satırları (ekrandaki filtrelenmiş liste)
  const source = Array.isArray(filtered)
    ? filtered
    : Array.isArray(ogrenciler)
    ? ogrenciler
    : [];

  const bodyRows = source.map((item) => {
    return cols.map((c) => {
      let v = item?.[c.key];

      if (v === null || v === undefined) return "";

      // güvenli string
      return String(v);
    });
  });

  // pdfMake / xlsx için: [header, ...rows]
  return [headerRow, ...bodyRows];
}

/* ===========================
   BUTTON BINDINGS (exports.bindings.js)
=========================== */

// Excel
$("#exportExcel").on("click", function () {
  exportToExcel();
});

// PDF
$("#exportPdf").on("click", function () {
  exportToPdf(); // pdf.js'deki async fonksiyon (await kullanıyor)
});

// Copy
$("#copyTable").on("click", function () {
  copyTableToClipboard();
});

// Print modal aç
$("#printTable").on("click", function () {
  const m = new bootstrap.Modal(document.getElementById("printModal"));
  m.show();
});

// Print modal içi "Yazdır"
$("#confirmPrint").on("click", function () {
  doPrint();
  const m = bootstrap.Modal.getInstance(document.getElementById("printModal"));
  if (m) m.hide();
});

/* ===========================
   PRINT (print.js)
=========================== */

function getPrintColumns() {
  const map = {
    servis: { key: "servis_no", title: "Servis No" },
    ad_soyad: { key: "ad-soyad", title: "Güzergah" },
    adres: { key: "adres", title: "adres" },
    sabah: { key: "sabah", title: "sabah" },
    aksam: { key: "aksam", title: "aksam" },
    baba: { key: "baba", title: "Sürücü" },
    baba_tel: { key: "baba_tel", title: "Sürücü Tel" },
    anne: { key: "anne", title: "anne" },
    anne_tel: { key: "anne_tel", title: "anne Tel" },
    not: { key: "not", title: "Tedarikçi" },
    not_tel: { key: "not_tel", title: "Tedarikçi Tel" }
  };

  const cols = [];
  $("#printModal input[type='checkbox']:checked").each(function () {
    const v = $(this).val();
    if (map[v]) cols.push(map[v]);
  });

  return cols;
}

/* print.css içeriğini JS’den enjekte edeceğiz (dış dosya da kullanabilirsin) */
const PRINT_CSS = `
@page{size:landscape;}
body{padding:28px;font-size:13px;background:#f3f6fb;color:#333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;}
.report-box{position:relative;max-width:1100px;margin:0 auto;background:#fff;border-radius:10px;padding:24px 28px;box-shadow:0 10px 25px rgba(0,0,0,.08);border:1px solid #e8eef6;}
.report-box::before{content:"Servis Yönetim Sistemi";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);font-size:72px;font-weight:800;color:#5c6f90;opacity:.06;pointer-events:none;letter-spacing:3px;white-space:nowrap;}
.report-header{display:flex;align-items:center;gap:14px;margin-bottom:18px;}
.report-logo{width:42px;height:42px;border-radius:8px;}
.report-title{font-size:18px;font-weight:700;margin:0;}
.report-sub{font-size:12px;color:#6b778d;}
table{width:100%;border-collapse:separate;border-spacing:0;margin-top:8px;}
th{background:#eef3ff;color:#2c3e50;font-weight:600;padding:8px 10px;border-top:1px solid #dce5ff;border-bottom:1px solid #dce5ff;font-size:12px;text-align:center;vertical-align:middle;white-space:nowrap;}
td{padding:8px 10px;border-bottom:1px solid #ecf0f4;font-size:13px;text-align:center;vertical-align:middle;white-space:nowrap;}
tr:nth-child(even) td{background:#fafcff;}
.footer{margin-top:12px;font-size:11px;color:#777;text-align:right;}
@media print{body{background:white}.report-box{box-shadow:none;border:none;padding:0}}
`;

// HTML çıktıyı hazırla
function buildPrintHtml() {
  const cols = getPrintColumns();

  if (cols.length === 0) {
    alert("Lütfen en az bir sütun seçin.");
    return "";
  }

  let thead = "<tr>";
  cols.forEach((c) => {
    thead += `<th>${c.title}</th>`;
  });
  thead += "</tr>";

  let tbody = "";
  (filtered || []).forEach((a) => {
    tbody += "<tr>";
    cols.forEach((c) => {
      tbody += `<td>${a[c.key] || ""}</td>`;
    });
    tbody += "</tr>";
  });

  const today = new Date().toLocaleDateString("tr-TR");

  return `
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Araç Listesi Yazdır</title>
    <style>${PRINT_CSS}</style>
  </head>

  <body>
    <div class="report-box">
      <div class="report-header">
        <img src="https://via.placeholder.com/42" class="report-logo" alt="logo">
        <div>
          <div class="report-title">Araç Yönetim Sistemi</div>
          <div class="report-sub">Araç Listesi — ${today}</div>
        </div>
      </div>

      <table>
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>

      <div class="footer">Bu belge otomatik olarak oluşturulmuştur.</div>
    </div>
  </body>
  </html>
  `;
}

function doPrint() {
  const html = buildPrintHtml();
  if (!html) return;

  const win = window.open("", "_blank");
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

/* ===========================
   PDF (pdf.js)
=========================== */

function urlToDataURL(url) {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        })
    );
}

async function exportToPdf() {
  if (!window.pdfMake) {
    alert("PDF kütüphanesi (pdfMake) yüklenemedi.");
    return;
  }

  const data = buildExportMatrix();
  const today = new Date().toLocaleDateString("tr-TR");

  // Logo (opsiyonel)
  let logoDataUrl = null;
  try {
    logoDataUrl = await urlToDataURL("https://via.placeholder.com/42");
  } catch (e) {
    logoDataUrl = null; // logo yoksa metinle devam
  }

  const headerColumns = logoDataUrl
    ? [
        { image: "logo", width: 42 },
        [
          { text: "Araç Yönetim Sistemi", style: "title" },
          { text: "Araç Listesi — " + today, style: "sub" }
        ]
      ]
    : [
        [
          { text: "Araç Yönetim Sistemi", style: "title" },
          { text: "Araç Listesi — " + today, style: "sub" }
        ]
      ];

  const docDefinition = {
    pageOrientation: "landscape",
    pageMargins: [40, 40, 40, 40],

    watermark: {
      text: "Servis Yönetim Sistemi",
      color: "#5c6f90",
      opacity: 0.06,
      bold: true,
      fontSize: 90,
      angle: -18
    },

    content: [
      // HEADER
      {
        columns: headerColumns,
        columnGap: 12,
        margin: [0, 0, 0, 16]
      },

      // TABLE
      {
        table: {
          headerRows: 1,
          body: data
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0
              ? "#eef3ff"
              : rowIndex % 2 === 0
              ? "#fafcff"
              : null;
          },
          hLineColor: "#dfe6f3",
          vLineColor: "#dfe6f3",
          paddingLeft: function () {
            return 6;
          },
          paddingRight: function () {
            return 6;
          },
          paddingTop: function () {
            return 4;
          },
          paddingBottom: function () {
            return 4;
          }
        }
      },

      // FOOTER
      {
        text: "Bu belge otomatik olarak oluşturulmuştur.",
        alignment: "right",
        margin: [0, 12, 0, 0],
        style: "footer"
      }
    ],

    styles: {
      title: { fontSize: 16, bold: true },
      sub: { fontSize: 10, color: "#777" },
      footer: { fontSize: 9, color: "#777" }
    },

    images: logoDataUrl ? { logo: logoDataUrl } : {}
  };

  pdfMake.createPdf(docDefinition).download("arac_listesi.pdf");
}
/* =====================================
📌 EXCEL HEADER → FIELD MAP (GLOBAL)
===================================== */

const EXCEL_FIELD_MAP = {
  "adı soyadı": "ad_soyad",
  "ad soyadı": "ad_soyad",

  "adres": "adres",
  "sınıf": "sinif",

  "sabah": "sabah",
  "akşam": "aksam",
  "aksam": "aksam",

  "anne": "anne",
  "anne tel": "anne_tel",
  "anne telefon": "anne_tel",

  "baba": "baba",
  "baba tel": "baba_tel",
  "baba telefon": "baba_tel",

  "not": "not"
};
/* =====================================
⏰ EXCEL TIME → HH:MM
===================================== */
function excelTimeToHHMM(value) {
  if (value === null || value === undefined || value === "") return "";

  // Zaten string saat geldiyse (08:30 gibi)
  if (typeof value === "string" && value.includes(":")) {
    return value.trim();
  }

  const num = Number(value);
  if (isNaN(num)) return "";

  // Excel: günün kesri
  const totalMinutes = Math.round(num * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0")
  );
}

/* ===========================
   EXCEL (excel.js) — xlsx-js-style
=========================== */

function exportToExcel() {
  if (!window.XLSX) {
    alert("Excel kütüphanesi (xlsx-js-style) yüklenemedi.");
    return;
  }

  const data = buildExportMatrix();
  if (!data || !data.length) {
    alert("Aktarılacak veri bulunamadı.");
    return;
  }

  const today = new Date().toLocaleDateString("tr-TR");
  const title = "Araç Yönetim Sistemi — Araç Listesi (" + today + ")";

  /* ================================
     SAYFA VERİSİ
  =================================*/
  const sheetData = [[""], [title], [""], ...data];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const columnCount = data[0].length;

  /* ================================
     MERGE AYARLARI
  =================================*/
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({
    s: { r: 1, c: 0 },
    e: { r: 1, c: columnCount - 1 }
  });

  /* ================================
     BAŞLIK STİLİ (A2)
  =================================*/
  if (!ws["A2"]) ws["A2"] = { t: "s", v: title };

  ws["A2"].s = {
    font: { name: "Calibri", bold: true, sz: 16 },
    alignment: { horizontal: "center", vertical: "center" }
  };

  /* ================================
     TABLO HEADER (4. satır)
  =================================*/
  const headerRowIndex = 3;

  const headerStyle = {
    font: { name: "Calibri", bold: true, sz: 11, color: { rgb: "1F2D3D" } },
    fill: { fgColor: { rgb: "EAF2FF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "AFC3FF" } },
      left: { style: "thin", color: { rgb: "AFC3FF" } },
      bottom: { style: "thin", color: { rgb: "AFC3FF" } },
      right: { style: "thin", color: { rgb: "AFC3FF" } }
    }
  };

  for (let c = 0; c < columnCount; c++) {
    const cell = XLSX.utils.encode_cell({ r: headerRowIndex, c });
    if (ws[cell]) ws[cell].s = headerStyle;
  }

  /* ================================
     VERİ SATIRLARI
  =================================*/
  const rowStyle = {
    font: { name: "Calibri", sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E6EBF2" } },
      left: { style: "thin", color: { rgb: "E6EBF2" } },
      bottom: { style: "thin", color: { rgb: "E6EBF2" } },
      right: { style: "thin", color: { rgb: "E6EBF2" } }
    }
  };

  for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
    for (let c = 0; c < columnCount; c++) {
      const cell = XLSX.utils.encode_cell({ r, c });
      if (ws[cell]) ws[cell].s = rowStyle;
    }
  }

  /* ================================
     AUTO SÜTUN GENİŞLİĞİ
  =================================*/
  ws["!cols"] = data[0].map((_, c) => {
    let max = 8;
    data.forEach((row) => {
      const v = row[c] ? row[c].toString() : "";
      if (v.length > max) max = v.length;
    });
    if (max > 34) max = 34; // Excel taşmasını engelle
    return { wch: max + 1 };
  });

  /* ================================
     DOSYA
  =================================*/
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Araç Listesi");

  XLSX.writeFile(wb, "arac_listesi.xlsx");
}
/* =====================================
📥 EXCEL IMPORT — HEADER BASED (FINAL)
===================================== */

$("#excelImportBtn").on("click", function () {
  $("#excelFileInput").val("").click();
});

$("#excelFileInput").on("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Tüm satırlar (ilk satır = başlık)
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: ""
    });

    if (rows.length < 2) return;

    const headerRow = rows[0].map(h =>
      String(h).trim().toLowerCase()
    );

    rows.slice(1).forEach((row, i) => {

      let obj = {
        id: Date.now() + i,
        servis_no: null // ❗ Excel'den GELMEYECEK
      };

      headerRow.forEach((header, index) => {
  const field = EXCEL_FIELD_MAP[header];
  if (!field) return;

  if (field === "sabah" || field === "aksam") {
    obj[field] = excelTimeToHHMM(row[index]);
  } else {
    obj[field] = row[index] || "";
  }
});


      // Ad Soyad yoksa KAYDI ATLA
      if (!obj.ad_soyad) return;

      ogrenciler.push(obj);
    });

    // filtreyi yenile
    filtered = [...ogrenciler];
    renderTable();
  };

  reader.readAsArrayBuffer(file);
});


/* ===========================
   COPY (copy.js) — Excel paste friendly
=========================== */

function copyTableToClipboard() {
  const bodyTbody = document.querySelector("#dataTable tbody");
  const headerThead = document.querySelector(".tbl-header thead");

  if (!bodyTbody || !headerThead) {
    alert("Tablo bulunamadı");
    return;
  }

  // Excel'in auto genişletmesi için "dar" width veriyoruz.
  // nowrap + dar width => Excel çoğu zaman içeriğe göre genişletir.
  const html = `
  <table border="1" cellspacing="0" cellpadding="6" style="
    border-collapse:collapse;
    font-family:Calibri;
    font-size:11pt;
    text-align:center;
    white-space:nowrap;
  ">
    <thead>
      ${Array.from(headerThead.querySelectorAll("tr"))
        .map(
          (tr) => `
          <tr style="background:#eef3ff;font-weight:700;">
            ${Array.from(tr.children)
              .map(
                (th) => `
                <th style="
                  vertical-align:middle;
                  text-align:center;
                  white-space:nowrap;
                  width:20px; min-width:20px;
                ">${th.innerText}</th>
              `
              )
              .join("")}
          </tr>
        `
        )
        .join("")}
    </thead>

    <tbody>
      ${Array.from(bodyTbody.querySelectorAll("tr"))
        .map(
          (tr, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafcff"};">
            ${Array.from(tr.children)
              .map(
                (td) => `
                <td style="
                  vertical-align:middle;
                  text-align:center;
                  white-space:nowrap;
                  width:20px; min-width:20px;
                  font-family:Calibri;
                  font-size:11pt;
                ">${td.innerText}</td>
              `
              )
              .join("")}
          </tr>
        `
        )
        .join("")}
    </tbody>
  </table>
  `;

  // execCommand ile HTML kopyalama (en uyumlu yöntem)
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "fixed";
  tempDiv.style.opacity = "0";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  const range = document.createRange();
  range.selectNode(tempDiv);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  document.execCommand("copy");

  sel.removeAllRanges();
  document.body.removeChild(tempDiv);

  alert("Tablo panoya kopyalandı. Excel'e yapıştırabilirsiniz.");
}

/* =========================================================
16) INIT
=========================================================*/
renderTable();
updateSortIcons();

/****** ÖĞRENCİ MODAL ********/
$("#addStudentBtn").on("click", () => {
  $("#studentModal").addClass("show");
});

$(".modal-close, .student-modal-overlay").on("click", () => {
  $("#studentModal").removeClass("show");
});

$("#saveStudentBtn").on("click", () => {

  const ad_soyad = $("#st_ad_soyad").val().trim();
  if (!ad_soyad) {
    alert("Ad Soyad zorunlu");
    return;
  }

  const student = {
    id: Date.now(),
    servis_no: null,        // ❗ bilinçli boş
    ad_soyad,
    adres: $("#st_adres").val(),
    sinif: $("#st_sinif").val(),
    sabah: $("#st_sabah").val(),
    aksam: $("#st_aksam").val(),
    anne: $("#st_anne").val(),
    anne_tel: $("#st_anne_tel").val(),
    baba: $("#st_baba").val(),
    baba_tel: $("#st_baba_tel").val(),
    not: $("#st_not").val()
  };

  ogrenciler.push(student);
  filtered = [...ogrenciler];
  renderTable();

  $("#studentModal").removeClass("show");
});
