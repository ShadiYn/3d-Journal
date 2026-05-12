const mongoose = require('mongoose');

// ── Esquemas ───────────────────────────────────────

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
  password: { type: String, required: true },   // bcrypt hash
  createdAt: { type: Date, default: Date.now },
});

// Un documento de datos por usuario — almacena toda la biblioteca
const LibrarySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  updatedAt:   { type: Number, default: 0 },   // timestamp ms para resolver conflictos
  cases:       { type: mongoose.Schema.Types.Mixed, default: {} },   // { "0": [...books], "1": [...] }
  decors:      { type: mongoose.Schema.Types.Mixed, default: {} },   // { "0": [...decors], "1": [...] }
  unlocked:    { type: [Number], default: [0] },
  currentCase: { type: Number, default: 0 },
  jarType:     { type: String, default: 'cristal' },
});

const User    = mongoose.model('User',    UserSchema);
const Library = mongoose.model('Library', LibrarySchema);

// ── Conexión ───────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, User, Library };
