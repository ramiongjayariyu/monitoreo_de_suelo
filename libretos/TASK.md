#  Plan de Tareas por Fases

**Convención de estados:** `[ ]` Pendiente · `[x]` Completada
**Convención de IDs:** `F{fase}-T{tarea}` (ej: F0-T01)

---

## 🚀 FASE 0 — Preparación del Entorno y Conexiones

**Objetivo:** Dejar lista la base técnica, dependencias, configuración y conexiones (DB, email, WebSocket) antes de escribir lógica de negocio.

### 0.1 Estructura y repositorio
- [x] **F0-T01** — Crear repositorio monorepo `agrosense/` con carpetas `backend/` y `frontend/`.
- [x] **F0-T02** — Inicializar Git con `.gitignore` (node_modules, .env, dist, build, coverage).
- [x] **F0-T03** — Crear `README.md` raíz en español con instrucciones de instalación y arranque.
- [x] **F0-T04** — Crear `.env.example` con todas las variables (DB, JWT, SMTP, API_KEY, PORT, etc.).

### 0.2 Backend — instalación y base
- [x] **F0-T05** — `npm init -y` en `backend/` e instalar: `express`, `typescript`, `ts-node`, `tsx`, `@types/node`, `@types/express`, `dotenv`, `cors`, `helmet`, `morgan`.
- [x] **F0-T06** — Instalar: `prisma`, `@prisma/client`, `bcrypt`, `jsonwebtoken`, `zod`, `nodemailer`, `socket.io`, `pdfkit`, `exceljs`, `speakeasy`, `qrcode`.
- [x] **F0-T07** — Instalar dev: `jest`, `ts-jest`, `supertest`, `@types/jest`, `@types/supertest`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/nodemailer`, `@types/pdfkit`, `eslint`, `prettier`.
- [x] **F0-T08** — Configurar `tsconfig.json` (strict, paths `@/*`), `.eslintrc`, `.prettierrc`.
- [x] **F0-T09** — Crear estructura de carpetas backend (`src/config`, `middlewares`, `controllers`, `services`, `repositories`, `routes`, `models`, `utils`, `sockets`, `tests`).
- [x] **F0-T10** — Configurar scripts `package.json`: `dev`, `build`, `start`, `test`, `prisma:migrate`, `prisma:seed`.

### 0.3 Base de datos
- [x] **F0-T11** — Levantar PostgreSQL 15 (Docker o local) y crear DB `agrosense`.
- [x] **F0-T12** — Configurar `DATABASE_URL` en `.env`.
- [x] **F0-T13** — Inicializar Prisma (`npx prisma init`).
- [x] **F0-T14** — Definir schema Prisma completo (User, Node, Crop, CropState, Reading, Alert, AuditLog, SystemConfig) con relaciones y enums.
- [x] **F0-T15** — Ejecutar migración inicial (`prisma migrate dev --name init`).
- [x] **F0-T16** — Crear `seed.ts` con: 1 admin, 1 operador, 1 consulta, 2 cultivos demo (maíz, tomate) con 4 estados cada uno, 3 nodos demo, config inicial.
- [x] **F0-T17** — Ejecutar seed y verificar datos en DB.

### 0.4 Frontend — instalación y base
- [x] **F0-T18** — Crear proyecto Vite React TS en `frontend/` (`npm create vite@latest`).
- [x] **F0-T19** — Instalar: `react-router-dom`, `axios`, `@tanstack/react-query`, `socket.io-client`, `recharts`, `lucide-react`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `clsx`, `tailwind-merge`.
- [x] **F0-T20** — Instalar y configurar TailwindCSS + PostCSS + Autoprefixer.
- [x] **F0-T21** — Configurar `tailwind.config.ts` con todos los tokens de diseño (colores, fuentes, radios, sombras, spacing, breakpoints).
- [x] **F0-T22** — Crear `src/styles/globals.css` con variables CSS `:root` (sección 15 de `DESIGN.md`) e importar fuentes Plus Jakarta Sans, Inter, JetBrains Mono (Google Fonts).
- [x] **F0-T23** — Configurar `vite.config.ts` con alias `@/` y proxy a `http://localhost:4000`.
- [x] **F0-T24** — Crear estructura de carpetas frontend (`api`, `context`, `hooks`, `components`, `pages`, `routes`, `styles`, `types`, `utils`).

### 0.5 Conexiones y servicios
- [x] **F0-T25** — Configurar `src/config/env.ts` backend validando variables con Zod.
- [x] **F0-T26** — Configurar `src/config/db.ts` (PrismaClient singleton).
- [ ] **F0-T27** — Configurar `src/config/mail.ts` (Nodemailer transporter con SMTP de prueba, ej. Mailtrap/Ethereal). Aplazado por decisión del usuario: el correo no se usará por ahora; el transporter queda preparado para configuración SMTP posterior.
- [x] **F0-T28** — Configurar `src/config/jwt.ts` (secreto, expiraciones access/refresh).
- [x] **F0-T29** — Configurar `src/config/cors.ts` (origen frontend).
- [x] **F0-T30** — Crear `src/index.ts`: Express + helmet + cors + morgan + json + rutas base + Socket.io + manejo de errores global.
- [x] **F0-T31** — Crear `src/sockets/index.ts` con conexión Socket.io básica (join room por usuario).
- [x] **F0-T32** — Endpoint `GET /api/health` que verifique DB y devuelva `{ status: 'ok' }`.
- [x] **F0-T33** — Crear cliente Axios en `frontend/src/api/client.ts` con baseURL, interceptor JWT, manejo 401.
- [x] **F0-T34** — Crear cliente Socket.io en `frontend/src/api/socket.ts`.
- [x] **F0-T35** — Configurar `docker-compose.yml` con servicios `postgres` y `pgadmin` (opcional).
- [x] **F0-T36** — Verificar arranque completo: backend en `:4000`, frontend en `:5173`, DB conectada, health check OK.

**✅ Criterio de cierre Fase 0:** `npm run dev` en ambos levanta sin errores; `/api/health` responde OK; migración + seed aplicados; Tailwind con tokens funcionando.

---

## 🎨 FASE 1 — Design System y Componentes Base

**Objetivo:** Construir la librería de componentes reutilizables y el layout general antes de las pantallas.

### 1.1 Utilidades frontend
- [x] **F1-T01** — Crear `utils/cn.ts` (clsx + tailwind-merge).
- [x] **F1-T02** — Crear `utils/formatters.ts` (fechas con date-fns, números, unidades).
- [x] **F1-T03** — Crear `types/index.ts` con interfaces TS de todas las entidades (User, Node, Crop, CropState, Reading, Alert, etc.).

### 1.2 Componentes base
- [x] **F1-T04** — `Button` (variantes primary/secondary/danger/ghost/disabled, tamaños sm/md/lg, loading).
- [x] **F1-T05** — `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Toggle` con estados (default/focus/error/disabled).
- [x] **F1-T06** — `Label`, `FormField` (label + input + mensaje error).
- [x] **F1-T07** — `Card` (con header opcional y acciones).
- [x] **F1-T08** — `Badge` / `Pill` (variantes success/warning/danger/info/neutral).
- [x] **F1-T09** — `Table` (header, filas, hover, paginación, ordenamiento, estado vacío, skeleton).
- [x] **F1-T10** — `Modal` (overlay, header, footer, cierre Esc, focus trap).
- [x] **F1-T11** — `Toast` + `ToastProvider` (4 tipos, auto-dismiss, apilables).
- [x] **F1-T12** — `Tooltip`.
- [x] **F1-T13** — `Skeleton` (variantes text/card/table).
- [x] **F1-T14** — `EmptyState` (icono + mensaje + CTA).
- [x] **F1-T15** — `Spinner` y `LoadingButton`.
- [x] **F1-T16** — `Semaphore` (círculo + label, 4 estados).
- [x] **F1-T17** — `DatePicker` y `DateRangePicker`.
- [x] **F1-T18** — `MultiSelect` con búsqueda.
- [x] **F1-T19** — `ConfirmDialog` (wrapper de Modal para acciones destructivas).
- [x] **F1-T20** — `PageHeader` (título + breadcrumb + acciones).
- [x] **F1-T21** — `Tabs`.

### 1.3 Layout
- [x] **F1-T22** — `Header` (logo, breadcrumb, AlertBell placeholder, avatar dropdown).
- [x] **F1-T23** — `Sidebar` (items con iconos, activo, colapsable, badge alertas, drawer móvil).
- [x] **F1-T24** — `AppLayout` (Header + Sidebar + content area responsive).
- [x] **F1-T25** — `AuthLayout` (split login/ilustración).

### 1.4 Gráficos
- [x] **F1-T26** — `LineChart` reutilizable (Recharts, colores por variable, tooltip, leyenda, responsive).
- [x] **F1-T27** — `Sparkline` (mini gráfico para KPIs).
- [x] **F1-T28** — `ScatterChart` (correlaciones).
- [x] **F1-T29** — `KPICard` (icono, label, valor mono, delta, sparkline).

### 1.5 Canvas
- [x] **F1-T30** — `TerrainCanvas` base (grid, zoom, capas toggle).
- [x] **F1-T31** — `NodeMarker` (círculo color estado, label, drag & drop, selección).
- [x] **F1-T32** — `NodePopup` (card flotante con 5 lecturas + acciones).

**✅ Criterio de cierre Fase 1:** Página demo `/dev/components` en español mostrando todos los componentes en todos sus estados; layout navegable con sidebar funcional.

---

## 🔐 FASE 2 — Autenticación y Usuarios (F-01 a F-06)

### 2.1 Backend
- [x] **F2-T01** — `UserRepository` (findByEmail, create, update, deactivate, list).
- [x] **F2-T02** — `AuthService` (login, refresh, logout, forgotPassword, resetPassword, hash con bcrypt).
- [x] **F2-T03** — `UserService` (CRUD, solo Admin).
- [x] **F2-T04** — Middleware `authenticate` (verifica JWT access).
- [x] **F2-T05** — Middleware `authorize(roles[])` (RBAC).
- [x] **F2-T06** — Middleware `validate(schema)` con Zod.
- [x] **F2-T07** — `AuthController` + `authRoutes`: `POST /login`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`.
- [x] **F2-T08** — `UserController` + `userRoutes`: `GET/POST/PUT/DELETE /users` (Admin).
- [ ] **F2-T09** — Servicio email para recuperación de contraseña (plantilla HTML). Plantilla y envío implementados; entrega SMTP pendiente por decisión del usuario.
- [x] **F2-T10** — 2FA opcional: `POST /auth/2fa/setup`, `POST /auth/2fa/verify`, `POST /auth/2fa/disable`.
- [x] **F2-T11** — Tests: login OK/fail, refresh, RBAC, forgot password.

### 2.2 Frontend
- [x] **F2-T12** — `AuthContext` (user, login, logout, refresh, persistencia localStorage).
- [x] **F2-T13** — `useAuth` hook.
- [x] **F2-T14** — `LoginPage` (form email/password, validación, error, toggle ver).
- [x] **F2-T15** — `ForgotPasswordPage` y `ResetPasswordPage` (entrega real condicionada a SMTP).
- [x] **F2-T16** — `ProtectedRoute` y `RoleRoute` (redirección por rol).
- [x] **F2-T17** — `UsersPage` (tabla, modal crear/editar, toggle activo, solo Admin).
- [x] **F2-T18** — `ProfilePage` (editar datos, cambiar contraseña, 2FA con QR).
- [x] **F2-T19** — Logout con expiración por inactividad (timer + modal aviso).

**Criterio de cierre Fase 2:** Autenticación, roles, rutas protegidas, CRUD de usuarios, perfil, 2FA y expiración por inactividad validados. La entrega de recuperación por correo queda aplazada hasta configurar SMTP (F2-T09); sin SMTP, la API informa el estado de forma explícita.

---

## 🔌 FASE 3 — Gestión de Nodos (F-18 a F-23)

### 3.1 Backend
- [x] **F3-T01** — `NodeRepository` (CRUD, findByCrop, updatePosition, updateStatus).
- [x] **F3-T02** — `NodeService` (crear, editar, eliminar con validación dependencias, asignar cultivo/estado, listar con filtros, estado conexión/batería).
- [x] **F3-T03** — `NodeController` + `nodeRoutes`: `GET /nodes`, `POST /nodes`, `PUT /nodes/:id`, `DELETE /nodes/:id`, `PATCH /nodes/:id/position`, `PATCH /nodes/:id/assign`.
- [x] **F3-T04** — Validaciones Zod (nombre requerido, posición numérica, cultivo/estado existentes).
- [x] **F3-T05** — Auditoría en CRUD de nodos.
- [x] **F3-T06** — Tests: CRUD, validaciones, filtros, reubicación.

### 3.2 Frontend
- [x] **F3-T07** — `useNodes` hook (React Query: list, create, update, delete, updatePosition).
- [x] **F3-T08** — `NodesPage` (header + filtros búsqueda/cultivo/conexión + tabla).
- [x] **F3-T09** — `NodeForm` modal (nombre, ID, cultivo, estado filtrado, posición x/y, frecuencia, notas).
- [x] **F3-T10** — `NodeDetailDrawer` o página (estado conexión, batería, última lectura, lecturas actuales).
- [x] **F3-T11** — `ConfirmDialog` eliminar nodo con advertencia dependencias.
- [x] **F3-T12** — Toggle online/offline visual (badge + barra batería).

**✅ Criterio de cierre Fase 3:** CRUD de nodos completo desde UI, posición persistida, filtros funcionales, validación de dependencias al eliminar. Verificado con build y lint de ambas aplicaciones y 9 pruebas de integración backend (nodos y autenticación).

---

## 🌾 FASE 4 — Gestión de Cultivos (F-24 a F-28)

### 4.1 Backend
- [x] **F4-T01** — `CropRepository` (CRUD, countNodes, countStates).
- [x] **F4-T02** — `CropService` (crear con rangos, editar, eliminar con validación de dependencias, listar).
- [x] **F4-T03** — `CropController` + `cropRoutes`: `GET/POST/PUT/DELETE /crops`.
- [x] **F4-T04** — Validación Zod: rangos min < max por cada variable.
- [x] **F4-T05** — Auditoría en CRUD de cultivos.
- [x] **F4-T06** — Tests: CRUD, validación rangos, bloqueo eliminación con dependencias.

### 4.2 Frontend
- [x] **F4-T07** — `useCrops` hook (React Query).
- [x] **F4-T08** — `CropsPage` (grid de cards con nombre, descripción, # estados, # nodos, acciones).
- [x] **F4-T09** — `CropForm` modal (nombre, descripción, `RangeEditor`).
- [x] **F4-T10** — `RangeEditor` componente (5 filas: Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente; cada una con mínimo, máximo, unidad e icono de color).
- [x] **F4-T11** — Eliminar cultivo con `ConfirmDialog` y bloqueo si dependencias.

**✅ Criterio de cierre Fase 4:** CRUD de cultivos con editor de cinco rangos; bloqueo de eliminación con nodos/estados asociados. Build y lint frontend/backend pasan; esquema Prisma validado y migraciones al día; suite de integración backend pasa (12/12, incluida la fase de cultivos).

---

## 🌱 FASE 5 — Gestión de Estados del Cultivo (F-29 a F-34)

### 5.1 Backend
- [x] **F5-T01** — `CropStateRepository` (CRUD por cultivo, findVigente, activar).
- [x] **F5-T02** — `CropStateService` (crear con orden, editar, eliminar con validación, activar estado único por cultivo, listar cronológico).
- [x] **F5-T03** — Lógica: al activar un estado, desactivar los demás del mismo cultivo (transacción).
- [x] **F5-T04** — `CropStateController` + `stateRoutes`: `GET /crops/:id/states`, `POST /crops/:id/states`, `PUT /states/:id`, `PATCH /states/:id/activate`, `DELETE /states/:id`.
- [x] **F5-T05** — Validación Zod (rangos min<max, orden único por cultivo).
- [x] **F5-T06** — Tests: CRUD, activación única, bloqueo eliminación si vigente o con nodos.

### 5.2 Frontend
- [x] **F5-T07** — `useCropStates` hook.
- [x] **F5-T08** — `StatesPage` (`/crops/:id/states`): timeline horizontal + tabla.
- [x] **F5-T09** — `StateTimeline` (Gantt con estados ordenados, vigente resaltado, badge).
- [x] **F5-T10** — `StateForm` modal (nombre, orden, toggle activo, `RangeEditor` reutilizado).
- [x] **F5-T11** — Acción "Activar estado" con confirmación (reemplaza vigente).
- [x] **F5-T12** — Eliminar estado con validación visual de dependencias.

**✅ Criterio de cierre Fase 5:** CRUD de estados por cultivo, activación exclusiva protegida también por índice parcial en PostgreSQL, timeline por orden (sin fechas reales), rangos editables y eliminación bloqueada para estados vigentes o asignados a nodos. Suite backend: 14 pruebas; builds y lint de ambas aplicaciones pasan.

---

## 📥 FASE 6 — Ingesta de Lecturas y Motor de Alertas (F-35 a F-40)

### 6.1 Backend
- [x] **F6-T01** — `ReadingRepository` (create, findByNode, findByRange, latestByNode, aggregate).
- [x] **F6-T02** — `AlertRepository` (create, list con filtros, markRead, silence, close, countActive).
- [x] **F6-T03** — `AlertEngineService`: evalúa cada lectura contra rangos del estado vigente del cultivo del nodo.
- [x] **F6-T04** — Clasificación de severidad (Info/Advertencia/Crítico) según % desviación y umbrales de `SystemConfig`.
- [x] **F6-T05** — Endpoint `POST /api/ingest` (API key) que recibe lecturas, guarda y dispara `AlertEngineService`.
- [x] **F6-T06** — Emisión WebSocket `reading:new` y `alert:new` a rooms de usuarios.
- [x] **F6-T07** — `AlertService` (listar con filtros, marcar leída, silenciar, cerrar).
- [x] **F6-T08** — `AlertController` + `alertRoutes`: `GET /alerts`, `PATCH /alerts/:id/read`, `PATCH /alerts/:id/silence`, `PATCH /alerts/:id/close`.
- [ ] **F6-T09** — Notificación email opcional al generar alerta crítica (plantilla). Aplazada: el correo/SMTP no se utilizará por ahora.
- [ ] **F6-T10** — Job programado (node-cron) para simular lecturas demo cada X seg (solo dev). Pendiente: se mantiene fuera del comportamiento activo hasta decidir la simulación local.
- [x] **F6-T11** — Tests: motor de alertas (dentro/fuera de rango, severidades), ingesta, WebSocket emit.

### 6.2 Frontend
- [x] **F6-T12** — `useAlerts` hook (React Query + Socket listener para invalidar).
- [x] **F6-T13** — `AlertsPage` (filtros severidad pills, nodo, variable, fecha, estado; lista agrupada por fecha).
- [x] **F6-T14** — `AlertCard` (borde color severidad, mensaje, nodo, variable chip, timestamp, acciones).
- [x] **F6-T15** — `AlertBell` en header (badge contador, dropdown últimas 10, link ver todas).
- [x] **F6-T16** — Toasts en vivo al recibir `alert:new` vía socket.
- [x] **F6-T17** — Acciones marcar leída/silenciar/cerrar con feedback optimista.

**✅ Criterio funcional Fase 6:** Ingesta guarda lecturas; motor genera alertas con severidad correcta; WebSocket actualiza UI en vivo; acciones de alerta funcionan. T09 (email) y T10 (simulador) siguen aplazadas/pedientes por alcance.

---

## 📊 FASE 7 — Dashboard (F-07 a F-11)

### 7.1 Backend
- [x] **F7-T01** — `DashboardService`: KPIs últimos valores por nodo, semáforo general, resumen alertas, datos gráfico rápido (24h/7d/30d).
- [x] **F7-T02** — `DashboardController` + `dashboardRoutes`: `GET /dashboard?nodeId=&cropId=`.
- [x] **F7-T03** — Emisión WebSocket `dashboard:update` al recibir nueva lectura.
- [x] **F7-T04** — Tests: KPIs correctos, filtros, agregaciones.

### 7.2 Frontend
- [x] **F7-T05** — `useDashboard` hook (React Query + socket).
- [x] **F7-T06** — `DashboardPage`: filtros superiores (nodo, cultivo, refresh, indicador "En vivo").
- [x] **F7-T07** — Fila 1: 5 `KPICard`, una por variable (Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente), en grid responsive.
- [x] **F7-T08** — Fila 2: `SemaphoreCard` (semáforo grande + conteo nodos por color) + `ActiveAlertsCard` (últimas 5 alertas).
- [x] **F7-T09** — Fila 3: `QuickChartCard` (tabs 24h/7d/30d, selector variable pills, LineChart).
- [x] **F7-T10** — Auto-refresh vía socket + animación flash en KPI actualizado.
- [x] **F7-T11** — Skeletons y empty states.

**✅ Criterio de cierre Fase 7:** Dashboard muestra en español los 5 KPIs (Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente), semáforo, alertas y gráfico; se actualiza en vivo ≤ 5 s; filtros funcionan.

---

## 🗺️ FASE 8 — Mapa del Terreno Canvas (F-12 a F-17)

### 8.1 Backend
- [x] **F8-T01** — Reutilizar `PATCH /nodes/:id/position` (F3-T03) con validación de coordenadas dentro del lienzo.
- [x] **F8-T02** — `GET /nodes/map?cropId=&state=&alertLevel=` devuelve nodos con última lectura y estado calculado.
- [x] **F8-T03** — WebSocket `node:status` al cambiar estado de un nodo por nueva lectura.
- [x] **F8-T04** — Tests: endpoint mapa, filtros, cálculo estado.

### 8.2 Frontend
- [x] **F8-T05** — `useMapNodes` hook.
- [x] **F8-T06** — `MapPage`: toolbar (zoom, capas, filtros, agregar nodo) + canvas + leyenda + panel lateral colapsable.
- [x] **F8-T07** — `TerrainCanvas` completo: grid, zoom (rueda + botones), capas (cuadrícula/etiquetas/alertas), render de `NodeMarker`.
- [x] **F8-T08** — `NodeMarker` con drag & drop (react-konva o HTML5 canvas), color por estado, selección.
- [x] **F8-T09** — `NodePopup` al seleccionar (5 lecturas, timestamp, botones ver/editar).
- [x] **F8-T10** — Persistencia posición al soltar + toast "Posición actualizada".
- [x] **F8-T11** — Filtros de nodos (cultivo, estado, alerta) reflejados en canvas.
- [x] **F8-T12** — Leyenda flotante con conteos.
- [x] **F8-T13** — Actualización en vivo de colores por socket.

**✅ Criterio de cierre Fase 8:** Canvas con drag & drop persistente, zoom, capas, filtros, popup con lecturas, leyenda y actualización en vivo.

---

## 🕓 FASE 9 — Historial y Tendencias (F-41 a F-45)

### 9.1 Backend
- [x] **F9-T01** — `HistoryService`: consulta por nodo/variable/rango fechas, agregación por granularidad (hora/día/semana), comparación multi-nodo, correlación entre variables.
- [x] **F9-T02** — `HistoryController` + `historyRoutes`: `GET /history?nodeId=&variable=&from=&to=&granularity=`, `GET /history/compare?nodeIds=&variable=`, `GET /history/correlation?nodeId=&varA=&varB=`.
- [x] **F9-T03** — Tests: agregaciones, filtros fechas, comparación, correlación.

### 9.2 Frontend
- [x] **F9-T04** — `useHistory` hook.
- [x] **F9-T05** — `HistoryPage`: panel filtros (multi-select nodos, pills variable, date range, granularidad).
- [x] **F9-T06** — `HistoryChart` (líneas múltiples, leyenda interactiva, zoom arrastre, tooltip).
- [x] **F9-T07** — `CorrelationChart` (scatter toggle) entre 2 variables.
- [x] **F9-T08** — Botón "Exportar imagen" (html2canvas o canvas.toDataURL → descarga PNG).
- [x] **F9-T09** — Empty state cuando no hay datos.

**✅ Criterio de cierre Fase 9:** Historial filtrable, multi-nodo, correlación, exportación imagen, empty state.

---

## 📈 FASE 10 — Reportes (F-46 a F-50)

### 10.1 Backend
- [x] **F10-T01** — `ReportService`: consolidar resumen ejecutivo, gráficos (como imágenes), tablas de alertas y lecturas según filtros.
- [x] **F10-T02** — Generación PDF con PDFKit (portada, resumen, tablas, gráficos embebidos).
- [x] **F10-T03** — Generación Excel con ExcelJS (hojas: Resumen, Lecturas, Alertas).
- [x] **F10-T04** — `ReportController` + `reportRoutes`: `GET /reports/general?from=&to=&nodeIds=&cropIds=`, `GET /reports/export?format=pdf|excel`.
- [ ] **F10-T05** — Programación de reportes con node-cron (semanal/mensual) + envío email.
- [x] **F10-T06** — Compartir: generar token de descarga temporal `GET /reports/share/:token`.
- [ ] **F10-T07** — Tests: generación PDF/Excel, filtros, programación, token.

### 10.2 Frontend
- [x] **F10-T08** — `ReportsPage`: formulario (fechas, multi-select nodos/cultivos, checkboxes secciones) + preview + botones exportar/programar/compartir.
- [x] **F10-T09** — Descarga de archivos (blob → link temporal).
- [ ] **F10-T10** — Modal "Programar envío" (frecuencia, email, hora).
- [x] **F10-T11** — Modal "Compartir" (genera enlace copiable con expiración).
- [x] **F10-T12** — Tabla historial de reportes generados.

**✅ Criterio de cierre Fase 10:** Reportes PDF/Excel descargables con filtros; programación y compartir funcionan.

---

## ⚙️ FASE 11 — Configuración y Auditoría (F-51 a F-54)

### 11.1 Backend
- [x] **F11-T01** — `ConfigRepository` + `ConfigService` (get/update SystemConfig: umbrales severidad, frecuencia default, unidades, zona horaria).
- [x] **F11-T02** — `AuditRepository` + `AuditService` (listar con filtros y paginación).
- [x] **F11-T03** — `ConfigController` + `configRoutes`: `GET /config`, `PUT /config`.
- [x] **F11-T04** — `AuditController` + `auditRoutes`: `GET /audit?userId=&action=&entity=&from=&to=&page=`.
- [x] **F11-T05** — Middleware `auditLogger` aplicado a CRUD críticos.
- [x] **F11-T06** — Tests: config update, auditoría registra y filtra.

### 11.2 Frontend
- [x] **F11-T07** — `SettingsPage` con tabs: Perfil, Umbrales, Sistema, Auditoría.
- [x] **F11-T08** — Tab Perfil (reutiliza ProfilePage F2-T18).
- [x] **F11-T09** — Tab Umbrales (tabla por variable: min/max severidad leve/moderada/severa %).
- [x] **F11-T10** — Tab Sistema (frecuencia, unidades, zona horaria, idioma).
- [x] **F11-T11** — Tab Auditoría (tabla paginada + filtros).

**✅ Criterio de cierre Fase 11:** Config persiste y afecta motor de alertas; auditoría registra y es consultable.

---

## 🧪 FASE 12 — Integración, QA y Pulido

### 12.1 Integración end-to-end
- [x] **F12-T01** — Flujo completo: login → crear cultivo → estados → nodos → ingesta → alerta → dashboard → mapa → historial → reporte.
- [x] **F12-T02** — Verificar WebSocket en todos los módulos (dashboard, mapa, alertas).
- [ ] **F12-T03** — Verificar RBAC en todas las rutas y UI (ocultar acciones no permitidas).
- [x] **F12-T04** — Verificar responsive en móvil/tablet (sidebar drawer, tablas scroll, canvas).
- [ ] **F12-T05** — Verificar accesibilidad: foco, teclado, ARIA, contraste. Contraste de texto auditado en `/dev/components`; falta completar la revisión de teclado y ARIA en toda la aplicación.

### 12.2 Testing y calidad
- [x] **F12-T06** — Cobertura tests backend ≥ 70% en servicios críticos (auth, alerts, nodes, crops, states).
- [x] **F12-T07** — Tests componentes frontend críticos (forms, canvas, KPIs).
- [x] **F12-T08** — Lint + Prettier sin errores en ambos proyectos.
- [x] **F12-T09** — Revisión de manejo de errores (try/catch, error boundaries, toasts).

### 12.3 Documentación y despliegue
- [x] **F12-T10** — Swagger/OpenAPI completo en `/api/docs`.
- [x] **F12-T11** — README con instrucciones (setup, envs, scripts, seed, credenciales demo).
- [x] **F12-T12** — Dockerfile backend + frontend + docker-compose full (postgres, backend, frontend). Runtime validado: health, Swagger, OpenAPI, frontend y proxy responden HTTP 200.
- [x] **F12-T13** — CI con GitHub Actions (lint, test, build en PR). Workflow creado; pendiente observar su primera ejecución en GitHub.

**✅ Criterio de cierre Fase 12:** Flujo E2E completo sin errores; tests verdes; documentación y docker listos.
**Pendientes:** F12-T03 (cobertura completa de RBAC en rutas y UI), F12-T05 (teclado/ARIA en toda la app) y F12-T14 (el PRD disponible no contiene la sección 14 citada).

---

## 📊 Resumen de Fases

| Fase | Nombre | Tareas | Módulos cubiertos |
|------|--------|--------|-------------------|
| 0 | Preparación entorno | 36 | Infra, deps, DB, conexiones |
| 1 | Design System | 32 | Componentes base, layout, gráficos, canvas base |
| 2 | Autenticación y Usuarios | 19 | F-01 a F-06 |
| 3 | Nodos | 12 | F-18 a F-23 |
| 4 | Cultivos | 11 | F-24 a F-28 |
| 5 | Estados del Cultivo | 12 | F-29 a F-34 |
| 6 | Ingesta y Alertas | 17 | F-35 a F-40 |
| 7 | Dashboard | 11 | F-07 a F-11 |
| 8 | Mapa Canvas | 13 | F-12 a F-17 |
| 9 | Historial | 9 | F-41 a F-45 |
| 10 | Reportes | 12 | F-46 a F-50 |
| 11 | Configuración y Auditoría | 11 | F-51 a F-54 |
| 12 | Integración y QA | 14 (11 completadas) | Transversal |

**Total: 209 tareas.** Fase 0: 35 de 36 completadas (F0-T27, SMTP de prueba, aplazada por acuerdo del usuario). Fase 1: 32 de 32 completadas. Fases 2–9 completadas salvo F2-T09 (SMTP) y F6-T09/F6-T10 (correo y simulador, aplazados por decisión del usuario). Fase 10 en progreso: 9/12 tareas; quedan F10-T05/F10-T10 (programación y envío por correo, SMTP aplazado) y F10-T07 (pruebas de la programación). Fase 11 completada (11/11); Fase 12 en progreso (11/14): quedan F12-T03, F12-T05 y F12-T14.