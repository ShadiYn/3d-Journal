'use strict';

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
  document.getElementById('mo').classList.add('open');
  document.getElementById('md').value = new Date().toISOString().slice(0, 10);
}

/** Cierra el modal */
function cmod() {
  document.getElementById('mo').classList.remove('open');
}

// ── Libro nuevo ────────────────────────────────────

/** Recoge los datos del formulario, crea el libro y lo añade al bote */
function subBook() {
  const title  = document.getElementById('mt').value.trim() || 'Sin título';
  const author = document.getElementById('ma').value.trim() || 'Autor desconocido';
  const date   = document.getElementById('md').value || '';

  const book = {
    id:          Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    title,
    author,
    color:       pc,
    rating:      pr,
    readingDate: date,
    location:    'jar',
    slotId:      null,
    wm: 0.82 + Math.random() * 0.36,
    hm: 0.88 + Math.random() * 0.28,
  };

  books.push(book);
  persist();
  addToJar(book, true);
  updStats();
  cmod();
  toast('"' + title + '" añadido al bote 🫙');

  // Limpiar campos del formulario
  document.getElementById('mt').value = '';
  document.getElementById('ma').value = '';
}

// ── Persistencia ───────────────────────────────────

/** Guarda el estado actual de los libros en localStorage (excluye props de runtime) */
function persist() {
  sbk(CU, books.map(({ mesh, jarPos, jarRot, _bh, ...d }) => d));
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
