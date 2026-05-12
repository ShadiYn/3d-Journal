

/* ══════════════════════════════════════════════════
   DECOR.JS — Constructores 3D de decoraciones
══════════════════════════════════════════════════ */

/** Dispatcher: devuelve un THREE.Group con la decoración del tipo dado */
function buildDecor(type) {
  const g = new THREE.Group();
  switch (type) {
    case 'cactus':     buildCactus(g);     break;
    case 'maceta':     buildMaceta(g);     break;
    case 'enredadera': buildEnredadera(g); break;
    case 'vela':       buildVela(g);       break;
    case 'calavera':   buildCalavera(g);   break;
    case 'estrella':   buildEstrella(g);   break;
    case 'jarron':     buildJarron(g);     break;
    case 'buho':       buildBuho(g);       break;
    case 'cuadro':     buildCuadro(g);     break;
    case 'corona':     buildCorona(g);     break;
  }
  return g;
}

// ── Helpers ────────────────────────────────────────

const M = (geo, col, opts = {}) => new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col, ...opts }));
const Mp = (geo, col, opts = {}) => new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: col, ...opts }));

// ── 1. Cactus ──────────────────────────────────────

function buildCactus(g) {
  const green = 0x2d7a2d, dkgreen = 0x1a5c1a;

  // Maceta
  const pot = M(new THREE.CylinderGeometry(0.13, 0.10, 0.16, 10), 0x9b5e3c);
  pot.position.y = 0.08; g.add(pot);
  const rim = M(new THREE.TorusGeometry(0.13, 0.018, 6, 16), 0x7a4628);
  rim.position.y = 0.165; g.add(rim);
  // Tierra
  const soil = M(new THREE.CylinderGeometry(0.115, 0.115, 0.02, 10), 0x2c1a08);
  soil.position.y = 0.17; g.add(soil);
  // Tronco central
  const trunk = M(new THREE.CylinderGeometry(0.07, 0.075, 0.55, 8), green);
  trunk.position.y = 0.46; g.add(trunk);
  // Brazo izquierdo
  const armL = M(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 7), dkgreen);
  armL.rotation.z = Math.PI / 2.4; armL.position.set(-0.16, 0.52, 0); g.add(armL);
  const armLv = M(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 7), green);
  armLv.position.set(-0.27, 0.61, 0); g.add(armLv);
  // Brazo derecho
  const armR = M(new THREE.CylinderGeometry(0.04, 0.04, 0.20, 7), dkgreen);
  armR.rotation.z = -Math.PI / 2.8; armR.position.set(0.14, 0.60, 0); g.add(armR);
  const armRv = M(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 7), green);
  armRv.position.set(0.23, 0.68, 0); g.add(armRv);
  // Flor rosa en la cima
  const flower = M(new THREE.SphereGeometry(0.055, 6, 6), 0xff6b9d);
  flower.position.y = 0.79; g.add(flower);
}

// ── 2. Maceta con planta ───────────────────────────

function buildMaceta(g) {
  // Maceta cerámica
  const pot = Mp(new THREE.CylinderGeometry(0.16, 0.11, 0.22, 12), 0xc85a2a,
    { shininess: 80, specular: 0xff8855 });
  pot.position.y = 0.11; g.add(pot);
  const rim = M(new THREE.TorusGeometry(0.16, 0.022, 6, 16), 0xa04422);
  rim.position.y = 0.225; g.add(rim);
  const soil = M(new THREE.CylinderGeometry(0.14, 0.14, 0.025, 10), 0x2c1a08);
  soil.position.y = 0.235; g.add(soil);

  // Tallos y hojas
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a7d3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2a8c2a, side: THREE.DoubleSide });

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const lean = 0.18 + (i % 3) * 0.08;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.38 + (i%3)*0.06, 5), stemMat);
    stem.position.set(Math.cos(ang)*lean, 0.44, Math.sin(ang)*lean);
    stem.rotation.z = Math.cos(ang) * 0.4;
    stem.rotation.x = Math.sin(ang) * 0.4;
    g.add(stem);

    // Hoja en la punta del tallo
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), leafMat);
    leaf.scale.set(0.6, 0.3, 1.2);
    leaf.position.set(Math.cos(ang)*(lean+0.1), 0.65 + (i%3)*0.04, Math.sin(ang)*(lean+0.1));
    leaf.rotation.y = ang;
    g.add(leaf);
  }
}

// ── 3. Enredadera (cuelga hacia abajo) ────────────

function buildEnredadera(g) {
  const vineMat  = new THREE.MeshLambertMaterial({ color: 0x2e6b1e });
  const leafMat  = new THREE.MeshLambertMaterial({ color: 0x3a8c22, side: THREE.DoubleSide });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x4aaa2a, side: THREE.DoubleSide });

  // 4 ramas que caen desde y=0 hacia abajo
  for (let r = 0; r < 4; r++) {
    const xOff  = (r - 1.5) * 0.22;
    const len   = 0.55 + r * 0.12;
    const segs  = Math.floor(len / 0.12);

    for (let s = 0; s < segs; s++) {
      const yPos  = -(s * 0.12) - 0.06;
      const sway  = Math.sin(s * 0.8 + r) * 0.04;

      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 4), vineMat);
      seg.position.set(xOff + sway, yPos, 0);
      g.add(seg);

      // Hoja cada 2 segmentos
      if (s % 2 === 0) {
        const lmat = s % 4 === 0 ? leafMat : leafMat2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), lmat);
        leaf.scale.set(1.2, 0.3, 0.9);
        leaf.position.set(xOff + sway + (r%2===0?0.08:-0.08), yPos, 0.02);
        leaf.rotation.y = Math.random() * Math.PI;
        g.add(leaf);
      }
    }
  }
}

// ── 4. Vela ────────────────────────────────────────

function buildVela(g) {
  // Base/plato
  const plate = M(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 14), 0xd4c49a);
  plate.position.y = 0.015; g.add(plate);
  // Cuerpo de cera
  const wax = Mp(new THREE.CylinderGeometry(0.09, 0.095, 0.36, 12), 0xf5e8c8,
    { shininess: 30 });
  wax.position.y = 0.21; g.add(wax);
  // Gota de cera derramada
  const drip = M(new THREE.SphereGeometry(0.04, 6, 4), 0xf0ddb0);
  drip.scale.set(1, 0.4, 0.8); drip.position.set(0.08, 0.13, 0.06); g.add(drip);
  // Mecha
  const wick = M(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 4), 0x2a1a0a);
  wick.position.y = 0.42; g.add(wick);
  // Llama (emisiva)
  const flame = Mp(new THREE.SphereGeometry(0.035, 6, 6), 0xff8800,
    { emissive: 0xff6600, emissiveIntensity: 1.2, shininess: 0 });
  flame.scale.set(0.6, 1.4, 0.6); flame.position.y = 0.48; g.add(flame);
  const flameInner = Mp(new THREE.SphereGeometry(0.018, 5, 5), 0xffdd44,
    { emissive: 0xffcc00, emissiveIntensity: 1.5, shininess: 0 });
  flameInner.scale.set(0.5, 1.2, 0.5); flameInner.position.y = 0.485; g.add(flameInner);
  // Luz puntual de la llama
  const fl = new THREE.PointLight(0xff8833, 0.8, 3.5);
  fl.position.y = 0.50; g.add(fl);
}

// ── 5. Calavera ────────────────────────────────────

function buildCalavera(g) {
  const boneMat = new THREE.MeshPhongMaterial({ color: 0xe8e0d0, shininess: 40, specular: 0xccccaa });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111008 });

  // Cráneo
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), boneMat);
  skull.scale.set(1, 1.05, 0.88); skull.position.y = 0.29; g.add(skull);
  // Mandíbula
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 6), boneMat);
  jaw.scale.set(0.85, 0.55, 0.78); jaw.position.set(0, 0.085, 0.04); g.add(jaw);
  // Ojo izquierdo
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), darkMat);
  eyeL.position.set(-0.075, 0.30, 0.15); g.add(eyeL);
  // Ojo derecho
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), darkMat);
  eyeR.position.set( 0.075, 0.30, 0.15); g.add(eyeR);
  // Nariz
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), darkMat);
  nose.scale.set(1.3, 0.9, 0.5); nose.position.set(0, 0.195, 0.175); g.add(nose);
  // Dientes
  [-0.06, -0.02, 0.02, 0.06].forEach(x => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.042, 0.025), boneMat);
    t.position.set(x, 0.08, 0.14); g.add(t);
  });
}

// ── 6. Estrella ────────────────────────────────────

function buildEstrella(g) {
  // Estrella de 5 puntas via BufferGeometry
  const pts = [], outerR = 0.22, innerR = 0.09, n = 5;
  for (let i = 0; i < n * 2; i++) {
    const ang = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r   = i % 2 === 0 ? outerR : innerR;
    pts.push(Math.cos(ang) * r, Math.sin(ang) * r, 0);
  }
  const shape = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const x = pts[i*3], y = pts[i*3+1];
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();

  const extGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012 });
  const star = Mp(extGeo, 0xc8a748, { emissive: 0xc8a748, emissiveIntensity: 0.25, shininess: 120, specular: 0xffe88a });
  star.position.set(0, 0.25, -0.03); star.rotation.x = -0.1; g.add(star);
  // Luz dorada tenue
  const gl = new THREE.PointLight(0xffd060, 0.6, 2.5);
  gl.position.y = 0.3; g.add(gl);
}

// ── 7. Jarrón ──────────────────────────────────────

function buildJarron(g) {
  const col    = 0x1a4a8c;
  const accent = 0xc8a748;

  // Cuerpo del jarrón con CylinderGeometry en múltiples segmentos para simular curva
  const radii   = [0.06, 0.10, 0.14, 0.17, 0.18, 0.17, 0.14, 0.10, 0.06];
  const heights = [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08];
  let y = 0.0;
  radii.forEach((r, i) => {
    if (i === radii.length - 1) return;
    const seg = Mp(new THREE.CylinderGeometry(radii[i+1], r, heights[i], 14), col,
      { shininess: 90, specular: 0x4488cc });
    seg.position.y = y + heights[i] / 2; g.add(seg);
    y += heights[i];
  });
  // Base
  const base = M(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), 0x142e60);
  base.position.y = -0.015; g.add(base);
  // Ribete dorado superior
  const rim = M(new THREE.TorusGeometry(0.07, 0.015, 6, 14), accent);
  rim.position.y = y - 0.01; g.add(rim);
  // Asas
  [-1, 1].forEach(side => {
    const handle = M(new THREE.TorusGeometry(0.075, 0.018, 5, 10, Math.PI), accent);
    handle.rotation.z = side * Math.PI / 2;
    handle.position.set(side * 0.17, 0.38, 0); g.add(handle);
  });
  // Decoración pintada: línea horizontal dorada a media altura
  const band = M(new THREE.CylinderGeometry(0.182, 0.182, 0.025, 14), accent);
  band.position.y = 0.28; g.add(band);
}

// ── 8. Búho ────────────────────────────────────────

function buildBuho(g) {
  const brown    = 0x6b3e1a;
  const lbrown   = 0x9b6030;
  const cream    = 0xf0e0b0;
  const darkMat  = new THREE.MeshLambertMaterial({ color: 0x0a0806 });
  const yellowMat= new THREE.MeshPhongMaterial({ color: 0xffcc00, shininess: 60 });

  // Cuerpo
  const body = Mp(new THREE.SphereGeometry(0.20, 9, 8), lbrown, { shininess: 20 });
  body.scale.set(1, 1.3, 0.9); body.position.y = 0.28; g.add(body);
  // Cabeza
  const head = Mp(new THREE.SphereGeometry(0.15, 9, 8), brown, { shininess: 20 });
  head.position.y = 0.58; g.add(head);
  // Pecho claro
  const chest = M(new THREE.SphereGeometry(0.13, 8, 7), cream);
  chest.scale.set(0.85, 1.1, 0.6); chest.position.set(0, 0.27, 0.10); g.add(chest);
  // Ojos
  const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 7), new THREE.MeshLambertMaterial({ color: 0xfff8e0 }));
  eyeWhiteL.position.set(-0.065, 0.605, 0.10); g.add(eyeWhiteL);
  const eyeWhiteR = eyeWhiteL.clone(); eyeWhiteR.position.x = 0.065; g.add(eyeWhiteR);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), darkMat);
  pupilL.position.set(-0.065, 0.605, 0.135); g.add(pupilL);
  const pupilR = pupilL.clone(); pupilR.position.x = 0.065; g.add(pupilR);
  // Pico
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.055, 5), yellowMat);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.575, 0.155); g.add(beak);
  // Orejas (plumas)
  [-1, 1].forEach(s => {
    const ear = M(new THREE.ConeGeometry(0.028, 0.065, 4), brown);
    ear.position.set(s * 0.10, 0.70, 0.0); ear.rotation.z = s * 0.3; g.add(ear);
  });
  // Patas
  [-1, 1].forEach(s => {
    const leg = M(new THREE.CylinderGeometry(0.012, 0.012, 0.085, 4), lbrown);
    leg.position.set(s * 0.065, 0.04, 0); g.add(leg);
  });
}

// ── 9. Cuadro (para panel trasero) ────────────────

function buildCuadro(g) {
  const frameW  = 0.60, frameH = 0.45;
  const frameD  = 0.025, frameT = 0.045;
  const frameMat = new THREE.MeshPhongMaterial({ color: 0xc8a748, shininess: 80, specular: 0xffe090 });

  // Marco — 4 listones
  [[frameW, frameT, frameD, 0, frameH/2+frameT/2, 0],
   [frameW, frameT, frameD, 0,-frameH/2-frameT/2, 0],
   [frameT, frameH, frameD,-frameW/2-frameT/2, 0, 0],
   [frameT, frameH, frameD, frameW/2+frameT/2, 0, 0],
  ].forEach(([w,h,d,x,y,z]) => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(w+frameT*2, h, d), frameMat);
    plank.position.set(x, y, z); g.add(plank);
  });

  // Lienzo — canvas con pintura generativa
  const cv = document.createElement('canvas'); cv.width=128; cv.height=96;
  const ctx= cv.getContext('2d');
  // Cielo degradado
  const sky = ctx.createLinearGradient(0,0,0,60);
  sky.addColorStop(0,'#1a2a6c'); sky.addColorStop(1,'#b21f1f');
  ctx.fillStyle=sky; ctx.fillRect(0,0,128,60);
  // Tierra
  ctx.fillStyle='#2d4a1e'; ctx.fillRect(0,55,128,41);
  // Luna
  ctx.fillStyle='rgba(255,248,200,0.9)'; ctx.beginPath();
  ctx.arc(88,18,10,0,Math.PI*2); ctx.fill();
  // Árbol estilizado
  ctx.fillStyle='#1a0e05';
  ctx.fillRect(58,30,5,30);
  ctx.beginPath(); ctx.arc(60,26,14,0,Math.PI*2);
  ctx.fill();
  // Estrellas
  ctx.fillStyle='rgba(255,255,220,0.8)';
  [[20,8],[40,15],[100,6],[115,20],[10,22],[70,5]].forEach(([x,y])=>{
    ctx.fillRect(x,y,2,2);
  });

  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(frameW-0.01, frameH-0.01),
    new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(cv) })
  );
  canvas.position.z = frameD/2; g.add(canvas);
  g.rotation.y = 0;  // cuadro plano contra la pared trasera
}

// ── 10. Corona ─────────────────────────────────────

function buildCorona(g) {
  const goldMat = new THREE.MeshPhongMaterial({ color: 0xc8a748, shininess: 120, specular: 0xffe88a });
  const gemMat  = new THREE.MeshPhongMaterial({ color: 0xcc1122, shininess: 200, specular: 0xff8888, transparent: true, opacity: 0.9 });

  // Banda base
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24, 1, true), goldMat);
  band.position.y = 0.06; g.add(band);
  const topRim  = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.016, 6, 24), goldMat);
  topRim.position.y  = 0.12; g.add(topRim);
  const botRim  = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.016, 6, 24), goldMat);
  botRim.position.y  = 0.00; g.add(botRim);

  // 5 púas
  const n = 5;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const px  = Math.cos(ang) * 0.22;
    const pz  = Math.sin(ang) * 0.22;
    const h   = i % 2 === 0 ? 0.18 : 0.11;

    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.038, h, 5), goldMat);
    spike.position.set(px, 0.12 + h/2, pz);
    g.add(spike);

    // Gema en las púas altas
    if (i % 2 === 0) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.030), gemMat);
      gem.position.set(px * 0.7, 0.14, pz * 0.7); g.add(gem);
    }
  }
  // Luz dorada sutil
  const gl = new THREE.PointLight(0xffd060, 0.4, 2);
  gl.position.y = 0.2; g.add(gl);
}
