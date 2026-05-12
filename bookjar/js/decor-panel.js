/* ══════════════════════════════════════════════════
   DECOR-PANEL.JS
══════════════════════════════════════════════════ */

const DECOR_CATALOG = [
  { type: 'cactus',     icon: '🌵', name: 'Cactus' },
  { type: 'maceta',     icon: '🪴', name: 'Maceta' },
  { type: 'enredadera', icon: '🌿', name: 'Enredadera' },
  { type: 'vela',       icon: '🕯️', name: 'Vela' },
  { type: 'calavera',   icon: '💀', name: 'Calavera' },
  { type: 'estrella',   icon: '⭐', name: 'Estrella' },
  { type: 'jarron',     icon: '🏺', name: 'Jarrón' },
  { type: 'buho',       icon: '🦉', name: 'Búho' },
  { type: 'cuadro',     icon: '🖼️', name: 'Cuadro' },
  { type: 'corona',     icon: '👑', name: 'Corona' },
];

const gdec = (u, c=0) => JSON.parse(localStorage.getItem('bj_dec_'+u+'_c'+c) || '[]');
const sdec = (u, d, c=0) => localStorage.setItem('bj_dec_'+u+'_c'+c, JSON.stringify(d));

// ── Panel ──────────────────────────────────────────

function toggleDecorPanel() {
  const panel = document.getElementById('decor-panel');
  if (panel.classList.contains('open')) closeDecorPanel();
  else { renderDecorPanel(); panel.classList.add('open'); }
}

function closeDecorPanel() {
  document.getElementById('decor-panel').classList.remove('open');
  // No cancelar placing si estamos en modo colocación — se cierra el panel pero los markers siguen
}

function renderDecorPanel() {
  document.getElementById('dp-list').innerHTML = DECOR_CATALOG.map(d => `
    <div class="dp-card ${placingDecor === d.type ? 'placing' : ''}"
         onclick="startPlacing('${d.type}')" title="${d.name}">
      <span class="dp-icon">${d.icon}</span>
      <span class="dp-name">${d.name}</span>
    </div>
  `).join('');
}

// ── Modo colocación ────────────────────────────────

let anchorMarkers = [];

function startPlacing(type) {
  if (placingDecor === type) { cancelPlacing(); return; }
  cancelPlacing();
  placingDecor = type;

  // Cerrar panel para que no bloquee los clicks en la escena
  document.getElementById('decor-panel').classList.remove('open');

  // Mostrar markers compatibles
  const compat = DECOR_ANCHOR_COMPAT[type] || ['shelf'];
  DECOR_ANCHORS.forEach(a => {
    if (!compat.includes(a.type)) return;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshPhongMaterial({
        color: 0xc8a748, emissive: 0xc8a748, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.85,
      })
    );
    marker.position.set(a.x, a.y, a.z);
    marker.userData.anchorId = a.id;
    sc.add(marker);
    anchorMarkers.push(marker);
  });

  // Hint visible
  const cat = DECOR_CATALOG.find(d => d.type === type);
  const hint = document.getElementById('dp-hint');
  hint.textContent = `${cat.icon} Haz clic en un marcador dorado — Escape para cancelar`;
  hint.style.opacity = '1';

  // Listeners
  ren.domElement.addEventListener('mousedown', onDecorMouseDown, { capture: true });
  document.addEventListener('keydown', onDecorKey);
}

function cancelPlacing() {
  if (!placingDecor) return;
  placingDecor = null;
  anchorMarkers.forEach(m => sc.remove(m));
  anchorMarkers = [];
  ren.domElement.removeEventListener('mousedown', onDecorMouseDown, { capture: true });
  document.removeEventListener('keydown', onDecorKey);
  document.getElementById('dp-hint').style.opacity = '0';
}

// ── Handlers ───────────────────────────────────────

function onDecorKey(e) {
  if (e.key === 'Escape') cancelPlacing();
}

function onDecorMouseDown(e) {
  if (e.button !== 0 || !placingDecor) return;

  // Coordenadas correctas con getBoundingClientRect
  const rect = ren.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1
  );

  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, cam);
  const hits = ray.intersectObjects(anchorMarkers, false);

  if (!hits.length) return;   // click en zona vacía: no cancelar, solo ignorar

  // Detener propagación para que el drag no lo intercepte
  e.stopPropagation();

  const anchorId = hits[0].object.userData.anchorId;
  const anchor   = DECOR_ANCHORS.find(a => a.id === anchorId);
  if (!anchor) return;

  const type = placingDecor;
  cancelPlacing();
  placeDecor(type, anchor);
}

// ── Colocar ────────────────────────────────────────

function placeDecor(type, anchor) {
  const group = buildDecor(type);
  if (type === 'cuadro') group.rotation.y = Math.PI;
  group.position.set(anchor.x, anchor.y, anchor.z);
  group.scale.set(0.01, 0.01, 0.01);
  sc.add(group);
  markShadowDirty();

  gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: .45, ease: 'back.out(2)' });

  const data = {
    id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    type,
    anchorId: anchor.id,
  };
  decorations.push({ ...data, group });
  sdec(CU, decorations.map(({ group: _, ...d }) => d), currentCase);

  const cat = DECOR_CATALOG.find(d => d.type === type);
  toast(`${cat.icon} ¡${cat.name} colocado!`);
}

// ── Eliminar con clic derecho ──────────────────────

function onDecorRightClick(e) {
  e.preventDefault();
  if (placingDecor) return;
  if (!decorations.length) return;

  const rect  = ren.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, cam);

  const meshes = [];
  decorations.forEach(d => d.group.traverse(c => { if (c.isMesh) meshes.push(c); }));
  const hits = ray.intersectObjects(meshes, false);
  if (!hits.length) return;

  const hitMesh = hits[0].object;
  const idx = decorations.findIndex(d => {
    let found = false;
    d.group.traverse(c => { if (c === hitMesh) found = true; });
    return found;
  });
  if (idx === -1) return;

  const dec = decorations[idx];
  gsap.to(dec.group.scale, {
    x: 0.01, y: 0.01, z: 0.01, duration: .25, ease: 'back.in(2)',
    onComplete: () => { sc.remove(dec.group); markShadowDirty(); }
  });
  decorations.splice(idx, 1);
  sdec(CU, decorations.map(({ group: _, ...d }) => d), currentCase);
  toast('Decoración eliminada');
}

// ── Cargar ─────────────────────────────────────────

function loadDecors() {
  decorations.forEach(d => { if (d.group) sc.remove(d.group); });
  decorations = [];

  const saved = gdec(CU, currentCase);
  saved.forEach(data => {
    const anchor = DECOR_ANCHORS.find(a => a.id === data.anchorId);
    if (!anchor) return;
    const group = buildDecor(data.type);
    if (data.type === 'cuadro') group.rotation.y = Math.PI;
    group.position.set(anchor.x, anchor.y, anchor.z);
    sc.add(group);
    decorations.push({ ...data, group });
  });

  if (decorations.length) markShadowDirty();

  ren?.domElement?.removeEventListener('contextmenu', onDecorRightClick);
  ren?.domElement?.addEventListener('contextmenu', onDecorRightClick);
}