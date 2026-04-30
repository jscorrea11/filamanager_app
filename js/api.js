/**
 * FilaManager API Layer
 * Calls Netlify Functions when deployed, falls back to localStorage for local dev.
 */

const IS_NETLIFY = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

/* ── localStorage helpers (dev fallback) ── */
const LS_KEY = 'filamanager_db';
function lsGetAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSave(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function lsFind(id)  { return lsGetAll().find(f => f.id === id); }
function lsGenId()   { return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

/* ── API object ── */
const API = {

  async getAll() {
    if (IS_NETLIFY) {
      const r = await fetch('/api/filaments-get');
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    }
    return lsGetAll().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  },

  async create(data) {
    if (IS_NETLIFY) {
      const r = await fetch('/api/filaments-create', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    }
    const now = new Date().toISOString();
    const filament = {
      id: lsGenId(),
      barcode: data.barcode || '',
      brand: data.brand || 'Desconocido',
      material: data.material || 'PLA',
      color: data.color || 'Natural',
      colorHex: data.colorHex || '#FFFFFF',
      weightTotal: Number(data.weightTotal) || 1000,
      weightRemaining: Number(data.weightRemaining) || 1000,
      diameter: Number(data.diameter) || 1.75,
      printTempMin: Number(data.printTempMin) || 190,
      printTempMax: Number(data.printTempMax) || 220,
      bedTempMin: Number(data.bedTempMin) || 50,
      bedTempMax: Number(data.bedTempMax) || 60,
      purchaseDate: data.purchaseDate || '',
      openedDate: data.openedDate || '',
      storageLocation: data.storageLocation || '',
      dryingRequired: Boolean(data.dryingRequired),
      price: Number(data.price) || 0,
      notes: data.notes || '',
      status: data.status || 'new',
      createdAt: now,
      updatedAt: now
    };
    const all = lsGetAll();
    all.push(filament);
    lsSave(all);
    return filament;
  },

  async update(id, data) {
    if (IS_NETLIFY) {
      const r = await fetch(`/api/filaments-update?id=${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return j.data;
    }
    const all = lsGetAll();
    const idx = all.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Filamento no encontrado');
    const updated = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    lsSave(all);
    return updated;
  },

  async delete(id) {
    if (IS_NETLIFY) {
      const r = await fetch(`/api/filaments-delete?id=${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      return true;
    }
    const all = lsGetAll().filter(f => f.id !== id);
    lsSave(all);
    return true;
  }
};

window.API = API;
