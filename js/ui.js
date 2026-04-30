/**
 * FilaManager — UI Helpers & Render Functions
 */

/* ── Status helpers ── */
const STATUS_MAP = {
  'new':    { label: 'Nuevo',      icon: 'bi-circle-fill',       cls: 'fm-badge-new' },
  'in-use': { label: 'En uso',     icon: 'bi-printer-fill',      cls: 'fm-badge-in-use' },
  'stored': { label: 'Almacenado', icon: 'bi-archive-fill',      cls: 'fm-badge-stored' },
  'empty':  { label: 'Vacío',      icon: 'bi-slash-circle-fill', cls: 'fm-badge-empty' }
};

function getStatusBadge(status) {
  const s = STATUS_MAP[status] || STATUS_MAP['new'];
  return `<span class="fm-badge ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span>`;
}

function getWeightPct(f) {
  if (!f.weightTotal || f.weightTotal === 0) return 0;
  return Math.round((f.weightRemaining / f.weightTotal) * 100);
}

function getProgressColor(pct) {
  if (pct > 60) return 'linear-gradient(90deg,#5b8cff,#a78bfa)';
  if (pct > 30) return 'linear-gradient(90deg,#fbbf24,#f59e0b)';
  return 'linear-gradient(90deg,#f87171,#ef4444)';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' });
}

/**
 * Builds a map: groupKey → count of spools with same barcode (or brand+material+color).
 * Used to render the "×N bobinas" badge.
 */
function buildSpoolCountMap(filaments) {
  const map = {};
  filaments.forEach(f => {
    // Group by barcode if present, otherwise by brand+material+color
    const key = f.barcode
      ? `bc:${f.barcode}`
      : `bmc:${f.brand}|${f.material}|${f.color}`;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function getSpoolKey(f) {
  return f.barcode
    ? `bc:${f.barcode}`
    : `bmc:${f.brand}|${f.material}|${f.color}`;
}

/* ── Render GRID card ── */
function renderCard(f, spoolCountMap) {
  const pct = getWeightPct(f);
  const gradColor = getProgressColor(pct);
  const hasDrying = f.dryingRequired
    ? `<span class="fm-badge" style="background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);"><i class="bi bi-droplet"></i>Secar</span>`
    : '';

  // Spool count badge
  const count = spoolCountMap ? (spoolCountMap[getSpoolKey(f)] || 1) : 1;
  const spoolBadge = count > 1
    ? `<span class="fm-spool-count"><i class="bi bi-stack me-1"></i>×${count} bobinas</span>`
    : '';

  return `
  <div class="col-sm-6 col-lg-4 col-xl-3">
    <div class="fm-card" onclick="UI.openDetail('${f.id}')" id="card-${f.id}">
      <div class="fm-card-color-band" style="background:${f.colorHex || '#FFFFFF'}"></div>
      ${spoolBadge}
      <div class="fm-card-body">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <span class="fm-card-brand">${escHtml(f.brand)}</span>
          <span class="fm-card-material">${escHtml(f.material)}</span>
        </div>
        <div class="fm-card-name">
          <span class="fm-color-dot me-1" style="background:${f.colorHex || '#fff'};vertical-align:middle"></span>
          ${escHtml(f.color)}
        </div>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          ${getStatusBadge(f.status)}
          ${hasDrying}
        </div>
        <div class="fm-weight-bar-wrap">
          <div class="fm-weight-label">
            <span><i class="bi bi-speedometer2 me-1"></i>${f.weightRemaining}g restantes</span>
            <span>${pct}%</span>
          </div>
          <div class="progress fm-progress">
            <div class="progress-bar fm-progress-bar" style="width:${pct}%;background:${gradColor}"></div>
          </div>
        </div>
        <div class="d-flex gap-1 text-muted" style="font-size:0.72rem">
          <i class="bi bi-rulers"></i>${f.diameter}mm
          <span class="mx-1">·</span>
          <i class="bi bi-thermometer-half"></i>${f.printTempMin}–${f.printTempMax}°C
          ${f.storageLocation ? `<span class="mx-1">·</span><i class="bi bi-geo-alt"></i>${escHtml(f.storageLocation)}` : ''}
        </div>
      </div>
      <div class="fm-card-footer">
        <span class="text-muted" style="font-size:0.72rem">${f.price > 0 ? '$'+f.price.toFixed(2) : ''}</span>
        <div class="fm-card-actions d-flex gap-1" onclick="event.stopPropagation()">
          <button class="btn btn-sm" onclick="UI.cloneSpool('${f.id}')" title="Clonar bobina">
            <i class="bi bi-copy"></i>
          </button>
          <button class="btn btn-sm" onclick="UI.openEdit('${f.id}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger-soft" onclick="UI.openDelete('${f.id}')" title="Eliminar">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ── Render LIST row ── */
function renderRow(f, spoolCountMap) {
  const pct = getWeightPct(f);
  const gradColor = getProgressColor(pct);
  const count = spoolCountMap ? (spoolCountMap[getSpoolKey(f)] || 1) : 1;
  const countBadge = count > 1
    ? ` <span class="fm-spool-count" style="position:static;display:inline-flex;vertical-align:middle">×${count}</span>`
    : '';
  return `
  <tr id="row-${f.id}" style="cursor:pointer" onclick="UI.openDetail('${f.id}')">
    <td>
      <div class="d-flex align-items-center gap-2">
        <div class="fm-color-dot" style="background:${f.colorHex || '#fff'}"></div>
        <span>${escHtml(f.color)}${countBadge}</span>
      </div>
    </td>
    <td>
      <div class="fw-semibold">${escHtml(f.brand)}</div>
      <small class="text-muted">${escHtml(f.material)} · ${f.diameter}mm</small>
    </td>
    <td>${f.diameter} mm</td>
    <td>
      <div style="min-width:100px">
        <div class="d-flex justify-content-between mb-1" style="font-size:0.72rem">
          <span>${f.weightRemaining}g</span><span>${pct}%</span>
        </div>
        <div class="progress fm-progress">
          <div class="progress-bar" style="width:${pct}%;background:${gradColor}"></div>
        </div>
      </div>
    </td>
    <td>${getStatusBadge(f.status)}</td>
    <td>${f.storageLocation ? escHtml(f.storageLocation) : '<span class="text-muted">—</span>'}</td>
    <td class="text-center" onclick="event.stopPropagation()">
      <button class="btn btn-sm me-1" style="background:var(--fm-surface-3);border:1px solid var(--fm-border);color:var(--fm-text-muted)" onclick="UI.cloneSpool('${f.id}')" title="Clonar"><i class="bi bi-copy"></i></button>
      <button class="btn btn-sm me-1" style="background:var(--fm-surface-3);border:1px solid var(--fm-border);color:var(--fm-text-muted)" onclick="UI.openEdit('${f.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm" style="background:var(--fm-surface-3);border:1px solid var(--fm-border);color:var(--fm-text-muted)" onclick="UI.openDelete('${f.id}')" title="Eliminar"><i class="bi bi-trash3"></i></button>
    </td>
  </tr>`;
}

/* ── Render Detail Modal ── */
function renderDetail(f) {
  const pct = getWeightPct(f);
  const gradColor = getProgressColor(pct);
  return `
  <div class="fm-detail-header" style="background:${f.colorHex || '#5b8cff'}"></div>
  <div class="fm-detail-body">
    <div class="d-flex align-items-start justify-content-between mb-3">
      <div>
        <div class="text-muted small text-uppercase fw-bold" style="letter-spacing:1px">${escHtml(f.brand)}</div>
        <h5 class="fw-bold mb-1" style="font-family:var(--fm-font-display)">
          <span class="fm-color-dot me-2" style="background:${f.colorHex};vertical-align:middle"></span>
          ${escHtml(f.color)}
        </h5>
        <div class="d-flex gap-2 flex-wrap">
          <span class="fm-card-material">${escHtml(f.material)}</span>
          ${getStatusBadge(f.status)}
          ${f.dryingRequired ? '<span class="fm-badge" style="background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);"><i class="bi bi-droplet me-1"></i>Requiere secado</span>' : ''}
        </div>
      </div>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
    </div>

    <div class="mb-3">
      <div class="d-flex justify-content-between mb-1" style="font-size:0.8rem">
        <span class="text-muted">Peso restante</span>
        <span class="fw-bold">${f.weightRemaining}g / ${f.weightTotal}g (${pct}%)</span>
      </div>
      <div class="progress fm-progress" style="height:10px">
        <div class="progress-bar" style="width:${pct}%;background:${gradColor};border-radius:10px"></div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3">
        <div class="fm-detail-prop">
          <span class="fm-detail-prop-label">Diámetro</span>
          <span class="fm-detail-prop-value">${f.diameter} mm</span>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="fm-detail-prop">
          <span class="fm-detail-prop-label">Precio</span>
          <span class="fm-detail-prop-value">${f.price > 0 ? '$'+f.price.toFixed(2) : '—'}</span>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="fm-detail-prop">
          <span class="fm-detail-prop-label">Comprado</span>
          <span class="fm-detail-prop-value">${fmtDate(f.purchaseDate)}</span>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="fm-detail-prop">
          <span class="fm-detail-prop-label">Abierto</span>
          <span class="fm-detail-prop-value">${fmtDate(f.openedDate)}</span>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <div class="fm-detail-prop-label mb-2">Temperaturas</div>
      <div class="d-flex flex-wrap gap-2">
        <span class="fm-temp-chip"><i class="bi bi-thermometer-high text-danger me-1"></i>Extrusor: ${f.printTempMin}–${f.printTempMax}°C</span>
        <span class="fm-temp-chip"><i class="bi bi-thermometer text-warning me-1"></i>Cama: ${f.bedTempMin}–${f.bedTempMax}°C</span>
      </div>
    </div>

    ${f.storageLocation ? `<div class="fm-detail-prop mb-3"><span class="fm-detail-prop-label">Ubicación</span><span class="fm-detail-prop-value"><i class="bi bi-geo-alt me-1"></i>${escHtml(f.storageLocation)}</span></div>` : ''}
    ${f.barcode ? `<div class="fm-detail-prop mb-3"><span class="fm-detail-prop-label">Código de barras</span><span class="fm-detail-prop-value" style="font-family:monospace">${escHtml(f.barcode)}</span></div>` : ''}
    ${f.notes ? `<div class="fm-detail-prop mb-3"><span class="fm-detail-prop-label">Notas</span><span class="fm-detail-prop-value">${escHtml(f.notes)}</span></div>` : ''}

    <div class="d-flex gap-2 mt-3 pt-2" style="border-top:1px solid var(--fm-border)">
      <button class="btn fm-btn-add flex-grow-1" onclick="closeDetailOpenEdit('${f.id}')">
        <i class="bi bi-pencil me-1"></i>Editar
      </button>
      <button class="btn" title="Clonar bobina"
        style="background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);color:#a78bfa"
        onclick="bsDetailModal.hide();setTimeout(()=>UI.cloneSpool('${f.id}'),350)">
        <i class="bi bi-copy"></i>
      </button>
      <button class="btn" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);color:var(--fm-danger)"
        onclick="closeDetailOpenDelete('${f.id}')">
        <i class="bi bi-trash3"></i>
      </button>
    </div>
  </div>`;
}

function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.renderCard = renderCard;
window.renderRow  = renderRow;
window.renderDetail = renderDetail;
window.getStatusBadge = getStatusBadge;
window.getWeightPct = getWeightPct;
window.buildSpoolCountMap = buildSpoolCountMap;
window.getSpoolKey = getSpoolKey;
window.escHtml = escHtml;
