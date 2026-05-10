'use strict';

/* ══════════════════════════════════════════════════
   STATE.JS — Variables globales compartidas y constantes
   Carga primero: todos los demás módulos dependen de este.
══════════════════════════════════════════════════ */

// ── Auth ──
let CU = null;   // usuario actual

// ── Datos de libros y opciones del modal ──
let books = [];
let pc = '#c0392b';   // color seleccionado
let pr = 3;           // valoración seleccionada

// ── localStorage helpers ──
const gu  = ()      => JSON.parse(localStorage.getItem('bj_u') || '{}');
const su  = u       => localStorage.setItem('bj_u', JSON.stringify(u));
const gbk = (u,c=0) => JSON.parse(localStorage.getItem('bj_b_'+u+'_c'+c) || '[]');
const sbk = (u,b,c=0)=> localStorage.setItem('bj_b_'+u+'_c'+c, JSON.stringify(b));

// ── Estanterías: estilos y progresión ────────────────
const UNLOCK_THRESHOLD = 8;   // libros en estantería para desbloquear la siguiente

const CASE_STYLES = [
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
let sc, cam, ren, clk, raf;
let rc;
let MV     = new THREE.Vector2();
let DPLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.5); // plano vertical Z=0.5, cara frontal estantería

// ── Estado de drag & drop ──
const DRAG_Z = 0.5;  // Z fija durante arrastre (cara frontal estantería)
let dragB   = null;
let isDrag  = false;
let slHls   = [];     // meshes de highlight activos
let highSl  = null;   // slot destacado actual

// ── Constantes de escena ──
const SHELF_TOPS = [0.0, 1.55, 3.1];   // Y de cada balda
const PT = 0.1;                          // grosor de plank
const SW = 6.0;                          // ancho estantería
const SD = 1.0;                          // profundidad estantería
const JP = new THREE.Vector3(5.5, 0.55, 0.1);  // posición del bote
const SPR = 13;                           // slots por balda

// ── Slots de la estantería ──
let slots = [];

// ── Estantería activa y estilo ──
let currentCase  = 0;       // índice en CASE_STYLES
let shelfGroup   = null;    // THREE.Group de la estantería en escena

// ── Caché de textura de páginas (se invalida al cerrar sesión) ──
let ptex = null;

// ── Tipo de bote y su referencia en la escena ──
let jarType  = 'cristal';   // 'cristal' | 'tarro' | 'botella' | 'caja'
let jarGroup = null;         // THREE.Group del bote actual (para poder reconstruirlo)

// ── Timer del toast ──
let _tt;