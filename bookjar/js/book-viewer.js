/* ══════════════════════════════════════════════════
   BOOK-VIEWER.JS — Visor 3D de portada
══════════════════════════════════════════════════ */

var _vRen    = null;
var _vSc     = null;
var _vCam    = null;
var _vMesh   = null;
var _vRaf    = null;
var _vDrag   = false;
var _vStartX = 0;
var _vRotY   = 0;
var _vAutoR  = true;
var _vTarget = 0;

function openBookViewer(book) {
  if (!book) return;
  sndModalOpen && sndModalOpen();

  if (book.mesh) {
    gsap.killTweensOf(book.mesh.position);
    gsap.killTweensOf(book.mesh.scale);
    var origPos = { x: book.mesh.position.x, y: book.mesh.position.y, z: book.mesh.position.z };
    gsap.to(book.mesh.position, { z: book.mesh.position.z + 3.5, y: book.mesh.position.y + 0.3, duration: .28, ease: 'power2.in' });
    gsap.to(book.mesh.scale, { x: 1.6, y: 1.6, z: 1.6, duration: .28, ease: 'power2.in',
      onComplete: function() {
        gsap.to(book.mesh.position, Object.assign({}, origPos, { duration: .01 }));
        gsap.set(book.mesh.scale, { x: 1, y: 1, z: 1 });
        _openViewer(book);
      }
    });
    return;
  }
  _openViewer(book);
}

function _openViewer(book) {
  document.getElementById('bv-title').textContent  = book.title;
  document.getElementById('bv-author').textContent = book.author + (book.pages ? '  ·  ' + book.pages + ' pág.' : '');
  document.getElementById('bv-overlay').classList.add('open');

  closeViewerRenderer();

  var canvas = document.getElementById('bv-canvas');
  var w = canvas.clientWidth  || 340;
  var h = canvas.clientHeight || 420;

  _vSc  = new THREE.Scene();
  _vSc.background = new THREE.Color(0x0d0b14);

  // Cámara en el eje X → ve la cara +x (portada) directamente
  _vCam = new THREE.PerspectiveCamera(38, w / h, 0.1, 20);
  _vCam.position.set(3.2, 0, 0);
  _vCam.lookAt(0, 0, 0);

  _vRen = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
  _vRen.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  _vRen.setSize(w, h);

  // Luces desde el lado de la cámara (eje X)
  _vSc.add(new THREE.AmbientLight(0xfff0d0, 0.6));
  var key = new THREE.DirectionalLight(0xfff5e0, 1.8);
  key.position.set(3, 2, 1); _vSc.add(key);
  var fill = new THREE.DirectionalLight(0xd0c8ff, 0.4);
  fill.position.set(-1, 0, 2); _vSc.add(fill);

  // Construir materiales del libro
  var bw = 0.28 * (book.wm || 1.0);
  var bh = 1.16 * (book.hm || 1.0);
  var bd = 0.7;
  var dark = new THREE.Color(book.color).multiplyScalar(0.68);

  var pgMat, spineMat, coverMat;

  if (book.coverImg && book.coverImg.complete && book.coverImg.naturalWidth) {
    var cv = document.createElement('canvas'); cv.width = 200; cv.height = 320;
    cv.getContext('2d').drawImage(book.coverImg, 0, 0, 200, 320);
    coverMat = new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv) });
  } else {
    coverMat = new THREE.MeshLambertMaterial({ map: mkCoverTex ? mkCoverTex(book) : null, color: book.color });
  }

  var pgTex = mkPageTex ? mkPageTex() : null;
  pgMat    = pgTex ? new THREE.MeshLambertMaterial({ map: pgTex }) : new THREE.MeshLambertMaterial({ color: 0xf0e2c4 });
  spineMat = mkSpineTex ? new THREE.MeshLambertMaterial({ map: mkSpineTex(book) }) : new THREE.MeshLambertMaterial({ color: dark });

  // Orden BoxGeometry: +x, -x, +y, -y, +z, -z
  // Cámara en +x → ve la cara +x (portada) de frente
  var mats = [
    coverMat,                                                       // +x → portada (hacia cámara)
    new THREE.MeshLambertMaterial({ color: dark }),                 // -x → contraportada
    pgMat,                                                          // +y → páginas arriba
    pgMat,                                                          // -y → páginas abajo
    spineMat,                                                       // +z → lomo
    new THREE.MeshLambertMaterial({ color: dark }),                 // -z → fondo
  ];

  _vMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats);
  _vSc.add(_vMesh);

  // Empieza girado en Y para mostrar portada con perspectiva
  // (rotación en Y rota alrededor del eje vertical → muestra más del lomo)
  _vRotY  = 0.30;   // 17° girado — portada visible con un poco de lomo
  _vTarget = 0;     // en Y=0 la portada mira directo a la cámara (+x)
  _vAutoR  = true;

  var c = document.getElementById('bv-canvas');
  c.addEventListener('mousedown',  vOnDn);
  c.addEventListener('mousemove',  vOnMv);
  c.addEventListener('mouseup',    vOnUp);
  c.addEventListener('mouseleave', vOnUp);
  c.addEventListener('touchstart', vOnTDn, { passive: false });
  c.addEventListener('touchmove',  vOnTMv, { passive: false });
  c.addEventListener('touchend',   vOnUp);

  vTick();
}

function closeBookViewer() {
  document.getElementById('bv-overlay').classList.remove('open');
  closeViewerRenderer();
  sndModalClose && sndModalClose();
}

function closeViewerRenderer() {
  if (_vRaf) { cancelAnimationFrame(_vRaf); _vRaf = null; }
  var c = document.getElementById('bv-canvas');
  if (c) {
    c.removeEventListener('mousedown',  vOnDn);
    c.removeEventListener('mousemove',  vOnMv);
    c.removeEventListener('mouseup',    vOnUp);
    c.removeEventListener('mouseleave', vOnUp);
    c.removeEventListener('touchstart', vOnTDn);
    c.removeEventListener('touchmove',  vOnTMv);
    c.removeEventListener('touchend',   vOnUp);
  }
  if (_vRen) { _vRen.dispose(); _vRen = null; }
  _vSc = _vCam = _vMesh = null;
}

function vTick() {
  _vRaf = requestAnimationFrame(vTick);
  if (!_vRen || !_vMesh) return;

  // Ease suave hacia la posición de frente
  if (_vAutoR) {
    _vRotY += (_vTarget - _vRotY) * 0.07;
    if (Math.abs(_vRotY - _vTarget) < 0.003) { _vRotY = _vTarget; _vAutoR = false; }
  }

  // Límite ±40° desde el frente
  _vRotY = Math.max(-0.70, Math.min(0.70, _vRotY));
  _vMesh.rotation.y = _vRotY;
  _vMesh.position.y = Math.sin(Date.now() * 0.001) * 0.018;

  _vRen.render(_vSc, _vCam);
}

function vOnDn(e)  { _vDrag = true;  _vStartX = e.clientX; _vAutoR = false; }
function vOnMv(e)  { if (!_vDrag) return; _vRotY += (e.clientX - _vStartX) * 0.008; _vStartX = e.clientX; }
function vOnUp()   { _vDrag = false; }
function vOnTDn(e) { e.preventDefault(); _vDrag = true; _vStartX = e.touches[0].clientX; _vAutoR = false; }
function vOnTMv(e) { e.preventDefault(); if (!_vDrag) return; _vRotY += (e.touches[0].clientX - _vStartX) * 0.008; _vStartX = e.touches[0].clientX; }