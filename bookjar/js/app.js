/* ══════════════════════════════════════════════════
   APP.JS — Inicialización, carga de libros y loop
══════════════════════════════════════════════════ */

var TARGET_FPS   = 60;
var FRAME_BUDGET = 1000 / TARGET_FPS;
var lastFrame       = 0;
var _jarBooksCache  = [];
var _jarCacheDirty  = true;

// Flag de sombras: solo se recalculan cuando algo se mueve
var shadowsDirty = true;

/** Marca que las sombras necesitan actualizarse este frame */
function markShadowDirty() { shadowsDirty = true; }

// ── initScene ──────────────────────────────────────

function initScene() {
  document.getElementById('cv').innerHTML = '';

  // Inicializar objetos Three.js que dependen de que la librería esté cargada
  MV     = new THREE.Vector2();
  DPLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DRAG_Z);
  JP     = new THREE.Vector3(5.5, 0.55, 0.1);

  sc = new THREE.Scene();
  const _st = CASE_STYLES[currentCase];
  sc.background = new THREE.Color(_st.bg);
  sc.fog        = new THREE.FogExp2(_st.fog, 0.028);

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
  clk = new THREE.Clock();

  mkLights(); mkFloor(); mkShelf(); mkJar(); mkSlots();
  initAtmosphere();
  mkLamp();

  ren.domElement.addEventListener('mousedown', onDn);
  ren.domElement.addEventListener('mousemove', onMv);
  ren.domElement.addEventListener('mouseup',   onUp);
  window.addEventListener('resize', onRz);
  registerTouchListeners();

  loadBooks();
  loadDecors();
  // Intro cinematográfica (sin animación de caída de libros)
  playIntro(null);
  tick(0);
}

// ── loadBooks ──────────────────────────────────────

function loadBooks() {
  books = [];
  const saved = gbk(CU, currentCase);
  if (!saved.length) return;

  saved.forEach(d => {
    var book = Object.assign({}, d, { mesh: null, jarPos: null, jarRot: null });
    books.push(book);
    // Recargar portada en background si existe
    if (book.coverUrl) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        book.coverImg = img;
        // Reconstruir mesh con la portada real si ya está en escena
        if (book.mesh) {
          var pos = book.mesh.position.clone();
          var rot = book.mesh.rotation.clone();
          var sh  = book.mesh.castShadow;
          sc.remove(book.mesh);
          buildMesh(book);
          book.mesh.position.copy(pos);
          book.mesh.rotation.copy(rot);
          book.mesh.castShadow = sh;
          sc.add(book.mesh);
          markShadowDirty();
        }
      };
      img.src = book.coverUrl;
    }
  });

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
  recheckUnlocks();
  _jarCacheDirty = true;  // detectar desbloqueos pendientes al cargar
}

// ── tick ──────────────────────────────────────────

function tick(now) {
  raf = requestAnimationFrame(tick);
  if (now - lastFrame < FRAME_BUDGET) return;
  lastFrame = now;

  const t = clk.getElapsedTime();

  animateCandles(t);
  animateDust(t);

  // Flotación libros en el bote — cache reconstruido solo cuando cambia el estado
  if (_jarCacheDirty) {
    _jarBooksCache = books.filter(function(b) {
      return b.location === 'jar' && b.mesh && b.jarPos;
    });
    _jarCacheDirty = false;
  }
  var _jlen = _jarBooksCache.length;
  for (var _ji = 0; _ji < _jlen; _ji++) {
    var _jb = _jarBooksCache[_ji];
    if (_jb === dragB) continue;
    _jb.mesh.position.y = _jb.jarPos.y + Math.sin(t * .6 + _jb.id.charCodeAt(0) * .4) * .012;
  }

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