const express = require('express');
const https   = require('https');
const http    = require('http');
const sharp   = require('sharp');
const router  = express.Router();

// GET /api/cover-color?coverId=12345
router.get('/', async (req, res) => {
  const { coverId } = req.query;
  if (!coverId) return res.status(400).json({ error: 'coverId requerido' });

  const url = 'https://covers.openlibrary.org/b/id/' + coverId + '-M.jpg';
  console.log('[cover] descargando', url);

  try {
    const buf = await fetchWithRedirects(url);
    console.log('[cover] buffer recibido, tamaño:', buf.length);

    const { data } = await sharp(buf)
      .resize(10, 16)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    var rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (var i = 0; i < data.length; i += 3) {
      var r = data[i], g = data[i+1], b = data[i+2];
      var brightness = (r + g + b) / 3;
      if (brightness < 25 || brightness > 230) continue;
      rSum += r; gSum += g; bSum += b; count++;
    }

    if (count === 0) return res.json({ color: '#c0392b' });

    var hex = saturate(
      Math.round(rSum / count),
      Math.round(gSum / count),
      Math.round(bSum / count)
    );
    console.log('[cover] color extraído:', hex);
    res.json({ color: hex });

  } catch (err) {
    console.error('[cover] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Fetch con soporte de redirects (hasta 5 saltos)
function fetchWithRedirects(url, redirects) {
  redirects = redirects || 0;
  if (redirects > 5) return Promise.reject(new Error('Demasiados redirects'));

  return new Promise(function(resolve, reject) {
    var lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'BookJar/1.0' } }, function(resp) {
      // Seguir redirect
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        var next = resp.headers.location;
        // Resolver URL relativa si hace falta
        if (next.startsWith('/')) {
          var base = new URL(url);
          next = base.protocol + '//' + base.host + next;
        }
        console.log('[cover] redirect →', next);
        resp.resume();
        return resolve(fetchWithRedirects(next, redirects + 1));
      }
      if (resp.statusCode !== 200) {
        resp.resume();
        return reject(new Error('HTTP ' + resp.statusCode + ' para ' + url));
      }
      var chunks = [];
      resp.on('data', function(c) { chunks.push(c); });
      resp.on('end',  function()  { resolve(Buffer.concat(chunks)); });
      resp.on('error', reject);
    }).on('error', reject);
  });
}

// Saturar RGB → hex
function saturate(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  s = Math.min(1, s * 1.8 + 0.15);
  l = Math.max(0.22, Math.min(0.52, l));
  return hslToHex(h, s, l);
}

function hslToHex(h, s, l) {
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p = 2 * l - q;
  return '#' + [h + 1/3, h, h - 1/3].map(function(t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    var v = t < 1/6 ? p+(q-p)*6*t : t < 1/2 ? q : t < 2/3 ? p+(q-p)*(2/3-t)*6 : p;
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('');
}

module.exports = router;