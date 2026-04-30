/**
 * FilaManager — Main Application Controller
 */

// ── State ──────────────────────────────────────────────────────
let allFilaments = [];
let currentView  = 'grid';
let deleteTargetId = null;
let html5QrScanner = null;
let scannerActive  = false;

// ── Bootstrap modal instances ───────────────────────────────────
let bsScannerModal, bsFilamentModal, bsDetailModal, bsDeleteModal,
    bsBarcodeMatchModal, bsToast;

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bsScannerModal      = new bootstrap.Modal(document.getElementById('scannerModal'));
  bsFilamentModal     = new bootstrap.Modal(document.getElementById('filamentModal'));
  bsDetailModal       = new bootstrap.Modal(document.getElementById('detailModal'));
  bsDeleteModal       = new bootstrap.Modal(document.getElementById('deleteModal'));
  bsBarcodeMatchModal = new bootstrap.Modal(document.getElementById('barcodeMatchModal'));
  bsToast             = new bootstrap.Toast(document.getElementById('appToast'), { delay: 3000 });

  // Expose bsDetailModal globally for inline onclick in detail render
  window.bsDetailModal = bsDetailModal;

  bindEvents();
  loadFilaments();
});

// ── Bind Events ────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('openScannerBtn').addEventListener('click', () => UI.openScanner());
  document.getElementById('openAddBtn').addEventListener('click', () => UI.openAdd());

  document.getElementById('searchInput').addEventListener('input', renderFiltered);
  document.getElementById('filterMaterial').addEventListener('change', renderFiltered);
  document.getElementById('filterStatus').addEventListener('change', renderFiltered);
  document.getElementById('filterBrand').addEventListener('change', renderFiltered);

  document.getElementById('viewGrid').addEventListener('click', () => switchView('grid'));
  document.getElementById('viewList').addEventListener('click', () => switchView('list'));

  // Scanner modal
  document.getElementById('scannerModal').addEventListener('hidden.bs.modal', stopScanner);
  document.getElementById('scannerModal').addEventListener('shown.bs.modal', startScanner);
  document.getElementById('manualBarcodeBtn').addEventListener('click', handleManualBarcode);
  document.getElementById('manualBarcodeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleManualBarcode();
  });
  document.getElementById('formScanBtn').addEventListener('click', () => {
    bsFilamentModal.hide();
    setTimeout(() => { UI._afterScanReturnToForm = true; UI.openScanner(); }, 400);
  });

  // Barcode match modal buttons
  document.getElementById('bmAddNewSpool').addEventListener('click', onBarcodeMatchAddNew);
  document.getElementById('bmEditExisting').addEventListener('click', onBarcodeMatchEdit);

  // Form save
  document.getElementById('saveFilamentBtn').addEventListener('click', saveFilament);

  // Delete confirm
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

  // Color picker sync
  document.getElementById('formColorHex').addEventListener('input', e => {
    document.getElementById('formColorHexText').value = e.target.value;
    document.getElementById('colorPreview').style.background = e.target.value;
  });
  document.getElementById('formColorHexText').addEventListener('input', e => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      document.getElementById('formColorHex').value = v;
      document.getElementById('colorPreview').style.background = v;
    }
  });

  // Weight bar
  ['formWeightTotal','formWeightRemaining'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateWeightBar));
}

// ── Load ───────────────────────────────────────────────────────
async function loadFilaments() {
  showLoading(true);
  try {
    allFilaments = await API.getAll();
    populateBrandFilter();
    renderFiltered();
    updateStats();
  } catch(e) {
    showToast('Error al cargar filamentos: ' + e.message, 'error');
  } finally {
    showLoading(false);
  }
}

// ── Render ─────────────────────────────────────────────────────
function renderFiltered() {
  const q  = document.getElementById('searchInput').value.toLowerCase();
  const fm = document.getElementById('filterMaterial').value;
  const fs = document.getElementById('filterStatus').value;
  const fb = document.getElementById('filterBrand').value;

  const filtered = allFilaments.filter(f => {
    const matchQ  = !q  || [f.brand,f.color,f.material,f.storageLocation,f.notes,f.barcode]
                            .some(v => (v||'').toLowerCase().includes(q));
    const matchFm = !fm || f.material === fm;
    const matchFs = !fs || f.status === fs;
    const matchFb = !fb || f.brand === fb;
    return matchQ && matchFm && matchFs && matchFb;
  });

  // Build spool count map from ALL filaments (not just filtered) for accurate badges
  const spoolCountMap = buildSpoolCountMap(allFilaments);

  const grid  = document.getElementById('filamentsGrid');
  const list  = document.getElementById('filamentsListBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = ''; list.innerHTML = '';
    empty.classList.remove('d-none');
  } else {
    empty.classList.add('d-none');
    grid.innerHTML = filtered.map(f => renderCard(f, spoolCountMap)).join('');
    list.innerHTML = filtered.map(f => renderRow(f, spoolCountMap)).join('');
  }
  updateStats();
}

// ── Stats ──────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('statTotal').textContent  = allFilaments.length;
  document.getElementById('statNew').textContent    = allFilaments.filter(f=>f.status==='new').length;
  document.getElementById('statInUse').textContent  = allFilaments.filter(f=>f.status==='in-use').length;
  document.getElementById('statEmpty').textContent  = allFilaments.filter(f=>f.status==='empty').length;
  document.getElementById('navCountNum').textContent = allFilaments.length;
}

// ── Brand filter ───────────────────────────────────────────────
function populateBrandFilter() {
  const brands = [...new Set(allFilaments.map(f=>f.brand).filter(Boolean))].sort();
  const sel = document.getElementById('filterBrand');
  const current = sel.value;
  sel.innerHTML = '<option value="">Todas las marcas</option>';
  brands.forEach(b => {
    const o = document.createElement('option');
    o.value = b; o.textContent = b;
    if (b === current) o.selected = true;
    sel.appendChild(o);
  });
}

// ── View switch ────────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  document.getElementById('filamentsGrid').classList.toggle('d-none', view !== 'grid');
  document.getElementById('filamentsList').classList.toggle('d-none', view !== 'list');
  document.getElementById('viewGrid').classList.toggle('active', view === 'grid');
  document.getElementById('viewList').classList.toggle('active', view === 'list');
}

// ── UI namespace ───────────────────────────────────────────────
const UI = {

  _afterScanReturnToForm: false,
  _barcodeMatchRef: null,   // filament found when scanning known barcode

  openScanner() {
    document.getElementById('scannerSuccessBanner').classList.add('d-none');
    document.getElementById('scannerError').classList.add('d-none');
    document.getElementById('manualBarcodeInput').value = '';
    bsScannerModal.show();
  },

  openAdd(barcodeValue, prefillData) {
    document.getElementById('filamentModalLabel').innerHTML =
      '<i class="bi bi-layers-half me-2 text-primary"></i>Nuevo Filamento';
    document.getElementById('saveBtnText').textContent = 'Guardar';
    document.getElementById('filamentId').value = '';
    resetForm();
    if (prefillData) {
      // Pre-fill all fields from a template filament but reset per-spool fields
      populateForm({
        ...prefillData,
        weightRemaining: prefillData.weightTotal, // assume full spool
        status: 'new',
        openedDate: '',
        purchaseDate: '',
        notes: ''
      });
    }
    if (barcodeValue) {
      document.getElementById('formBarcode').value = barcodeValue;
      document.getElementById('filamentBarcode').value = barcodeValue;
    }
    bsFilamentModal.show();
  },

  openEdit(id) {
    const f = allFilaments.find(x => x.id === id);
    if (!f) return;
    document.getElementById('filamentModalLabel').innerHTML =
      '<i class="bi bi-pencil me-2 text-primary"></i>Editar Filamento';
    document.getElementById('saveBtnText').textContent = 'Actualizar';
    document.getElementById('filamentId').value = f.id;
    populateForm(f);
    bsFilamentModal.show();
  },

  openDetail(id) {
    const f = allFilaments.find(x => x.id === id);
    if (!f) return;
    document.getElementById('detailModalContent').innerHTML = renderDetail(f);
    bsDetailModal.show();
  },

  openDelete(id) {
    const f = allFilaments.find(x => x.id === id);
    if (!f) return;
    deleteTargetId = id;
    document.getElementById('deletePreview').innerHTML = `
      <div class="fm-color-dot" style="background:${f.colorHex};width:28px;height:28px"></div>
      <div>
        <div class="fw-bold">${escHtml(f.color)}</div>
        <small class="text-muted">${escHtml(f.brand)} · ${escHtml(f.material)}</small>
      </div>`;
    bsDeleteModal.show();
  },

  /**
   * Clone a spool: open the add form pre-filled with same data,
   * reset per-spool fields (weight full, status new, dates empty).
   */
  cloneSpool(id) {
    const f = allFilaments.find(x => x.id === id);
    if (!f) return;
    UI.openAdd(f.barcode || null, f);
    showToast('Datos copiados. Ajusta lo que necesites.', 'success');
  }
};

// ── Barcode match modal ─────────────────────────────────────────
/**
 * When a scanned barcode matches an existing filament,
 * show the match modal instead of opening the form directly.
 */
function showBarcodeMatchModal(code, matches) {
  const primary = matches[0]; // most recently updated
  UI._barcodeMatchRef = primary;

  // Preview card
  const pct = getWeightPct(primary);
  document.getElementById('barcodeMatchPreview').innerHTML = `
    <div class="fm-color-dot" style="background:${primary.colorHex || '#fff'}"></div>
    <div class="flex-grow-1">
      <div class="fw-bold">${escHtml(primary.brand)} ${escHtml(primary.material)}</div>
      <div class="text-muted small">${escHtml(primary.color)} · ${primary.diameter}mm · ${primary.weightTotal}g</div>
      <div class="d-flex gap-2 mt-1 align-items-center flex-wrap">
        ${getStatusBadge(primary.status)}
        <span class="text-muted small">${primary.printTempMin}–${primary.printTempMax}°C extrusor</span>
      </div>
    </div>
    <div class="text-end">
      <div class="fw-bold" style="font-size:1rem">${pct}%</div>
      <div class="text-muted" style="font-size:0.72rem">restante</div>
    </div>`;

  // Siblings list (other spools of the same barcode)
  const siblingsEl = document.getElementById('barcodeMatchSiblings');
  if (matches.length > 1) {
    const rows = matches.map(f => {
      const p = getWeightPct(f);
      return `<div class="fm-match-spool-item" onclick="bsBarcodeMatchModal.hide();setTimeout(()=>UI.openDetail('${f.id}'),350)">
        <span>
          <span class="fm-color-dot me-2" style="background:${f.colorHex};vertical-align:middle;width:12px;height:12px;display:inline-block;border-radius:50%"></span>
          ${escHtml(f.color)} — ${getStatusBadge(f.status)}
        </span>
        <span class="text-muted small">${f.weightRemaining}g (${p}%)</span>
      </div>`;
    }).join('');
    siblingsEl.innerHTML = `
      <div class="fm-match-siblings-title">
        <i class="bi bi-stack me-1"></i>${matches.length} bobinas con este código
      </div>
      ${rows}`;
  } else {
    siblingsEl.innerHTML = '';
  }

  bsBarcodeMatchModal.show();
}

function onBarcodeMatchAddNew() {
  const f = UI._barcodeMatchRef;
  bsBarcodeMatchModal.hide();
  setTimeout(() => UI.openAdd(f.barcode || null, f), 350);
}

function onBarcodeMatchEdit() {
  const f = UI._barcodeMatchRef;
  bsBarcodeMatchModal.hide();
  setTimeout(() => UI.openEdit(f.id), 350);
}

// ── Form helpers ───────────────────────────────────────────────
function resetForm() {
  document.getElementById('filamentForm').reset();
  document.getElementById('formBarcode').value = '';
  document.getElementById('filamentBarcode').value = '';
  document.getElementById('formColorHex').value = '#FFFFFF';
  document.getElementById('formColorHexText').value = '#FFFFFF';
  document.getElementById('colorPreview').style.background = '#FFFFFF';
  document.getElementById('weightPct').textContent = '100%';
  document.getElementById('weightBar').style.width = '100%';
  document.getElementById('weightBar').style.background = 'linear-gradient(90deg,#5b8cff,#a78bfa)';
}

function populateForm(f) {
  document.getElementById('formBarcode').value = f.barcode || '';
  document.getElementById('filamentBarcode').value = f.barcode || '';
  document.getElementById('formBrand').value = f.brand || '';
  document.getElementById('formMaterial').value = f.material || '';
  document.getElementById('formColor').value = f.color || '';
  document.getElementById('formColorHex').value = f.colorHex || '#FFFFFF';
  document.getElementById('formColorHexText').value = f.colorHex || '#FFFFFF';
  document.getElementById('colorPreview').style.background = f.colorHex || '#FFFFFF';
  document.getElementById('formDiameter').value = f.diameter || 1.75;
  document.getElementById('formWeightTotal').value = f.weightTotal || 1000;
  document.getElementById('formWeightRemaining').value = f.weightRemaining || 1000;
  document.getElementById('formPrintTempMin').value = f.printTempMin || 190;
  document.getElementById('formPrintTempMax').value = f.printTempMax || 220;
  document.getElementById('formBedTempMin').value = f.bedTempMin || 50;
  document.getElementById('formBedTempMax').value = f.bedTempMax || 60;
  document.getElementById('formStatus').value = f.status || 'new';
  document.getElementById('formPrice').value = f.price || 0;
  document.getElementById('formPurchaseDate').value = f.purchaseDate || '';
  document.getElementById('formOpenedDate').value = f.openedDate || '';
  document.getElementById('formStorageLocation').value = f.storageLocation || '';
  document.getElementById('formDryingRequired').checked = Boolean(f.dryingRequired);
  document.getElementById('formNotes').value = f.notes || '';
  updateWeightBar();
}

function updateWeightBar() {
  const total = Number(document.getElementById('formWeightTotal').value) || 1;
  const rem   = Number(document.getElementById('formWeightRemaining').value) || 0;
  const pct   = Math.min(100, Math.round((rem/total)*100));
  const color = pct>60 ? 'linear-gradient(90deg,#5b8cff,#a78bfa)'
              : pct>30 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
              : 'linear-gradient(90deg,#f87171,#ef4444)';
  document.getElementById('weightPct').textContent = pct + '%';
  document.getElementById('weightBar').style.width = pct + '%';
  document.getElementById('weightBar').style.background = color;
}

// ── Save ───────────────────────────────────────────────────────
async function saveFilament() {
  const brand    = document.getElementById('formBrand').value.trim();
  const material = document.getElementById('formMaterial').value;
  const color    = document.getElementById('formColor').value.trim();

  if (!brand || !material || !color) {
    if (!brand)    document.getElementById('formBrand').classList.add('is-invalid');
    if (!material) document.getElementById('formMaterial').classList.add('is-invalid');
    if (!color)    document.getElementById('formColor').classList.add('is-invalid');
    showToast('Por favor completa los campos requeridos.', 'error');
    return;
  }
  ['formBrand','formMaterial','formColor'].forEach(id =>
    document.getElementById(id).classList.remove('is-invalid'));

  const id = document.getElementById('filamentId').value;
  const data = {
    barcode:         document.getElementById('formBarcode').value.trim(),
    brand, material, color,
    colorHex:        document.getElementById('formColorHex').value,
    diameter:        document.getElementById('formDiameter').value,
    weightTotal:     document.getElementById('formWeightTotal').value,
    weightRemaining: document.getElementById('formWeightRemaining').value,
    printTempMin:    document.getElementById('formPrintTempMin').value,
    printTempMax:    document.getElementById('formPrintTempMax').value,
    bedTempMin:      document.getElementById('formBedTempMin').value,
    bedTempMax:      document.getElementById('formBedTempMax').value,
    status:          document.getElementById('formStatus').value,
    price:           document.getElementById('formPrice').value,
    purchaseDate:    document.getElementById('formPurchaseDate').value,
    openedDate:      document.getElementById('formOpenedDate').value,
    storageLocation: document.getElementById('formStorageLocation').value.trim(),
    dryingRequired:  document.getElementById('formDryingRequired').checked,
    notes:           document.getElementById('formNotes').value.trim()
  };

  const btn = document.getElementById('saveFilamentBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

  try {
    if (id) {
      const updated = await API.update(id, data);
      const idx = allFilaments.findIndex(f=>f.id===id);
      if (idx !== -1) allFilaments[idx] = updated;
      showToast('Filamento actualizado.', 'success');
    } else {
      const created = await API.create(data);
      allFilaments.unshift(created);
      showToast('Filamento agregado.', 'success');
    }
    populateBrandFilter();
    renderFiltered();
    bsFilamentModal.hide();
  } catch(e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-floppy me-1"></i><span id="saveBtnText">${id ? 'Actualizar' : 'Guardar'}</span>`;
  }
}

// ── Delete ─────────────────────────────────────────────────────
async function confirmDelete() {
  if (!deleteTargetId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  try {
    await API.delete(deleteTargetId);
    allFilaments = allFilaments.filter(f=>f.id!==deleteTargetId);
    renderFiltered();
    populateBrandFilter();
    bsDeleteModal.hide();
    showToast('Filamento eliminado.', 'success');
  } catch(e) {
    showToast('Error al eliminar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    deleteTargetId = null;
  }
}

// ── Scanner ────────────────────────────────────────────────────
function startScanner() {
  if (scannerActive) return;
  const errEl = document.getElementById('scannerError');
  errEl.classList.add('d-none');
  try {
    html5QrScanner = new Html5Qrcode('reader');
    html5QrScanner.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: { width: 280, height: 120 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      (decodedText) => onScanSuccess(decodedText),
      () => {}
    ).then(() => { scannerActive = true; })
     .catch(err => {
       errEl.textContent = 'No se pudo acceder a la cámara: ' + err;
       errEl.classList.remove('d-none');
     });
  } catch(e) {
    errEl.textContent = 'Error iniciando escáner: ' + e.message;
    errEl.classList.remove('d-none');
  }
}

function stopScanner() {
  if (html5QrScanner && scannerActive) {
    html5QrScanner.stop().catch(() => {});
    html5QrScanner = null;
    scannerActive = false;
  }
}

/**
 * Main scan result handler.
 * - If code matches existing filaments → show match modal.
 * - If scan was triggered from form (return-to-form mode) → just fill barcode field.
 * - Otherwise → open add form (blank if no match, prefilled if match).
 */
function onScanSuccess(code) {
  stopScanner();

  // Show the green banner
  document.getElementById('scanResultText').textContent = 'Código: ' + code;
  document.getElementById('scannerSuccessBanner').classList.remove('d-none');

  setTimeout(() => {
    bsScannerModal.hide();

    setTimeout(() => {
      // Return-to-form mode: just set the barcode field and reopen form
      if (UI._afterScanReturnToForm) {
        UI._afterScanReturnToForm = false;
        document.getElementById('formBarcode').value = code;
        document.getElementById('filamentBarcode').value = code;
        bsFilamentModal.show();
        return;
      }

      // Look up the barcode in existing filaments
      const matches = allFilaments
        .filter(f => f.barcode && f.barcode === code)
        .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      if (matches.length > 0) {
        // Known barcode → show match modal
        showBarcodeMatchModal(code, matches);
      } else {
        // Unknown barcode → open empty add form with barcode pre-filled
        UI.openAdd(code);
      }
    }, 350);
  }, 1200);
}

function handleManualBarcode() {
  const v = document.getElementById('manualBarcodeInput').value.trim();
  if (v) onScanSuccess(v);
}

// ── Detail modal helpers (called from inline onclick) ──────────
function closeDetailOpenEdit(id) {
  bsDetailModal.hide();
  setTimeout(() => UI.openEdit(id), 350);
}
function closeDetailOpenDelete(id) {
  bsDetailModal.hide();
  setTimeout(() => UI.openDelete(id), 350);
}

// ── Misc helpers ───────────────────────────────────────────────
function showLoading(v) {
  document.getElementById('loadingOverlay').style.display = v ? 'flex' : 'none';
}
function showToast(msg, type='success') {
  const t = document.getElementById('appToast');
  const b = document.getElementById('toastBody');
  t.className = 'toast align-items-center border-0 fm-toast fm-toast-' + type;
  const icon = type==='success' ? 'bi-check-circle text-success' : 'bi-exclamation-triangle text-danger';
  b.innerHTML = `<i class="bi ${icon} me-2"></i>${escHtml(msg)}`;
  bsToast.show();
}
