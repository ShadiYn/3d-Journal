require('dotenv').config();
const express = require('express');
const { connectDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS manual — más fiable que el paquete cors ──
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '2mb' }));

app.use(function(req, res, next) {
  console.log('[req]', req.method, req.path);
  next();
});

// ── Rutas públicas ─────────────────────────────────
app.post('/api/auth/register', require('./routes/auth').register);
app.post('/api/auth/login',    require('./routes/auth').login);
app.get('/health', function(req, res) { res.json({ ok: true }); });
app.use('/api/cover-color', require('./routes/cover'));

// ── Rutas protegidas ───────────────────────────────
app.use('/api/sync', require('./routes/sync'));

connectDB().then(function() {
  app.listen(PORT, function() {
    console.log('🚀 BookJar backend en http://localhost:' + PORT);
  });
});