/* ══════════════════════════════════════════════════
   SCENE.JS — Construcción de la escena 3D:
              luces, suelo, estantería, slots y botes
══════════════════════════════════════════════════ */

// ── Luces ──────────────────────────────────────────

function mkLights() {
  sc.add(new THREE.AmbientLight(0x1a1025, 1.5));
  const ml = new THREE.PointLight(0xffd090, 3.5, 32);
  ml.position.set(-0.5, 7, 5); ml.castShadow = true;
  ml.shadow.mapSize.set(1024, 1024); ml.shadow.bias = -0.003;
  sc.add(ml);
  const fl = new THREE.PointLight(0xff9944, 1.8, 18);
  fl.position.set(6, 3.5, 5); sc.add(fl);
  const rl = new THREE.PointLight(0x334488, 1.2, 14);
  rl.position.set(-4, 2, -2); sc.add(rl);
  sc.add(new THREE.HemisphereLight(0x1a1035, 0x060412, 0.6));
}

// ── Suelo ──────────────────────────────────────────

function mkFloor() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ color: 0x070612 })
  );
  m.rotation.x = -Math.PI / 2; m.position.y = -0.62;
  m.receiveShadow = true; sc.add(m);
}

// ── Estantería ─────────────────────────────────────

function mkShelf() {
  if (shelfGroup) { sc.remove(shelfGroup); shelfGroup = null; }

  const st  = CASE_STYLES[currentCase];
  const g   = new THREE.Group();
  const wm  = new THREE.MeshLambertMaterial({ color: st.wood });
  const dm  = new THREE.MeshLambertMaterial({ color: st.dark });
  const bkm = new THREE.MeshLambertMaterial({ color: st.back });
  [
    [-0.57,                  SW + 0.08, SD + 0.07, 0.10, dm],
    [SHELF_TOPS[0] - PT / 2, SW,        SD,         PT,   wm],
    [SHELF_TOPS[1] - PT / 2, SW,        SD,         PT,   wm],
    [SHELF_TOPS[2] - PT / 2, SW,        SD,         PT,   wm],
    [4.57,                   SW + 0.08, SD + 0.05, 0.12,  dm],
  ].forEach(([y, w, d, t, mat]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), mat);
    p.position.y = y; p.castShadow = true; p.receiveShadow = true; g.add(p);
  });
  const ph = 5.26;
  [-SW / 2, SW / 2].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(PT, ph, SD), dm);
    p.position.set(x, ph / 2 - 0.62, 0);
    p.castShadow = true; p.receiveShadow = true; g.add(p);
  });
  const bp = new THREE.Mesh(new THREE.BoxGeometry(SW - 0.1, 5.15, 0.05), bkm);
  bp.position.set(0, 2.0, -SD / 2 + 0.025); g.add(bp);
  SHELF_TOPS.forEach(y => {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(SW, PT * 0.6, 0.06),
      new THREE.MeshLambertMaterial({ color: st.trim })
    );
    trim.position.set(0, y + PT * 0.3, SD / 2 + 0.03); g.add(trim);
  });
  shelfGroup = g;
  sc.add(g);
}

// ── Slots de la estantería ─────────────────────────

function mkSlots() {
  slots = [];
  const xR = SW - 0.9, xS = -xR / 2;
  SHELF_TOPS.forEach((sy, si) => {
    for (let i = 0; i < SPR; i++) {
      const t = i / (SPR - 1);
      slots.push({ id: `${si}-${i}`, si, i, x: xS + t * xR, y: sy, z: 0.38, occupied: false, bookId: null });
    }
  });
}

/* ══════════════════════════════════════════════════
   BOTE — Dispatcher + constructores
══════════════════════════════════════════════════ */

/**
 * Crea el bote 3D según jarType, lo guarda en jarGroup y lo añade a la escena.
 * Si ya existía un jarGroup previo, lo elimina primero.
 */
function mkJar() {
  if (jarGroup) { sc.remove(jarGroup); jarGroup = null; }
  jarGroup = new THREE.Group();
  switch (jarType) {
    case 'tarro':   buildJarTarro(jarGroup);   break;
    case 'botella': buildJarBotella(jarGroup); break;
    case 'caja':    buildJarCaja(jarGroup);    break;
    default:        buildJarCristal(jarGroup); break;
  }
  jarGroup.position.copy(JP);
  sc.add(jarGroup);
}

// ── Helper: etiqueta canvas "A LEER" ──────────────

function mkJarLabel(g, zOffset, yOffset) {
  yOffset = yOffset || -0.08;
  const lc = document.createElement('canvas');
  lc.width = 200; lc.height = 120;
  const lx = lc.getContext('2d');
  lx.fillStyle = 'rgba(240,228,195,0.88)';
  lx.beginPath(); lx.roundRect(6, 6, 188, 108, 10); lx.fill();
  lx.strokeStyle = 'rgba(140,100,40,0.4)'; lx.lineWidth = 2;
  lx.beginPath(); lx.roundRect(6, 6, 188, 108, 10); lx.stroke();
  lx.fillStyle = '#4e3010';
  lx.font = 'bold 24px Georgia,serif'; lx.textAlign = 'center';
  lx.fillText('A LEER', 100, 46);
  lx.font = '16px Georgia,serif'; lx.fillText('✦  ✦  ✦', 100, 76);
  lx.font = 'italic 12px Georgia,serif'; lx.fillStyle = 'rgba(78,48,16,.55)';
  lx.fillText('pendientes', 100, 100);
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(lc), transparent: true })
  );
  lab.position.set(0, yOffset, zOffset);
  g.add(lab);
}

// ── 1. Cristal ─────────────────────────────────────

function buildJarCristal(g) {
  const gm = new THREE.MeshPhongMaterial({
    color: 0x99ddd0, transparent: true, opacity: 0.2,
    side: THREE.DoubleSide, shininess: 220, specular: 0xffffff,
  });
  const gcap = new THREE.MeshPhongMaterial({
    color: 0xaaddcc, transparent: true, opacity: 0.26,
    shininess: 220, specular: 0xffffff,
  });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 2.4, 32, 1, true), gm));
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), gcap);
  bot.rotation.x = -Math.PI / 2; bot.position.y = -1.2; g.add(bot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 32), gcap);
  rim.position.y = 1.2; g.add(rim);
  var jl1 = new THREE.PointLight(0x88bbcc, 0.6, 4); jl1.userData.isJarLight = true; g.add(jl1);
  mkJarLabel(g, 0.74);
}

// ── 2. Tarro (bote de conserva) ────────────────────

function buildJarTarro(g) {
  const gm = new THREE.MeshPhongMaterial({
    color: 0x99ddaa, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, shininess: 200, specular: 0xffffff,
  });
  const gcap = new THREE.MeshPhongMaterial({
    color: 0xbbddcc, transparent: true, opacity: 0.28,
    shininess: 200, specular: 0xffffff,
  });
  const lidMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 180, specular: 0xaaaacc });

  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.76, 1.8, 32, 1, true), gm));
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.76, 32), gcap);
  bot.rotation.x = -Math.PI / 2; bot.position.y = -0.9; g.add(bot);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.82, 0.22, 32), gm);
  sh.position.y = 1.01; g.add(sh);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.16, 32), lidMat);
  band.position.y = 1.20; g.add(band);
  const lidTop = new THREE.Mesh(new THREE.CircleGeometry(0.66, 32), lidMat);
  lidTop.rotation.x = -Math.PI / 2; lidTop.position.y = 1.28; g.add(lidTop);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 8, 32), lidMat);
  rim.position.y = 1.28; g.add(rim);
  var jl2 = new THREE.PointLight(0x88ccaa, 0.5, 4); jl2.userData.isJarLight = true; g.add(jl2);
  mkJarLabel(g, 0.84);
}

// ── 3. Botella ─────────────────────────────────────

function buildJarBotella(g) {
  const glassMat = new THREE.MeshPhongMaterial({
    color: 0xaa6600, transparent: true, opacity: 0.48,
    side: THREE.DoubleSide, shininess: 260, specular: 0xffcc88,
  });
  const glassCap = new THREE.MeshPhongMaterial({
    color: 0xbb7700, transparent: true, opacity: 0.52,
    shininess: 240, specular: 0xffcc88,
  });
  const corkMat = new THREE.MeshLambertMaterial({ color: 0xc4a46b });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.56, 1.6, 32, 1, true), glassMat);
  body.position.y = -0.4; g.add(body);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32), glassCap);
  bot.rotation.x = -Math.PI / 2; bot.position.y = -1.2; g.add(bot);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.60, 0.45, 32), glassMat);
  sh.position.y = 0.625; g.add(sh);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.60, 32, 1, true), glassMat);
  neck.position.y = 1.15; g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.24, 16), corkMat);
  cork.position.y = 1.57; g.add(cork);

  // Etiqueta envuelta en el cuerpo (más pequeña, adaptada a la botella)
  const lc = document.createElement('canvas');
  lc.width = 220; lc.height = 90;
  const lx = lc.getContext('2d');
  lx.fillStyle = 'rgba(240,228,195,0.9)'; lx.fillRect(0, 0, 220, 90);
  lx.strokeStyle = 'rgba(140,100,40,0.5)'; lx.lineWidth = 3;
  lx.strokeRect(4, 4, 212, 82);
  lx.fillStyle = '#4e3010'; lx.font = 'bold 20px Georgia,serif'; lx.textAlign = 'center';
  lx.fillText('A LEER', 110, 34);
  lx.font = '13px Georgia,serif'; lx.fillText('✦  ✦  ✦', 110, 56);
  lx.font = 'italic 11px Georgia,serif'; lx.fillStyle = 'rgba(78,48,16,.5)';
  lx.fillText('pendientes', 110, 76);
  const lab = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.5),
    new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(lc), transparent: true })
  );
  lab.position.set(0, -0.4, 0.62); g.add(lab);

  const gl = new THREE.PointLight(0xdd8800, 0.45, 4);
  g.add(gl);
}

// ── 4. Caja de madera ──────────────────────────────

function buildJarCaja(g) {
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x5c3410 });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3e2309 });
  const metalMat = new THREE.MeshLambertMaterial({ color: 0xc8a748 });
  const innerMat = new THREE.MeshLambertMaterial({ color: 0x6b3d14 });

  // Paredes
  const bk = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.65, 0.07), darkWood);
  bk.position.z = -0.51; g.add(bk);
  [-0.74, 0.74].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.65, 1.04), woodMat);
    w.position.x = x; g.add(w);
  });
  // Suelo
  const fl = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.90), darkWood);
  fl.position.y = -0.82; g.add(fl);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.86), innerMat);
  inner.rotation.x = -Math.PI / 2; inner.position.y = -0.78; g.add(inner);
  // Pared delantera a media altura (los libros son visibles por encima)
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.72, 0.07), woodMat);
  front.position.set(0, -0.44, 0.51); g.add(front);
  // Tapa abierta (recostada hacia atrás)
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.07, 1.04), darkWood);
  lid.position.set(0, 0.84, -0.48); lid.rotation.x = -1.1; g.add(lid);
  // Bisagras
  [-0.36, 0.36].forEach(x => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.13), metalMat);
    h.position.set(x, 0.83, -0.49); g.add(h);
  });
  // Cierre
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.07), metalMat);
  latch.position.set(0, -0.08, 0.55); g.add(latch);
  // Luz cálida interior
  const gl = new THREE.PointLight(0xffaa44, 0.9, 3);
  gl.position.set(0, 0.4, 0); g.add(gl);

  mkJarLabel(g, 0.56, 0.10);
}

// ── Lámpara de escritorio ──────────────────────────

function mkLamp() {
  var g = new THREE.Group();
  var metalMat  = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, shininess: 120, specular: 0x888888 });
  var shadeMat  = new THREE.MeshPhongMaterial({ color: 0x1a1208, shininess: 60, side: THREE.DoubleSide });
  var bulbMat   = new THREE.MeshPhongMaterial({ color: 0xfffde0, emissive: 0xffee88, emissiveIntensity: 0.0, shininess: 200 });

  // Base
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 16), metalMat);
  base.position.y = 0.03; g.add(base);

  // Brazo inferior
  var arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), metalMat);
  arm1.position.set(0, 0.33, 0); g.add(arm1);

  // Articulación
  var joint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), metalMat);
  joint.position.y = 0.62; g.add(joint);

  // Brazo superior (inclinado hacia adelante)
  var arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8), metalMat);
  arm2.rotation.x = 0.45;
  arm2.position.set(0, 0.86, 0.11); g.add(arm2);

  // Pantalla (cono invertido)
  var shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 16, 1, true), shadeMat);
  shade.rotation.x = Math.PI;   // invertir
  shade.position.set(0, 1.08, 0.22); g.add(shade);

  // Interior de la pantalla (más claro)
  var shadeIn = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.26, 16, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xd4b86a, side: THREE.BackSide }));
  shadeIn.rotation.x = Math.PI;
  shadeIn.position.copy(shade.position); g.add(shadeIn);

  // Bombilla
  var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bulbMat);
  bulb.position.set(0, 1.00, 0.22); g.add(bulb);

  // Luz — cálida, enfocada hacia abajo
  var light = new THREE.SpotLight(0xffd580, 0, 8, Math.PI / 4, 0.4, 1.5);
  light.userData.isLamp = true;
  light.position.set(0, 1.02, 0.22);
  light.target.position.set(0, -1, 0.22);
  g.add(light); g.add(light.target);
  registerLampLight(light);

  // Posición: encima de la estantería, lado derecho
  g.position.set(2.6, 4.74, 0.3);
  g.scale.setScalar(0.9);
  sc.add(g);

  // Click en la lámpara para encender/apagar
  bulb.userData.isLamp = true;
  shade.userData.isLamp = true;
}