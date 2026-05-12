/* ══════════════════════════════════════════════════
   AUTH.JS — Autenticación: login, registro y logout
══════════════════════════════════════════════════ */

/** Alterna entre los paneles de login y registro */
function stab(t) {
  document.querySelectorAll('.atab').forEach((el, i) =>
    el.classList.toggle('on', (i === 0) === (t === 'l'))
  );
  document.getElementById('pl').style.display = t === 'l' ? '' : 'none';
  document.getElementById('pr').style.display = t === 'r' ? '' : 'none';
}

/** Login */
var _lastPassword = null;
function dol() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lp').value;
  _lastPassword = p;
  const e = document.getElementById('le');
  if (!u || !p) { e.textContent = 'Rellena todos los campos.'; return; }
  const us = gu();
  if (!us[u] || us[u] !== p) { e.textContent = 'Usuario o contraseña incorrectos.'; return; }
  loginOk(u, p);
}

/** Registro */
function dor() {
  const u = document.getElementById('ru').value.trim();
  const p = document.getElementById('rp').value;
  _lastPassword = p;
  const e = document.getElementById('re');
  if (!u || !p) { e.textContent = 'Rellena todos los campos.'; return; }
  if (p.length < 4) { e.textContent = 'Mínimo 4 caracteres.'; return; }
  const us = gu();
  if (us[u]) { e.textContent = 'Ese nombre ya existe.'; return; }
  us[u] = p; su(us); loginOk(u, p);
}

/** Entrada al app tras autenticación correcta */
function loginOk(u, p) {
  CU = u;

  // Migrar datos del formato antiguo (bj_b_u) al nuevo (bj_b_u_c0) si es necesario
  const oldKey = 'bj_b_' + u, newKey = 'bj_b_' + u + '_c0';
  const oldData = localStorage.getItem(oldKey);
  if (oldData && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, oldData);
  }

  // Cargar case activo y preferencia de bote
  currentCase = parseInt(localStorage.getItem('bj_case_' + u) || '0', 10);
  jarType     = localStorage.getItem('bj_jar_' + u) || 'cristal';
  document.getElementById('auth').style.display = 'none';
  document.getElementById('app').style.display  = 'block';
  document.getElementById('un').textContent = '👤 ' + u;
  initScene();
  loadDecors();
  // Iniciar sync con backend (password viene del formulario)
  if (typeof cloudLogin === 'function') cloudLogin(u, p || '');
}

/** Cierre de sesión con limpieza completa de estado y recursos */
function dout() {
  CU = null;
  books = [];

  cmod();                          // cerrar modal si estaba abierto
  isDrag = false; dragB = null;    // resetear drag
  clearHL();                       // quitar highlights

  document.getElementById('app').style.display  = 'none';
  document.getElementById('auth').style.display = 'flex';

  if (ren) {
    // Eliminar todos los event listeners antes de destruir el renderer
    window.removeEventListener('resize', onRz);
    ren.domElement.removeEventListener('mousedown', onDn);
    ren.domElement.removeEventListener('mousemove', onMv);
    ren.domElement.removeEventListener('mouseup',   onUp);
    unregisterTouchListeners();
    cancelAnimationFrame(raf);
    ren.dispose();
    ren = null;
  }

  document.getElementById('cv').innerHTML = '';  // limpiar canvas del DOM
  currentCase = 0;
  decorations = []; placingDecor = null;
  if (typeof cloudLogout === 'function') cloudLogout();
  candleFlames = [];
  if (dustParticles) { sc?.remove(dustParticles); dustParticles = null; }
  _scLights = [];
  ptex  = null;   // invalidar caché de textura (contexto WebGL destruido)
  slots = [];
}