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




var _lampOn    = false;
var _lampLight = null;   // PointLight de la lámpara

/** Guarda referencias a las luces de la escena tras mkLights() */






/** Punto de entrada: inicializa todo. Llamar tras mkLights() en initScene. */
function initAtmosphere() {
  mkDust();
}

// ── Lámpara de escritorio ──────────────────────────

function toggleLamp() {
  _lampOn = !_lampOn;
  if (_lampLight) {
    _lampLight.intensity = _lampOn ? 1.4 : 0;
  }
  var btn = document.getElementById('btn-lamp');
  if (btn) btn.textContent = _lampOn ? '💡' : '🔦';
  markShadowDirty();
}

/** Registra la luz de la lámpara para poder controlarla */
function registerLampLight(light) {
  _lampLight = light;
  _lampLight.intensity = 0;   // apagada por defecto
}