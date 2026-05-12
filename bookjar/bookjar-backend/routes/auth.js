const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { User, Library } = require('../db');

// ── POST /api/auth/register ────────────────────────
async function register(req, res) {
  try {
    const { username, password } = req.body;
    console.log('[register] username:', username);

    if (!username || !password)
      return res.status(400).json({ error: 'Rellena todos los campos' });
    if (password.length < 4)
      return res.status(400).json({ error: 'Contraseña mínimo 4 caracteres' });

    const exists = await User.findOne({ username });
    if (exists)
      return res.status(409).json({ error: 'Ese nombre ya existe' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });
    await Library.create({ userId: user._id });

    const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('[register] OK para', username);
    res.status(201).json({ token, username });
  } catch (err) {
    console.error('[register] error:', err);
    // Error de validación de Mongoose → devolver mensaje legible
    if (err.name === 'ValidationError') {
      var msg = Object.values(err.errors).map(function(e) { return e.message; }).join(', ');
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// ── POST /api/auth/login ───────────────────────────
async function login(req, res) {
  try {
    const { username, password } = req.body;
    console.log('[login] username:', username);

    if (!username || !password)
      return res.status(400).json({ error: 'Rellena todos los campos' });

    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('[login] OK para', username);
    res.json({ token, username });
  } catch (err) {
    console.error('[login] error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { register, login };