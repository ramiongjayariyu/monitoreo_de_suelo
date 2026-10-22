# AgroSense

Plataforma web para monitorear cinco variables del suelo: Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente. La interfaz, los mensajes y esta documentación están en español.

## Requisitos

- Node.js 20 o superior y npm.
- Docker Desktop con el motor Linux iniciado para la base de datos PostgreSQL.

## Preparación local

1. Copiar `.env.example` como `.env`.
2. Instalar dependencias:

   ```powershell
   cd backend
   npm install
   cd ..\frontend
   npm install
   cd ..
   ```

3. Iniciar PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

4. Generar el cliente de Prisma, ejecutar la migración y cargar datos locales:

   ```powershell
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. En dos terminales, iniciar los servicios:

   ```powershell
   cd backend
   npm run dev
   ```

   ```powershell
   cd frontend
   npm run dev
   ```

La aplicación web estará en `http://localhost:5173`. La API estará en `http://localhost:4000/api`; su estado se consulta en `/api/health`.
La documentación interactiva de la API estará disponible en `http://localhost:4000/api/docs/` y la especificación OpenAPI en `http://localhost:4000/api/docs/openapi.json`.

## Usuarios locales de demostración

La carga inicial crea `admin@agrosense.local`, `operador@agrosense.local` y `consulta@agrosense.local`. Los tres usan la contraseña local configurada en `DEMO_SEED_PASSWORD` en `.env`. Son solo cuentas de desarrollo: no reutilizar estas credenciales en producción.

## Pruebas y calidad

En `backend/`:

```powershell
npm run lint
npm run build
npm test -- --runInBand --coverage
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

En `frontend/`:

```powershell
npm run lint
npm test
npm run build
```

La integración continua ejecuta lint, build y pruebas con PostgreSQL en cada pull request y al actualizar `main`/`master`.

## Despliegue local con Docker

1. Copiar `.env.example` a `.env` y reemplazar los secretos y `DEMO_SEED_PASSWORD`.
2. Construir e iniciar PostgreSQL, backend y frontend:

   ```powershell
   docker compose up --build -d
   ```

   El backend espera a PostgreSQL, aplica las migraciones y expone la API en `http://localhost:4000/api`. La aplicación web, servida por Nginx con proxy para API y Socket.IO, estará en `http://localhost:8080`.

3. Cargar las cuentas y los datos demo una vez:

   ```powershell
   docker compose exec backend npx prisma db seed
   ```

4. Consultar estado y documentación: `http://localhost:4000/api/health` y `http://localhost:4000/api/docs/`.

Para detener los servicios sin borrar la base de datos: `docker compose down`. Los datos persisten en el volumen `agrosense-postgres-data`. No ejecutar `docker compose down -v` si se quieren conservar.

## Comandos de desarrollo

En `backend/`: `npm run dev`, `npm run build`, `npm test`, `npm run prisma:migrate`, `npm run prisma:seed`.

En `frontend/`: `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

## Ingesta de lecturas y alertas

Los dispositivos envían lecturas a `POST /api/ingest` con el encabezado `x-api-key`, usando el valor de `INGEST_API_KEY` configurado en el backend. El cuerpo JSON incluye `deviceId`, `humidity`, `ph`, `salinity`, `soilTemp` y `ambientTemp`; `timestamp` y `battery` son opcionales. No incluir la clave en el frontend ni en el control de versiones.

El backend almacena cada lectura y actualiza el estado y la última lectura del nodo. Si el nodo tiene asignado el estado vigente del cultivo, compara las cinco variables contra sus rangos. La desviación se calcula como la distancia fuera del rango dividida entre el ancho del rango; la configuración `alertSeverityThresholds` en `SystemConfig` define los umbrales `warning` y `critical` (por defecto 5% y 15%). Alertas abiertas se agrupan por nodo y variable para evitar duplicados; cerrar una alerta permite crear una nueva si la condición continúa.

Usuarios autenticados consultan y gestionan alertas en `/api/alerts`; la interfaz actualiza el contador y la lista mediante Socket.IO. El dashboard autenticado consulta `/api/dashboard?nodeId=&cropId=&period=24h|7d|30d`: los KPI son el promedio de las lecturas más recientes de cada nodo filtrado, el gráfico agrupa lecturas por intervalos y el semáforo resume el peor estado de cada nodo. `dashboard:update` invalida los datos del dashboard cuando ingresa una lectura.

El correo para alertas críticas y el generador periódico de lecturas demo permanecen aplazados; la ingesta manual de desarrollo puede probarse con la API key local.

## Seguridad

`.env` contiene valores locales y no debe versionarse. Reemplazar todas las claves de ejemplo y configurar SMTP real antes de desplegar. No usar los datos ni las cuentas de demostración en producción.
