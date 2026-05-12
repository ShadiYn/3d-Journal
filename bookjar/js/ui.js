/* ══════════════════════════════════════════════════
   UI.JS — Interfaz: modal, toast, estadísticas,
           paleta de colores y valoración por estrellas
══════════════════════════════════════════════════ */

// ── Swatches de color ──────────────────────────────
document.querySelectorAll('.sw').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('.sw').forEach(x => x.classList.remove('sel'));
    s.classList.add('sel');
    pc = s.dataset.c;
    document.getElementById('cc').value = pc;
  });
});

// ── Estrellas de valoración ────────────────────────
document.querySelectorAll('.str').forEach(s => {
  s.addEventListener('click', () => {
    pr = +s.dataset.v;
    document.querySelectorAll('.str').forEach((x, i) => x.classList.toggle('on', i < pr));
  });
});

/** Color picker personalizado */
function oncc(el) {
  pc = el.value;
  document.querySelectorAll('.sw').forEach(s => s.classList.remove('sel'));
}

// ── Modal ──────────────────────────────────────────

/** Abre el modal y resetea la fecha a hoy */
function omod() {
  sndModalOpen();
  document.getElementById('mo').classList.add('open');
  document.getElementById('md').value = new Date().toISOString().slice(0, 10);
}

/** Cierra el modal */
function cmod() {
  sndModalClose();
  document.getElementById('mo').classList.remove('open');
}

// ── Libro nuevo ────────────────────────────────────

/** Recoge los datos del formulario, crea el libro y lo añade al bote */
/**
 * Convierte número de páginas en multiplicador de grosor (wm).
 * 20p → muy fino (0.48) · 1200p+ → muy grueso (1.60)
 */
function pagesToWm(pages) {
  const p = Math.max(20, Math.min(2000, pages || 0));
  return Math.max(0.48, Math.min(1.60, 0.48 + (p / 1200) * 1.12));
}

/** Actualiza la barra de grosor al escribir */
function onPg(el) {
  const p    = parseInt(el.value, 10);
  const fill = document.getElementById('pgfill');
  const lbl  = document.getElementById('pglbl');
  if (!p || p < 20) { fill.style.width = '0%'; lbl.textContent = '—'; return; }
  fill.style.width = Math.min(100, (p / 1200) * 100) + '%';
  lbl.textContent  = p < 150 ? 'Muy fino'
                   : p < 350 ? 'Fino'
                   : p < 600 ? 'Normal'
                   : p < 900 ? 'Grueso'
                   :           'Muy grueso';
}

function subBook() {
  const title  = document.getElementById('mt').value.trim() || 'Sin título';
  const author = document.getElementById('ma').value.trim() || 'Autor desconocido';
  const date   = document.getElementById('md').value || '';
  const pages  = parseInt(document.getElementById('mpg').value, 10) || 0;

  const book = {
    id:          Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    title, author, color: pc, rating: pr, readingDate: date,
    pages:    pages || null,
    coverUrl: _coverUrl || null,
    location: 'jar', slotId: null,
    wm: pages >= 20 ? pagesToWm(pages) : 0.82 + Math.random() * 0.36,
    hm: 0.88 + Math.random() * 0.28,
  };

  // Si hay portada descargada, adjuntarla al libro (no se serializa, se recarga)
  if (_coverImg) book.coverImg = _coverImg;

  books.push(book);
  persist();
  addToJar(book, true);
  updStats();
  cmod();
  hideCoverPreview && hideCoverPreview();
  _coverUrl = ''; _coverImg = null;
  toast('"' + title + '" añadido al bote 🫙');

  document.getElementById('mt').value  = '';
  document.getElementById('ma').value  = '';
  document.getElementById('mpg').value = '';
  document.getElementById('pgfill').style.width = '0%';
  document.getElementById('pglbl').textContent  = '—';
  var olInp = document.getElementById('ol-inp');
  if (olInp) olInp.value = '';
  hideOlResults && hideOlResults();
  hideCoverPreview && hideCoverPreview();
}

// ── Persistencia ───────────────────────────────────

/** Guarda el estado actual de los libros en localStorage (excluye props de runtime) */
function persist() {
  sbk(CU, books.map(({ mesh, jarPos, jarRot, _bh, ...d }) => d), currentCase);
}

// ── Estadísticas ───────────────────────────────────

/** Actualiza los contadores de estantería y bote */
function updStats() {
  document.getElementById('ss').textContent = books.filter(b => b.location === 'shelf').length;
  document.getElementById('sj').textContent = books.filter(b => b.location === 'jar').length;
}

// ── Toast ──────────────────────────────────────────

/** Muestra una notificación temporal */
function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m;
  el.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 3200);
}