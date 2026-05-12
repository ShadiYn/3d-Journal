const express = require('express');
const jwt     = require('jsonwebtoken');
const { Library } = require('../db');

const router = express.Router();

// ── Middleware JWT ─────────────────────────────────
function authMw(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = header.slice(7);
  try {
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    req.userId     = payload.userId;
    req.username   = payload.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

router.use(authMw);

// ── GET /api/sync ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let lib = await Library.findOne({ userId: req.userId });
    if (!lib) lib = await Library.create({ userId: req.userId });
    res.json({
      updatedAt:   lib.updatedAt,
      cases:       lib.cases       || {},
      decors:      lib.decors      || {},
      unlocked:    lib.unlocked    || [0],
      currentCase: lib.currentCase ?? 0,
      jarType:     lib.jarType     || 'cristal',
    });
  } catch (err) {
    console.error('sync GET:', err);
    res.status(500).json({ error: 'Error leyendo biblioteca' });
  }
});

// ── PUT /api/sync ──────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { updatedAt, cases, decors, unlocked, currentCase, jarType } = req.body;

    const existing = await Library.findOne({ userId: req.userId });
    if (existing && existing.updatedAt > updatedAt) {
      return res.status(409).json({
        conflict: true,
        data: {
          updatedAt:   existing.updatedAt,
          cases:       existing.cases,
          decors:      existing.decors,
          unlocked:    existing.unlocked,
          currentCase: existing.currentCase,
          jarType:     existing.jarType,
        }
      });
    }

    const updated = await Library.findOneAndUpdate(
      { userId: req.userId },
      { $set: { updatedAt, cases, decors, unlocked, currentCase, jarType } },
      { new: true, upsert: true }
    );

    res.json({ ok: true, updatedAt: updated.updatedAt });
  } catch (err) {
    console.error('sync PUT:', err);
    res.status(500).json({ error: 'Error guardando biblioteca' });
  }
});

module.exports = router;