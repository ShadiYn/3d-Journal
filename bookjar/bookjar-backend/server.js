require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { connectDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware global ──────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '2mb' }));

// Log de cada petición para debug
app.use(function(req, res, next) {
  console.log('[req]', req.method, req.path);
  next();
});

// ── Rutas públicas (sin JWT) ───────────────────────
app.post('/api/auth/register', require('./routes/auth').register);
app.post('/api/auth/login',    require('./routes/auth').login);
app.get('/health', function(req, res) { res.json({ ok: true }); });

// ── Ruta pública: color de portada ───────────────────
app.use('/api/cover-color', require('./routes/cover'));

// ── Rutas protegidas (con JWT) ─────────────────────
app.use('/api/sync', require('./routes/sync'));

connectDB().then(function() {
  app.listen(PORT, function() {
    console.log('🚀 BookJar backend en http://localhost:' + PORT);
  });
});