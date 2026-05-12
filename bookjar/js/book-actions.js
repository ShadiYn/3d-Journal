/* ══════════════════════════════════════════════════
   BOOK-ACTIONS.JS — Editar, eliminar libros
   y gestión de estados (pendiente/leyendo/leído)
══════════════════════════════════════════════════ */

// ── Modal de edición ───────────────────────────────

let editingBookId = null;

function openEditModal(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  editingBookId = bookId;

  // Rellenar campos con datos actuales
  document.getElementById('et').value  = book.title;
  document.getElementById('ea').value  = book.author;
  document.getElementById('ed').value  = book.readingDate || '';
  document.getElementById('epg').value = book.pages || '';

  // Color
  document.querySelectorAll('.sw-edit').forEach(s =>
    s.classList.toggle('sel', s.dataset.c === book.color)
  );
  document.getElementById('ecc').value = book.color;

  // Rating
  document.querySelectorAll('.str-edit').forEach(s =>
    s.classList.toggle('on', +s.dataset.v <= book.rating)
  );

  // Estado
  document.querySelectorAll('.status-btn').forEach(s =>
    s.classList.toggle('sel', s.dataset.s === (book.status || 'pendiente'))
  );

  document.getElementById('edit-mo').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-mo').classList.remove('open');
  editingBookId = null;
}

function saveEdit() {
  const book = books.find(b => b.id === editingBookId);
  if (!book) return;

  const newTitle  = document.getElementById('et').value.trim()  || book.title;
  const newAuthor = document.getElementById('ea').value.trim()  || book.author;
  const newDate   = document.getElementById('ed').value;
  const newPages  = parseInt(document.getElementById('epg').value, 10) || null;
  const newColor  = document.getElementById('ecc').value;
  const newRating = +([...document.querySelectorAll('.str-edit.on')].pop()?.dataset.v || book.rating);
  const newStatus = document.querySelector('.status-btn.sel')?.dataset.s || 'pendiente';

  // Actualizar datos
  book.title       = newTitle;
  book.author      = newAuthor;
  book.readingDate = newDate;
  book.pages       = newPages;
  book.color       = newColor;
  book.rating      = newRating;
  book.status      = newStatus;
  if (newPages >= 20) book.wm = pagesToWm(newPages);

  // Reconstruir mesh con nuevos datos
  if (book.mesh) {
    sc.remove(book.mesh);
    const wasOnShelf = book.location === 'shelf';
    const oldPos     = book.mesh.position.clone();
    const oldRot     = book.mesh.rotation.clone();
    const oldShadow  = book.mesh.castShadow;

    buildMesh(book);
    book.mesh.position.copy(oldPos);
    book.mesh.rotation.copy(oldRot);
    book.mesh.castShadow = oldShadow;
    sc.add(book.mesh);
    markShadowDirty();
  }

  persist();
  closeEditModal();
  toast('✏️ "' + newTitle + '" actualizado');
}

function deleteBook(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  // Liberar slot si está en estantería
  if (book.slotId) {
    const sl = slots.find(s => s.id === book.slotId);
    if (sl) { sl.occupied = false; sl.bookId = null; }
  }

  // Animar salida y eliminar
  if (book.mesh) {
    gsap.to(book.mesh.scale, {
      x: 0.01, y: 0.01, z: 0.01, duration: .3, ease: 'back.in(2)',
      onComplete: () => { sc.remove(book.mesh); markShadowDirty(); }
    });
  }

  books = books.filter(b => b.id !== bookId);
  persist();
  updStats();
  closeEditModal();
  toast('🗑️ Libro eliminado');
}

// ── Listeners del modal de edición ────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Swatches de color en edición
  document.querySelectorAll('.sw-edit').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.sw-edit').forEach(x => x.classList.remove('sel'));
      s.classList.add('sel');
      document.getElementById('ecc').value = s.dataset.c;
    });
  });

  // Estrellas en edición
  document.querySelectorAll('.str-edit').forEach(s => {
    s.addEventListener('click', () => {
      const v = +s.dataset.v;
      document.querySelectorAll('.str-edit').forEach((x, i) =>
        x.classList.toggle('on', i < v)
      );
    });
  });

  // Botones de estado
  document.querySelectorAll('.status-btn').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.status-btn').forEach(x => x.classList.remove('sel'));
      s.classList.add('sel');
    });
  });
});

// ── Abrir edición desde tooltip ───────────────────

/** Inyecta un botón de editar en el tooltip cuando se muestra */
function injectTooltipEdit(book) {
  const existing = document.getElementById('tt-edit');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.id = 'tt-edit';
  btn.textContent = '✏️ Editar';
  btn.onclick = (e) => {
    e.stopPropagation();
    document.getElementById('tt').classList.remove('show');
    openEditModal(book.id);
  };
  document.getElementById('tt').appendChild(btn);
}
