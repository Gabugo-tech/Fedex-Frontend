# PulsTrack — Package Tracking Platform

A production-ready package tracking web app built with a modern fullstack architecture.

## Stack

| Layer    | Technology              | Hosting  |
|----------|-------------------------|----------|
| Frontend | React 18 + Vite         | Vercel   |
| Backend  | Node.js + Express       | Render   |
| Database | PostgreSQL              | Supabase |
| Maps     | Leaflet + OpenStreetMap | CDN      |
| Auth     | Supabase Auth           | —        |

---

## Project Structure

```
pulstrack/
├── frontend/                      # React + Vite app
│   ├── src/
│   │   ├── api/
│   │   │   ├── tracking.js        # Public tracking API calls
│   │   │   ├── admin.js           # Admin CRUD API calls
│   │   │   └── auth.js            # Supabase auth (sign in/out/session)
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── TrackingMap.jsx
│   │   │   └── Footer.jsx
│   │   ├── pages/
│   │   │   └── AdminDashboard.jsx
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── vercel.json
│   └── package.json
│
├── backend/                       # Express REST API
│   ├── src/
│   │   ├── db/
│   │   │   └── supabase.js
│   │   ├── middleware/
│   │   │   ├── adminAuth.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── tracking.js
│   │   │   └── admin.js
│   │   └── index.js
│   ├── .env.example
│   └── render.yaml
│
└── database/
    └── schema.sql
```

---

## API Endpoints

### Public
| Method | Endpoint                          | Description            |
|--------|-----------------------------------|------------------------|
| GET    | `/health`                         | Health check           |
| GET    | `/api/track?numbers=PLT-2026-XXX` | Track up to 5 packages |

### Admin (Bearer token required)
| Method | Endpoint                              | Description            |
|--------|---------------------------------------|------------------------|
| GET    | `/api/admin/shipments`                | List all shipments     |
| GET    | `/api/admin/shipments/:id`            | Get shipment + events  |
| POST   | `/api/admin/shipments`                | Create shipment        |
| PUT    | `/api/admin/shipments/:id`            | Update shipment        |
| DELETE | `/api/admin/shipments/:id`            | Delete shipment        |
| PUT    | `/api/admin/shipments/:id/location`   | Update live map pin    |
| POST   | `/api/admin/shipments/:id/events`     | Add tracking event     |
| DELETE | `/api/admin/events/:id`               | Delete tracking event  |

---

## Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=https://your-app.vercel.app
ADMIN_EMAIL=your-admin@email.com
PORT=4000
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## Deployment

### 1. Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Run `database/schema.sql` in the SQL Editor
3. Add admin user under Authentication → Users
4. Copy Project URL and keys

### 2. Render (Backend)
1. New Web Service → connect your backend repo
2. Build: `npm install` | Start: `npm start` | Runtime: Node
3. Add environment variables and deploy

### 3. Vercel (Frontend)
1. New Project → import your frontend repo
2. Framework: Vite
3. Add environment variables and deploy
