'use strict';

/* ══════════════════════════════════════════════════
   JAR-PICKER.JS — Selector de tipo de bote
══════════════════════════════════════════════════ */

function oJarPicker() {
  document.querySelectorAll('.jp-card').forEach(c =>
    c.classList.toggle('sel', c.dataset.jar === jarType)
  );
  document.getElementById('jp-ov').classList.add('open');
}

function cJarPicker() {
  document.getElementById('jp-ov').classList.remove('open');
}

function selectJar(type) {
  if (type === jarType) { cJarPicker(); return; }
  jarType = type;
  localStorage.setItem('bj_jar_' + CU, type);

  document.querySelectorAll('.jp-card').forEach(c =>
    c.classList.toggle('sel', c.dataset.jar === type)
  );

  // Reconstruir geometría del bote
  mkJar();

  // Reposicionar los libros que están dentro según el nuevo contenedor
  repositionJarBooks();

  cJarPicker();
  toast('Bote cambiado ✨');
}