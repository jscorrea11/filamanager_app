/**
 * FilaManager — Main Application Controller
 */

// ── State ──────────────────────────────────────────────────────
let allFilaments = [];
let currentView  = 'grid';   // 'grid' | 'list'
let deleteTargetId = null;
let html5QrScanner = null;
let scannerActive  = false;

// ── Bootstrap modal instances ───────────────────────────────────
let bsScannerModal, bsFilamentModal, bsDetailModal, bsDeleteModal, bsToast;

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bsScannerModal  = new bootstrap.Modal(document.getElementById('scannerModal'));
  bsFilamentModal = new bootstrap.Modal(document.getElementById('filamentModal'));
  bsDetailModal   = new bootstrap.Modal(document.getElementById('detailModal'));
  bsDeleteModal   = new bootstrap.Modal(document.getElementById('deleteModal'));
  bsToast         = new bootstrap.Toast(document.getElementById('appToast'), { delay: 3000 });

  bindEvents();
  loadFilaments();
});

// ── Bind Events ────────────────────────────────────────────────
function bindEvents() {
  // Navbar buttons
  document.getElementById('openScannerBtn').addEventListener('click', UI.openScanner);
  document.getElementById('openAddBtn').addEventListener('click', () => UI.openAdd());

  // Filters & search
  document.getElementById('searchInput').addEventListener('input', renderFiltered);
  document.getElementById('filterMaterial').addEventListener('change', renderFiltered);
  document.getElementById('filterStatus').addEventListener('change', renderFiltered);
  document.getElementById('filterBrand').addEventListener('change', renderFiltered);

  // View toggles
  document.getElementById('viewGrid').addEventListener('click', () => switchView('grid'));
  document.getElementById('viewList').addEventListener('click', () => switchView('list'));

  // Scanner modal events
  document.getElementById('scannerModal').addEventListener('hidden.bs.modal', stopScanner);
  document.getElementById('scannerModal').addEventListener('shown.bs.modal', startScanner);
  document.getElementById('manualBarcodeBtn').addEventListener('click', handleManualBarcode);
  document.getElementById('manualBarcodeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleManualBarcode();
  });
  document.getElementById('formScanBtn').addEventListener('click', () => {
    bsFilamentModal.hide();
    setTimeout(() => { UI.openScanner(true); }, 400);
  });

  // Save button
  document.getElementById('saveFilamentBtn').addEventListener('click', saveFilament);

  // Confirm delete
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

  // Weight progress in form
  ['formWeightTotal','formWeightRemaining'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateWeightBar);
  });
}

// ── Load filaments ─────────────────────────────────────────────
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

// ── Render filtered list ───────────────────────────────────────
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

  const grid = document.getElementById('filamentsGrid');
  const list = document.getElementById('filamentsListBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    list.innerHTML = '';
    empty.classList.remove('d-none');
  } else {
    empty.classList.add('d-none');
    grid.innerHTML = filtered.map(renderCard).join('');
    list.innerHTML = filtered.map(renderRow).join('');
  }

  updateStats();
}

// ── Stats ──────────────────────────────────────────────────────
function updateStats() {
  const total  = allFilaments.length;
  const newC   = allFilaments.filter(f=>f.status==='new').length;
  const inUse  = allFilaments.filter(f=>f.status==='in-use').length;
  const empty  = allFilaments.filter(f=>f.status==='empty').length;
  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statNew').textContent    = newC;
  document.getElementById('statInUse').textContent  = inUse;
  document.getElementById('statEmpty').textContent  = empty;
  document.getElementById('navCountNum').textContent = total;
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

  openScanner(fromForm) {
    document.getElementById('scannerSuccessBanner').classList.add('d-none');
    document.getElementById('scannerError').classList.add('d-none');
    document.getElementById('manualBarcodeInput').value = '';
    bsScannerModal.show();
    if (fromForm) UI._afterScanReturnToForm = true;
  },

  _afterScanReturnToForm: false,

  openAdd(barcodeValue) {
    document.getElementById('filamentModalLabel').innerHTML =
      '<i class="bi bi-layers-half me-2 text-primary"></i>Nuevo Filamento';
    document.getElementById('saveBtnText').textContent = 'Guardar';
    document.getElementById('filamentId').value = '';
    resetForm();
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
  }
};

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

// ── Save (create or update) ────────────────────────────────────
async function saveFilament() {
  const form = document.getElementById('filamentForm');
  const brand = document.getElementById('formBrand').value.trim();
  const material = document.getElementById('formMaterial').value;
  const color = document.getElementById('formColor').value.trim();

  if (!brand || !material || !color) {
    if (!brand) document.getElementById('formBrand').classList.add('is-invalid');
    if (!material) document.getElementById('formMaterial').classList.add('is-invalid');
    if (!color) document.getElementById('formColor').classList.add('is-invalid');
    showToast('Por favor completa los campos requeridos.', 'error');
    return;
  }

  ['formBrand','formMaterial','formColor'].forEach(id =>
    document.getElementById(id).classList.remove('is-invalid'));

  const id = document.getElementById('filamentId').value;
  const data = {
    barcode:         document.getElementById('formBarcode').value.trim(),
    brand,
    material,
    color,
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
      showToast('Filamento actualizado correctamente.', 'success');
    } else {
      const created = await API.create(data);
      allFilaments.unshift(created);
      showToast('Filamento agregado correctamente.', 'success');
    }
    populateBrandFilter();
    renderFiltered();
    bsFilamentModal.hide();
  } catch(e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-floppy me-1"></i><span id="saveBtnText">' + (id ? 'Actualizar' : 'Guardar') + '</span>';
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
      { fps: 15, qrbox: { width: 280, height: 120 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
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

function onScanSuccess(code) {
  stopScanner();
  document.getElementById('scanResultText').textContent = 'Código detectado: ' + code;
  document.getElementById('scannerSuccessBanner').classList.remove('d-none');

  setTimeout(() => {
    bsScannerModal.hide();
    setTimeout(() => {
      if (UI._afterScanReturnToForm) {
        UI._afterScanReturnToForm = false;
        document.getElementById('formBarcode').value = code;
        document.getElementById('filamentBarcode').value = code;
        bsFilamentModal.show();
      } else {
        UI.openAdd(code);
      }
    }, 350);
  }, 1200);
}

function handleManualBarcode() {
  const v = document.getElementById('manualBarcodeInput').value.trim();
  if (v) onScanSuccess(v);
}

// ── Helpers from detail modal ──────────────────────────────────
function closeDetailOpenEdit(id) {
  bsDetailModal.hide();
  setTimeout(() => UI.openEdit(id), 350);
}
function closeDetailOpenDelete(id) {
  bsDetailModal.hide();
  setTimeout(() => UI.openDelete(id), 350);
}

// ── UI utils ───────────────────────────────────────────────────
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
