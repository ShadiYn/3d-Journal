'use strict';

/* ══════════════════════════════════════════════════
   APP.JS — Inicialización, carga de libros y loop
══════════════════════════════════════════════════ */

const TARGET_FPS   = 60;
const FRAME_BUDGET = 1000 / TARGET_FPS;
let   lastFrame    = 0;

// Flag de sombras: solo se recalculan cuando algo se mueve
let shadowsDirty = true;

/** Marca que las sombras necesitan actualizarse este frame */
function markShadowDirty() { shadowsDirty = true; }

// ── initScene ──────────────────────────────────────

function initScene() {
  document.getElementById('cv').innerHTML = '';

  sc = new THREE.Scene();
  sc.background = new THREE.Color(0x090810);
  sc.fog        = new THREE.FogExp2(0x090810, 0.028);

  cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80);
  cam.position.set(0.4, 3.8, 11.8);
  cam.lookAt(0.4, 1.5, 0);

  ren = new THREE.WebGLRenderer({ antialias: true });
  ren.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  ren.setSize(innerWidth, innerHeight);
  ren.shadowMap.enabled    = true;
  ren.shadowMap.type       = THREE.PCFShadowMap;
  ren.shadowMap.autoUpdate = false;   // solo actualizamos cuando cambia algo

  document.getElementById('cv').appendChild(ren.domElement);

  rc = new THREE.Raycaster();
  DPLANE.set(new THREE.Vector3(0,0,1), -DRAG_Z);
  clk = new THREE.Clock();

  mkLights(); mkFloor(); mkShelf(); mkJar(); mkSlots();

  ren.domElement.addEventListener('mousedown', onDn);
  ren.domElement.addEventListener('mousemove', onMv);
  ren.domElement.addEventListener('mouseup',   onUp);
  window.addEventListener('resize', onRz);

  loadBooks();
  tick(0);
}

// ── loadBooks ──────────────────────────────────────

function loadBooks() {
  books = [];
  const saved = gbk(CU);
  if (!saved.length) return;

  saved.forEach(d => books.push({ ...d, mesh: null, jarPos: null, jarRot: null }));

  books.forEach(book => {
    if (book.location === 'jar') {
      addToJar(book, false);
    } else if (book.location === 'shelf' && book.slotId) {
      const slot = slots.find(s => s.id === book.slotId);
      if (!slot) { book.location = 'jar'; addToJar(book, false); return; }
      buildMesh(book);
      book.mesh.castShadow = true;
      const bh = book._bh || 1.16;
      book.mesh.position.set(slot.x, slot.y + bh / 2, slot.z);
      book.mesh.rotation.set(0, 0, 0);
      sc.add(book.mesh);
      slot.occupied = true; slot.bookId = book.id;
    }
  });

  updStats();
  markShadowDirty();
}

// ── tick ──────────────────────────────────────────

function tick(now) {
  raf = requestAnimationFrame(tick);
  if (now - lastFrame < FRAME_BUDGET) return;
  lastFrame = now;

  const t = clk.getElapsedTime();

  // Flotación solo de libros en el bote
  const jarBooks = books.filter(b => b.location === 'jar' && b.mesh && b !== dragB && b.jarPos);
  jarBooks.forEach(b => {
    b.mesh.position.y = b.jarPos.y + Math.sin(t * .6 + b.id.charCodeAt(0) * .4) * .012;
  });

  // Sombras bajo demanda: solo cuando algo cambió
  if (shadowsDirty) {
    ren.shadowMap.needsUpdate = true;
    shadowsDirty = false;
  }
  // Mientras se arrastra un libro, forzar sombras cada frame
  if (isDrag) ren.shadowMap.needsUpdate = true;

  ren.render(sc, cam);
}

// ── onRz ──────────────────────────────────────────

function onRz() {
  if (!cam || !ren) return;
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  ren.setSize(innerWidth, innerHeight);
}