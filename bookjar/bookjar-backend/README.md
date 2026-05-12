# BookJar Backend

Node.js + Express + MongoDB. Sincronización de biblioteca entre dispositivos.

## Setup local (5 minutos)

### 1 — Instalar dependencias
```bash
cd bookjar-backend
npm install
```

### 2 — MongoDB Atlas (gratis)
1. Ve a [cloud.mongodb.com](https://cloud.mongodb.com) → crea cuenta gratis
2. Crea un cluster **M0 Free**
3. Database Access → Add user → crea usuario y contraseña
4. Network Access → Add IP → **Allow from anywhere** (`0.0.0.0/0`)
5. Connect → Drivers → copia el connection string

### 3 — Variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y rellena:
- `MONGODB_URI` — el connection string de Atlas (con tu usuario y contraseña)
- `JWT_SECRET` — genera uno con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 4 — Arrancar
```bash
npm run dev    # desarrollo (auto-reload)
npm start      # producción
```

El servidor arranca en `http://localhost:3001`

---

## Despliegue en Railway (gratis, recomendado)

1. Sube el backend a un repositorio de GitHub
2. Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Selecciona el repositorio
4. Variables → añade `MONGODB_URI`, `JWT_SECRET` y `ALLOWED_ORIGIN` (la URL de tu frontend)
5. Railway detecta el `package.json` y despliega automáticamente

Railway da **500 horas gratis al mes** — suficiente para uso personal.

---

## API Reference

### Auth
| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{username, password}` | Crear cuenta |
| POST | `/api/auth/login` | `{username, password}` | Iniciar sesión → devuelve JWT |

### Sync (requiere `Authorization: Bearer <token>`)
| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| GET | `/api/sync` | — | Leer biblioteca completa |
| PUT | `/api/sync` | `{updatedAt, cases, decors, unlocked, currentCase, jarType}` | Guardar biblioteca |

### Conflict resolution
Si el servidor tiene datos más recientes que el cliente, `PUT /api/sync` devuelve `409` con los datos del servidor. El cliente debe decidir si sobreescribir local o no.

---

## Estructura
```
bookjar-backend/
├── server.js          ← entrada principal
├── db.js              ← modelos Mongoose (User, Library)
├── routes/
│   ├── auth.js        ← register + login
│   └── sync.js        ← GET + PUT biblioteca
├── middleware/
│   └── auth.js        ← verificación JWT
├── package.json
└── .env.example
```
