/* ══════════════════════════════════════════════════
   STATE.JS — Variables globales compartidas y constantes
   Carga primero: todos los demás módulos dependen de este.
══════════════════════════════════════════════════ */

// ── Auth ──
var CU = null;   // usuario actual

// ── Datos de libros y opciones del modal ──
var books = [];
var pc = '#c0392b';   // color seleccionado
var pr = 3;           // valoración seleccionada

// ── localStorage helpers ──
var gu  = ()      => JSON.parse(localStorage.getItem('bj_u') || '{}');
var su  = u       => localStorage.setItem('bj_u', JSON.stringify(u));
var gbk = (u,c=0) => JSON.parse(localStorage.getItem('bj_b_'+u+'_c'+c) || '[]');
var sbk = (u,b,c=0)=> localStorage.setItem('bj_b_'+u+'_c'+c, JSON.stringify(b));

// ── Estanterías: estilos y progresión ────────────────
var UNLOCK_THRESHOLD = 8;   // libros en estantería para desbloquear la siguiente

var CASE_STYLES = [
  {
    name: 'Roble clásico',   icon: '🪵', desc: 'Cálida y atemporal',
    wood: 0x3e2309, dark: 0x2a1706, back: 0x160c02, trim: 0x4e2c0c,
    bg:   0x090810, fog: 0x090810,  accent: '#c8a748',
  },
  {
    name: 'Caoba victoriana', icon: '🏰', desc: 'Elegante y oscura',
    wood: 0x4a1208, dark: 0x2e0806, back: 0x140202, trim: 0x9b7315,
    bg:   0x0a0508, fog: 0x0a0508,  accent: '#d4a017',
  },
  {
    name: 'Abedul nórdico',  icon: '🌿', desc: 'Limpia y luminosa',
    wood: 0xbcaa8a, dark: 0x9a8868, back: 0x2a2820, trim: 0xd8cdb0,
    bg:   0x0d0e14, fog: 0x0d0e14,  accent: '#8cb8a0',
  },
  {
    name: 'Acero industrial', icon: '⚙️', desc: 'Cruda y moderna',
    wood: 0x3a3a3c, dark: 0x222224, back: 0x141416, trim: 0xb87333,
    bg:   0x070708, fog: 0x070708,  accent: '#b87333',
  },
  {
    name: 'Ébano arcano',    icon: '✨', desc: 'Misteriosa y mágica',
    wood: 0x1c0a30, dark: 0x100518, back: 0x08020e, trim: 0x7b2be2,
    bg:   0x06020e, fog: 0x06020e,  accent: '#9b4de8',
  },
];

// ── Objetos Three.js (se asignan en initScene) ──
var sc, cam, ren, clk, raf;
var rc;
var MV     = null;   // init en initScene: new THREE.Vector2()
var DPLANE = null;   // init en initScene: new THREE.Plane(...)

// ── Estado de drag & drop ──
var DRAG_Z = 0.5;  // Z fija durante arrastre (cara frontal estantería)
var dragB   = null;
var isDrag  = false;
var slHls   = [];     // meshes de highlight activos
var highSl  = null;   // slot destacado actual

// ── Constantes de escena ──
var SHELF_TOPS = [0.0, 1.55, 3.1];   // Y de cada balda
var PT = 0.1;                          // grosor de plank
var SW = 6.0;                          // ancho estantería
var SD = 1.0;                          // profundidad estantería
var JP = null;   // init en initScene: new THREE.Vector3(5.5, 0.55, 0.1)
var SPR = 13;                           // slots por balda

// ── Slots de la estantería ──
var slots = [];

// ── Estantería activa y estilo ──
var currentCase  = 0;       // índice en CASE_STYLES
var shelfGroup   = null;    // THREE.Group de la estantería en escena


// ── Decoraciones ──────────────────────────────────
var decorations  = [];     // [{id, type, anchorId, group}] activos en escena
var placingDecor = null;   // string con el tipo que se está colocando ahora

// Anchors: puntos de colocación válidos en la estantería
// type: 'shelf' = encima de balda/cima | 'wall' = panel trasero | 'edge' = cuelga del frontal
var DECOR_ANCHORS = [
  // Cima de la estantería (5 puntos)
  { id:'top-l',  x:-2.2, y:4.74, z:0.28, type:'shelf' },
  { id:'top-ml', x:-1.1, y:4.74, z:0.28, type:'shelf' },
  { id:'top-c',  x: 0.0, y:4.74, z:0.28, type:'shelf' },
  { id:'top-mr', x: 1.1, y:4.74, z:0.28, type:'shelf' },
  { id:'top-r',  x: 2.2, y:4.74, z:0.28, type:'shelf' },
  // Balda 3 — extremos
  { id:'s2-l',   x:-2.5, y:3.16, z:0.28, type:'shelf' },
  { id:'s2-r',   x: 2.5, y:3.16, z:0.28, type:'shelf' },
  // Balda 2 — extremos
  { id:'s1-l',   x:-2.5, y:1.61, z:0.28, type:'shelf' },
  { id:'s1-r',   x: 2.5, y:1.61, z:0.28, type:'shelf' },
  // Balda 1 — extremos
  { id:'s0-l',   x:-2.5, y:0.06, z:0.28, type:'shelf' },
  { id:'s0-r',   x: 2.5, y:0.06, z:0.28, type:'shelf' },
  // Panel trasero — cuadros (3 puntos, z cerca del fondo)
  { id:'bk-tl',  x:-1.4, y:3.70, z:-0.42, type:'wall' },
  { id:'bk-tr',  x: 1.4, y:3.70, z:-0.42, type:'wall' },
  { id:'bk-ml',  x:-1.4, y:2.20, z:-0.42, type:'wall' },
  { id:'bk-mr',  x: 1.4, y:2.20, z:-0.42, type:'wall' },
  { id:'bk-bl',  x:-1.4, y:0.70, z:-0.42, type:'wall' },
  { id:'bk-br',  x: 1.4, y:0.70, z:-0.42, type:'wall' },
  // Bordes frontales — enredaderas (cuelgan hacia abajo)
  { id:'ed-2l',  x:-2.0, y:3.10, z:0.50, type:'edge' },
  { id:'ed-2r',  x: 2.0, y:3.10, z:0.50, type:'edge' },
  { id:'ed-1l',  x:-2.0, y:1.55, z:0.50, type:'edge' },
  { id:'ed-1r',  x: 2.0, y:1.55, z:0.50, type:'edge' },
  { id:'ed-0l',  x:-2.0, y:0.00, z:0.50, type:'edge' },
];

// Qué tipos de decoración son válidos en qué tipo de anchor
var DECOR_ANCHOR_COMPAT = {
  cactus:      ['shelf'],
  maceta:      ['shelf'],
  enredadera:  ['edge'],
  vela:        ['shelf'],
  calavera:    ['shelf'],
  estrella:    ['shelf'],
  jarron:      ['shelf'],
  buho:        ['shelf'],
  cuadro:      ['wall'],
  corona:      ['shelf'],
};

// ── Atmósfera ─────────────────────────────────────
var dustParticles = null;     // THREE.Points de polvo
var candleFlames  = [];       // [{mesh, light, base}] para animar

// ── Estados de libro ──────────────────────────────
var BOOK_STATUS = {
  pendiente: { label: 'Pendiente', icon: '⏳', tint: null   },
  leyendo:   { label: 'Leyendo',   icon: '📖', tint: 0x00aaff },
  leido:     { label: 'Leído',     icon: '✓',  tint: 0x44cc66 },
};
// ── Caché de textura de páginas (se invalida al cerrar sesión) ──
var ptex = null;

// ── Tipo de bote y su referencia en la escena ──
var jarType  = 'cristal';   // 'cristal' | 'tarro' | 'botella' | 'caja'
var jarGroup = null;         // THREE.Group del bote actual (para poder reconstruirlo)

// ── Timer del toast ──
var _tt;