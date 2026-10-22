## Idioma y nombres de variables

- La interfaz, los mensajes, las notificaciones y los reportes se muestran en español.
- Los nombres internos del modelo y de la API usan identificadores técnicos estables. Para las lecturas: `humidity` (Humedad), `ph` (pH), `salinity` (Salinidad), `soilTemp` (Temperatura del suelo) y `ambientTemp` (Temperatura ambiente).
- El dashboard presenta una tarjeta KPI para cada una de esas cinco variables.

## 9. 🛠️ Stack Tecnológico (Propuesto)

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript, Vite, TailwindCSS, Recharts (gráficos), React-Konva o HTML5 Canvas (mapa), React Router, Axios, React Query |
| **Backend** | Node.js 20 + Express (o NestJS), TypeScript, JWT + bcrypt, Zod (validación), Nodemailer (email), PDFKit / ExcelJS (reportes) |
| **Base de Datos** | PostgreSQL 15 + Prisma ORM |
| **Tiempo real** | WebSockets (Socket.io) para actualización de indicadores |
| **Autenticación** | JWT + refresh tokens, RBAC, 2FA opcional (Speakeasy) |
| **Testing** | Jest + Supertest (backend), Vitest + Testing Library (frontend) |
| **DevOps** | Docker + Docker Compose, GitHub Actions (CI/CD) |
| **Documentación** | Swagger/OpenAPI |

---

## 10. 🏗️ Modelo de Arquitectura

**Arquitectura en Capas (Clean Architecture simplificada) + MVC en backend:**

```
┌─────────────────────────────────────────┐
│  PRESENTACIÓN (React SPA)               │
│  Componentes, páginas, hooks, estado    │
├─────────────────────────────────────────┤
│  API / CONTROLADORES (Express Routers)  │
│  Validación, auth, serialización        │
├─────────────────────────────────────────┤
│  SERVICIOS (Lógica de negocio)          │
│  Motor de alertas, reportes, reglas     │
├─────────────────────────────────────────┤
│  REPOSITORIOS (Prisma)                  │
│  Acceso a datos, queries                │
├─────────────────────────────────────────┤
│  BASE DE DATOS (PostgreSQL)             │
└─────────────────────────────────────────┘
```

**Flujo:** SPA → API REST (JWT) → Controladores → Servicios → Repositorios → DB. WebSockets para push de lecturas y alertas. Integración sensores vía endpoint `/api/ingest` (API key).

El dashboard protegido se consulta en `GET /api/dashboard?nodeId=&cropId=&period=24h|7d|30d`. Calcula KPIs con las últimas lecturas por nodo, estado del semáforo con alertas no cerradas, conteo de alertas activas y series agrupadas por periodo. La ingesta emite `reading:new`, `alert:new` y `dashboard:update` a las sesiones autenticadas para refrescar sus vistas.

**Patrones:** MVC en backend, Repository, Service Layer, DTOs, RBAC middleware, Observer (alertas).

---

## 11. 📁 Estructura de Carpetas Propuesta

```
agrosense/
├── docker-compose.yml
├── README.md
├── .env.example
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── index.ts
│       ├── config/            # env, db, mail, jwt
│       ├── middlewares/       # auth, rbac, errorHandler, validate
│       ├── controllers/       # auth, users, nodes, crops, states, alerts, history, reports, dashboard, config
│       ├── services/          # lógica de negocio (alertEngine, reportService, nodeService...)
│       ├── repositories/      # acceso a datos por entidad
│       ├── routes/            # definición de endpoints
│       ├── models/            # DTOs y tipos
│       ├── utils/             # helpers, logger, pdf, excel
│       ├── sockets/           # Socket.io handlers
│       └── tests/
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/               # axios client, endpoints
        ├── context/           # AuthContext, AlertContext
        ├── hooks/             # useAuth, useNodes, useDashboard, useAlerts
        ├── components/
        │   ├── common/        # Button, Modal, Table, Badge, Semaforo
        │   ├── dashboard/     # KPICard, QuickChart, AlertSummary
        │   ├── canvas/        # TerrainCanvas, NodeMarker, Tooltip
        │   ├── nodes/         # NodeForm, NodeTable
        │   ├── crops/         # CropForm, RangeEditor
        │   ├── states/        # StateForm, Timeline
        │   ├── alerts/        # AlertList, SeverityBadge
        │   ├── history/       # HistoryChart, Filters
        │   └── reports/       # ReportBuilder, ExportButtons
        ├── pages/             # Login, Dashboard, Map, Nodes, Crops, States, Alerts, History, Reports, Config
        ├── routes/            # ProtectedRoute, RoleRoute
        ├── styles/
        ├── types/             # interfaces TS
        └── utils/
```

---

## 12. 🗄️ Modelo de Datos (Entidades Principales)

- **User** (id, email, passwordHash, name, role, active, createdAt)
- **Node** (id, deviceId, name, notes, posX, posY, cropId, stateId, samplingFreq, status, battery, lastReading, createdAt)
- **Crop** (id, name, description, rangos generales JSON por variable, createdAt)
- **CropState** (id, cropId, name, order, isActive, rangos JSON con `humidity`, `ph`, `salinity`, `soilTemp` y `ambientTemp`; cada variable contiene `min` y `max`)
- **Reading** (id, nodeId, `humidity`, `ph`, `salinity`, `soilTemp`, `ambientTemp`, timestamp)
- **Alert** (id, nodeId, variable, value, severity, status, message, createdAt, readAt)
- **AuditLog** (id, userId, action, entity, entityId, changes JSON, timestamp)
- **SystemConfig** (key, value) — umbrales, zona horaria, unidades.

---

## 13. 🔌 Endpoints Principales (API REST)

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/forgot-password
GET    /api/dashboard?nodeId=&cropId=
GET    /api/nodes
GET    /api/nodes/options
POST   /api/nodes
PUT    /api/nodes/:id
DELETE /api/nodes/:id
PATCH  /api/nodes/:id/position
PATCH  /api/nodes/:id/assign
GET    /api/crops
POST   /api/crops
PUT    /api/crops/:id
DELETE /api/crops/:id
GET    /api/crops/:id/states
POST   /api/crops/:id/states
PUT    /api/states/:id
PATCH  /api/states/:id/activate
DELETE /api/states/:id
GET    /api/alerts?nodeId=&severity=&from=&to=
PATCH  /api/alerts/:id/read
PATCH  /api/alerts/:id/close
GET    /api/history?nodeId=&variable=&from=&to=
GET    /api/reports/general?from=&to=&nodeIds=&cropIds=&sections=
GET    /api/reports/export?format=pdf|excel
POST   /api/reports/share
GET    /api/reports/share/:token     # descarga pública temporal (7 días)
GET    /api/reports/history
POST   /api/ingest          # recibe lecturas de sensores (API key)
GET    /api/config
PUT    /api/config
GET    /api/audit
```

---

## 14. ✅ Criterios de Aceptación Clave

- Login funcional con 3 roles y permisos diferenciados.
- Dashboard muestra 5 KPIs por nodo — Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente — y semáforo en ≤ 5 s.
- Canvas permite drag & drop y persiste posición.
- Motor de alertas genera alertas al salirse de rango del estado vigente.
- Historial filtrable por fecha/variable/nodo con gráficos interactivos.
- Reportes exportables en PDF y Excel con filtros aplicados.
- Cobertura de tests ≥ 70% en servicios críticos.
- Aplicación responsive funcional en Chrome, Firefox, Edge y móvil.

---
