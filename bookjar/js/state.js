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
const gbk = u       => JSON.parse(localStorage.getItem('bj_b_' + u) || '[]');
const sbk = (u, b)  => localStorage.setItem('bj_b_' + u, JSON.stringify(b));

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

// ── Caché de textura de páginas (se invalida al cerrar sesión) ──
let ptex = null;

// ── Tipo de bote y su referencia en la escena ──
let jarType  = 'cristal';   // 'cristal' | 'tarro' | 'botella' | 'caja'
let jarGroup = null;         // THREE.Group del bote actual (para poder reconstruirlo)

// ── Timer del toast ──
let _tt;