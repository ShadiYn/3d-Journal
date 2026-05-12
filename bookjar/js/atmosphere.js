/* ══════════════════════════════════════════════════
   ATMOSPHERE.JS — Llama de velas animada,
   partículas de polvo y modo día/noche
══════════════════════════════════════════════════ */

// ── Llama animada ──────────────────────────────────

/**
 * Registra una vela recién colocada para animarla.
 * Busca en el group la llama exterior, interior y la luz.
 */
function registerCandle(group) {
  let flameMesh = null, innerMesh = null, light = null;
  let i = 0;
  group.traverse(c => {
    if (!c.isMesh && !c.isLight) return;
    if (c.isLight) { light = c; return; }
    // La llama exterior es el mesh índice 6, interior índice 7
    // (según el orden en buildVela)
    if (c.isMesh && c.material?.emissive) {
      if (!flameMesh) flameMesh = c;
      else if (!innerMesh) innerMesh = c;
    }
  });
  if (flameMesh) candleFlames.push({ flameMesh, innerMesh, light, group, offset: Math.random() * Math.PI * 2 });
}

/** Anima todas las velas registradas. Llamada desde tick() */
function animateCandles(t) {
  candleFlames = candleFlames.filter(c => c.group.parent);  // limpiar eliminadas

  candleFlames.forEach(({ flameMesh, innerMesh, light, offset }) => {
    const flicker = Math.sin(t * 12 + offset) * 0.08
                  + Math.sin(t * 7.3 + offset * 1.3) * 0.05
                  + Math.sin(t * 19  + offset * 0.7) * 0.03;

    // Escala de la llama oscila
    if (flameMesh) {
      flameMesh.scale.x = 0.6 + flicker * 0.8;
      flameMesh.scale.z = 0.6 + flicker * 0.8;
      flameMesh.scale.y = 1.4 + flicker * 0.6;
      flameMesh.rotation.y = t * 1.2 + offset;
    }
    if (innerMesh) {
      innerMesh.scale.x = 0.5 + flicker * 0.6;
      innerMesh.scale.z = 0.5 + flicker * 0.6;
    }
    // Luz oscila en intensidad y posición
    if (light) {
      light.intensity = 0.8 + flicker * 1.2;
      light.position.y = 0.50 + flicker * 0.04;
    }
  });
}

// ── Partículas de polvo ────────────────────────────

function mkDust() {
  const count  = 280;
  const pos    = new Float32Array(count * 3);
  const speeds = new Float32Array(count);   // velocidad individual

  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 10;   // X
    pos[i*3+1] = Math.random() * 5;             // Y
    pos[i*3+2] = (Math.random() - 0.5) * 4;    // Z
    speeds[i]  = 0.004 + Math.random() * 0.006;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.userData.speeds = speeds;

  const mat = new THREE.PointsMaterial({
    color: 0xd4c4a0, size: 0.018,
    transparent: true, opacity: 0.35,
    sizeAttenuation: true,
    depthWrite: false,
  });

  dustParticles = new THREE.Points(geo, mat);
  sc.add(dustParticles);
}

/** Mueve las partículas de polvo. Llamada desde tick() */
function animateDust(t) {
  if (!dustParticles) return;
  const pos    = dustParticles.geometry.attributes.position;
  const speeds = dustParticles.geometry.userData.speeds;
  const n      = pos.count;

  for (let i = 0; i < n; i++) {
    // Deriva suave en Y + leve ondulación en X/Z
    pos.setY(i, pos.getY(i) + speeds[i]);
    pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * 0.0008);

    // Reiniciar partícula cuando sale por arriba
    if (pos.getY(i) > 5.5) {
      pos.setY(i, -0.2);
      pos.setX(i, (Math.random() - 0.5) * 10);
      pos.setZ(i, (Math.random() - 0.5) * 4);
    }
  }
  pos.needsUpdate = true;
}

// ── Modo día/noche ─────────────────────────────────

var DAY_CONFIG = {
  bg:  0x1a1830, fog: 0x1a1830,
  ambient: { color: 0x7060a8, intensity: 2.2 },
  main:    { color: 0xfff5e0, intensity: 5.5, pos: [-0.5, 7, 5] },
  fill:    { color: 0xffeedd, intensity: 2.5, pos: [6, 3.5, 5] },
  rim:     { color: 0x9999ff, intensity: 1.0, pos: [-4, 2, -2] },
  dust:    0.55,
};
var NIGHT_CONFIG = {
  bg:  0x090810, fog: 0x090810,
  ambient: { color: 0x1a1025, intensity: 1.5 },
  main:    { color: 0xffd090, intensity: 3.5, pos: [-0.5, 7, 5] },
  fill:    { color: 0xff9944, intensity: 1.8, pos: [6, 3.5, 5] },
  rim:     { color: 0x334488, intensity: 1.2, pos: [-4, 2, -2] },
  dust:    0.35,
};

var _scLights = [];   // [ambient, main, fill, rim] referencias

/** Guarda referencias a las luces de la escena tras mkLights() */
function captureLights() {
  _scLights = [];
  sc.traverse(o => {
    if (o.isLight) _scLights.push(o);
  });
}

function toggleDayNight() {
  isNight = !isNight;
  applyLightConfig(isNight ? NIGHT_CONFIG : DAY_CONFIG);

  const btn = document.getElementById('btn-daynight');
  btn.textContent = isNight ? '☀️ Día' : '🌙 Noche';

  // Cambiar fondo/niebla de la escena activa
  const st = CASE_STYLES[currentCase];
  if (isNight) {
    sc.background = new THREE.Color(st.bg);
    sc.fog = new THREE.FogExp2(st.fog, 0.028);
  } else {
    sc.background = new THREE.Color(DAY_CONFIG.bg);
    sc.fog = new THREE.FogExp2(DAY_CONFIG.fog, 0.025);
  }

  markShadowDirty();
}

function applyLightConfig(cfg) {
  if (!_scLights.length) return;
  // Orden: HemisphereLight, AmbientLight, PointLight×3
  _scLights.forEach(l => {
    if (l.isAmbientLight) {
      l.color.set(cfg.ambient.color);
      l.intensity = cfg.ambient.intensity;
    }
    if (l.isPointLight) {
      const d = Math.round(l.position.distanceTo(new THREE.Vector3(...cfg.main.pos)));
      if (d < 2) {
        l.color.set(cfg.main.color); l.intensity = cfg.main.intensity;
      } else if (l.position.x > 4) {
        l.color.set(cfg.fill.color); l.intensity = cfg.fill.intensity;
      } else {
        l.color.set(cfg.rim.color);  l.intensity = cfg.rim.intensity;
      }
    }
  });
  if (dustParticles) dustParticles.material.opacity = cfg.dust;
}

/** Punto de entrada: inicializa todo. Llamar tras mkLights() en initScene. */
function initAtmosphere() {
  captureLights();
  mkDust();
}