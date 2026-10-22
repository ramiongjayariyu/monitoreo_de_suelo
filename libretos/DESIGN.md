
## 1. 🎯 Filosofía de Diseño

**Concepto:** "AgroTech Moderno" — fusión de naturaleza y tecnología. Interfaz limpia, profesional y confiable que transmite frescura agrícola sin caer en lo rústico. El usuario debe sentir control y claridad sobre su terreno.

**Principios:**
- **Claridad primero:** datos legibles de un vistazo, jerarquía visual fuerte.
- **Semáforo intuitivo:** verde/amarillo/rojo universal para estados.
- **Tacto agrícola:** texturas sutiles, iconografía orgánica, pero moderna.
- **Consistencia:** un solo lenguaje visual en todos los módulos.
- **Accesibilidad:** contraste WCAG AA, navegación por teclado, ARIA labels.

---

## 2. 🎨 Paleta de Colores

### 2.1 Colores Primarios (Marca)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary-900` | `#1B4332` | Textos sobre fondos claros, headers oscuros |
| `--color-primary-700` | `#2D6A4F` | Botones primarios, links activos, sidebar |
| `--color-primary-500` | `#40916C` | Hover de botones primarios, iconos activos |
| `--color-primary-300` | `#74C69D` | Acentos suaves, bordes activos |
| `--color-primary-100` | `#D8F3DC` | Fondos de cards destacadas, badges suaves |

### 2.2 Colores Semánticos (Estados)

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-success` | `#2D6A4F` | Estado óptimo, semáforo verde |
| `--color-warning` | `#9A5700` | Advertencia, semáforo amarillo |
| `--color-danger` | `#C1121F` | Crítico, semáforo rojo, errores |
| `--color-info` | `#37637F` | Información neutral, tooltips |
| `--color-neutral` | `#5E6B63` | Estado desconocido/offline |

### 2.3 Colores de Superficie

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-base` | `#F8FAF9` | Fondo general de la app |
| `--bg-surface` | `#FFFFFF` | Cards, modales, tablas |
| `--bg-elevated` | `#F1F5F2` | Hover de filas, inputs |
| `--bg-dark` | `#1A2E24` | Sidebar, header oscuro |
| `--bg-canvas` | `#EAF4EC` | Fondo del lienzo del terreno |

### 2.4 Colores de Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `--text-primary` | `#1B2E24` | Texto principal |
| `--text-secondary` | `#5A6B62` | Texto secundario, labels |
| `--text-muted` | `#5E6B63` | Placeholders, disabled |
| `--text-inverse` | `#FFFFFF` | Texto sobre fondos oscuros |

### 2.5 Bordes y Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--border-default` | `#DCE5DF` | Bordes de cards, inputs |
| `--border-focus` | `#40916C` | Focus ring (2px) |
| `--shadow-sm` | `0 1px 2px rgba(27,46,36,0.06)` | Cards planas |
| `--shadow-md` | `0 4px 12px rgba(27,46,36,0.08)` | Cards elevadas, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(27,46,36,0.12)` | Modales, popovers |
| `--radius-sm` | `6px` | Inputs, badges |
| `--radius-md` | `10px` | Cards, botones |
| `--radius-lg` | `16px` | Modales, paneles |
| `--radius-full` | `9999px` | Avatares, pills |

### 2.6 Colores por Variable (Gráficos)

| Variable | Hex | Icono sugerido |
|----------|-----|----------------|
| Humedad | `#20786E` | 💧 Droplet |
| pH | `#8338EC` | 🧪 Flask |
| Salinidad | `#806000` | 🧂 Salt |
| Temperatura del suelo | `#B8472C` | 🌡️ Thermometer |
| Temperatura ambiente | `#9A4D00` | ☀️ Sun |

---

## 3. 🔤 Tipografía

| Token | Fuente | Uso |
|-------|--------|-----|
| `--font-display` | **Plus Jakarta Sans** (700/800) | Títulos, KPIs, headers |
| `--font-body` | **Inter** (400/500/600) | Texto general, tablas, forms |
| `--font-mono` | **JetBrains Mono** (400/500) | Valores numéricos, IDs, timestamps |

**Escala tipográfica:**
- `text-xs`: 12px / 16px line-height
- `text-sm`: 14px / 20px
- `text-base`: 16px / 24px
- `text-lg`: 18px / 28px
- `text-xl`: 20px / 28px
- `text-2xl`: 24px / 32px
- `text-3xl`: 30px / 36px
- `text-4xl`: 36px / 40px (KPIs)
- `text-5xl`: 48px / 1 (números grandes dashboard)

---

## 4. 📐 Espaciado y Grid

- **Sistema base:** múltiplos de 4px (`--space-1`=4, `--space-2`=8, `--space-3`=12, `--space-4`=16, `--space-6`=24, `--space-8`=32, `--space-12`=48, `--space-16`=64).
- **Grid:** 12 columnas, gutter 24px, max-width 1440px, padding lateral 32px desktop / 16px móvil.
- **Breakpoints:** `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- **Sidebar:** 260px expandido / 72px colapsado (iconos).
- **Header:** 64px alto, sticky.

---

## 5. 🧩 Componentes Base (Design System)

### 5.1 Botones
| Variante | Fondo | Texto | Borde | Hover |
|----------|-------|-------|-------|-------|
| Primary | `#2D6A4F` | `#FFF` | none | `#40916C` |
| Secondary | `#FFF` | `#2D6A4F` | `#DCE5DF` | `#F1F5F2` |
| Danger | `#C1121F` | `#FFF` | none | `#B91C1C` |
| Ghost | transparente | `#2D6A4F` | none | `#D8F3DC` |
| Disabled | `#F1F5F2` | `#5E6B63` | none | — |

- Altura: `sm` 32px / `md` 40px / `lg` 48px. Radius `md`. Padding horizontal `16px` (md). Icono + texto con gap 8px. Transición 150ms ease.

### 5.2 Inputs / Forms
- Altura 40px, radius `sm`, borde 1px `#DCE5DF`, fondo `#FFF`, padding `12px 16px`, fuente Inter 14px.
- Focus: borde `#40916C` + ring 3px `rgba(64,145,108,0.15)`.
- Error: borde `#C1121F` + mensaje `text-xs` rojo debajo.
- Label: `text-sm` medium, `#5A6B62`, margen inferior 6px.
- Select, checkbox, radio, toggle: alineados al mismo sistema.

### 5.3 Cards
- Fondo `#FFF`, radius `md`, shadow `sm`, padding 24px, borde 1px `#DCE5DF`.
- Header de card: título `text-lg` semibold + acciones a la derecha.

### 5.4 Tablas
- Header fondo `#F1F5F2`, texto `text-sm` semibold `#5A6B62`, uppercase 12px tracking-wide.
- Filas: 56px alto, hover `#F8FAF9`, borde inferior `#DCE5DF`.
- Paginación inferior derecha. Orden por columna con icono ▲▼.

### 5.5 Badges / Pills
- Radius `full`, padding `4px 12px`, `text-xs` semibold.
- Success: fondo `#D8F3DC` / texto `#1B4332`.
- Warning: fondo `#FFF1E6` / texto `#B45309`.
- Danger: fondo `#FDE8EA` / texto `#991B1B`.
- Info: fondo `#E0F2FE` / texto `#075985`.
- Neutral: fondo `#F1F5F2` / texto `#5A6B62`.

### 5.6 Modal
- Overlay `rgba(26,46,36,0.5)` blur 4px. Contenedor `#FFF`, radius `lg`, shadow `lg`, max-width 560px, padding 32px.
- Header con título `text-xl` + botón X. Footer con acciones alineadas derecha.

### 5.7 Toast / Notificación
- Esquina superior derecha, radius `md`, shadow `md`, borde izquierdo 4px según severidad, auto-dismiss 5s, botón cerrar.

### 5.8 Tooltip
- Fondo `#1B2E24`, texto `#FFF`, `text-xs`, radius `sm`, padding `6px 10px`, flecha inferior.

### 5.9 Semáforo de Estado
- Círculo 10px + texto. Verde `#2D6A4F` (Óptimo), Ámbar `#9A5700` (Advertencia), Rojo `#C1121F` (Crítico), Gris `#5E6B63` (Offline).

---

## 6. 🗺️ Layout General de la Aplicación

```
┌──────────────────────────────────────────────────────┐
│  HEADER (64px, sticky, bg #FFF, shadow sm)            │
│  Logo AgroSense · Breadcrumb · AlertBell · Avatar     │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  SIDEBAR   │   CONTENT AREA (bg #F8FAF9)             │
│  (260px)   │   padding 32px, max-width 1440px        │
│  bg #1A2E24│                                         │
│            │                                         │
│  Nav items │                                         │
│  con icono │                                         │
│  + label   │                                         │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

**Sidebar items (orden):**
1. 📊 Dashboard
2. 🗺️ Mapa del Terreno
3. 🔌 Nodos
4. 🌾 Cultivos
5. 🌱 Estados
6. ⚠️ Alertas (con badge contador)
7. 🕓 Historial
8. 📈 Reportes
9. ⚙️ Configuración
10. 👥 Usuarios (solo Admin)

Item activo: fondo `#2D6A4F`, texto `#FFF`, borde izquierdo 3px `#74C69D`. Item hover: fondo `rgba(255,255,255,0.06)`.

---

## 7. 📄 Especificación por Pantalla

### 7.1 Login (`/login`)
- Layout split: izquierda 50% ilustración agrícola + branding (fondo `#1B4332` con gradiente a `#2D6A4F`, logo grande, tagline "Monitorea tu suelo, cultiva con datos"); derecha 50% formulario centrado vertical.
- Form: título "Bienvenido a AgroSense" (`text-3xl`), subtítulo. Campos email, contraseña (con toggle ver), checkbox "Recordarme", link "¿Olvidaste tu contraseña?", botón Primary full-width "Iniciar sesión". Divider. Link a registro (si aplica).
- Validación inline. Error general en alert box rojo arriba del form.
- Responsive: en móvil, ilustración se oculta; formulario full-width con padding 24px.

### 7.2 Dashboard (`/dashboard`)
- **Fila 1 — 5 tarjetas KPI** (grid 5 columnas en escritorio / 2 en tablet / 1 en móvil): una para cada variable — **Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente**. Cada tarjeta muestra icono, nombre en español, valor grande `text-4xl` mono, variación frente al periodo anterior (↑↓ con color) y mini gráfico.
- **Fila 2 — Semáforo general + Alertas activas** (grid 2 cols): card izquierda con semáforo grande (círculo 80px + estado + conteo nodos por color); card derecha con lista de últimas 5 alertas (badge severidad, nodo, variable, tiempo relativo).
- **Fila 3 — Gráfico histórico rápido** (full-width): tabs 24h/7d/30d, selector de variable (5 pills de color), gráfico de línea con área, leyenda, tooltip al hover.
- **Filtros superiores:** dropdown Nodo, dropdown Cultivo, botón "Actualizar" con timestamp última actualización.
- Auto-refresh cada 5s vía WebSocket; indicador "En vivo" con punto pulsante verde.

### 7.3 Mapa del Terreno (`/map`)
- **Toolbar superior:** zoom +/-, capas (toggle cuadrícula/etiquetas/alertas), filtros (cultivo, estado, alerta), botón "Agregar nodo".
- **Canvas principal:** fondo `#EAF4EC` con grid sutil `#DCE5DF`. Nodos como círculos 40px con color de estado, icono interno, label nombre debajo. Drag & drop habilitado (cursor grab/grabbing). Al seleccionar: popup card flotante con las 5 lecturas, timestamp, botón "Ver detalle" y "Editar".
- **Leyenda flotante** inferior izquierda: verde/amarillo/rojo/gris con conteo.
- **Panel lateral derecho colapsable:** lista de nodos con estado, click centra en canvas.
- Confirmación de reubicación: al soltar, toast "Posición actualizada" + guardado automático PATCH.

### 7.4 Nodos (`/nodes`)
- **Header:** título + botón "Agregar nodo" (Primary).
- **Barra de filtros:** búsqueda por nombre/ID, dropdown cultivo, dropdown estado (online/offline), dropdown alerta.
- **Tabla:** columnas ID, Nombre, Cultivo, Estado fenológico, Posición (x,y), Conexión (badge online/offline), Batería (barra), Última lectura (tiempo relativo), Acciones (ver/editar/eliminar con iconos).
- **Form agregar/editar (modal o página):** campos nombre, ID, cultivo (select), estado (select filtrado por cultivo), posición x/y (numéricos o picker en mini-canvas), frecuencia muestreo (select), notas. Validación.
- **Eliminar:** modal confirmación con advertencia de dependencias.

### 7.5 Cultivos (`/crops`)
- Grid de cards (3 cols desktop / 2 tablet / 1 móvil): cada card muestra nombre, descripción truncada, número de estados, número de nodos asociados, botones editar/eliminar.
- Botón "Agregar cultivo" abre modal: nombre, descripción, y **editor de rangos por variable** (5 filas con min/max numéricos + unidad). Validación min < max.
- Eliminar con validación de dependencias (bloquea si hay nodos o estados).

### 7.6 Estados del Cultivo (`/crops/:id/states`)
- **Header:** nombre cultivo + botón "Agregar estado".
- **Timeline horizontal (Gantt):** estados ordenados por `order`, cada uno con color y nombre. No se muestran fechas: el modelo no registra inicio ni fin de etapa. Estado vigente resaltado con borde `#40916C` + badge "Vigente".
- **Tabla debajo:** Estado, Orden, Rangos (resumen chips por variable), Vigente (toggle), Acciones.
- **Form estado:** nombre, orden, toggle activo, editor de rangos (mismo componente que cultivos).
- Activar estado: confirma que reemplaza el vigente actual.

### 7.7 Alertas (`/alerts`)
- **Filtros:** severidad (pills: Todas/Info/Advertencia/Crítico), nodo, variable, rango fechas, estado (activa/leída/cerrada).
- **Lista:** cada alerta como card-fila con borde izquierdo color severidad, icono, mensaje ("Humedad fuera de rango: 18% (rango 25–35%)"), nodo, variable chip, timestamp, acciones (marcar leída, silenciar, cerrar).
- Contador en header. Agrupación por fecha (Hoy, Ayer, Esta semana).

### 7.8 Historial (`/history`)
- **Panel de filtros superior:** nodo (multi-select para comparar), variable (pills), rango fechas (date picker), granularidad (hora/día/semana).
- **Gráfico principal:** líneas múltiples (una por nodo), colores por variable, leyenda interactiva (click oculta/muestra), zoom por arrastre, tooltip con valores.
- **Gráfico secundario:** correlación entre 2 variables (scatter plot) toggle.
- **Botón "Exportar imagen"** (descarga PNG del gráfico).
- Estado vacío: ilustración + mensaje "Selecciona filtros para ver datos".

### 7.9 Reportes (`/reports`)
- **Formulario de generación:** rango fechas, multi-select nodos, multi-select cultivos, secciones a incluir (checkboxes: resumen ejecutivo, gráficos, tablas de alertas, lecturas).
- **Preview** en panel derecho con layout de reporte.
- **Botones:** "Exportar PDF" (Primary), "Exportar Excel" (Secondary), "Programar envío" (abre modal con frecuencia semanal/mensual + email), "Compartir" (genera enlace copiable).
- **Historial de reportes generados** debajo: tabla con fecha, periodo, formato, acciones (descargar, reenviar).

### 7.10 Configuración (`/settings`)
- **Tabs:** Perfil, Umbrales, Sistema, Auditoría.
- **Perfil:** avatar, nombre, email, cambio contraseña, 2FA toggle.
- **Umbrales:** tabla por variable con inputs min/max y severidad (leve/moderada/severa %). Guardar.
- **Sistema:** frecuencia muestreo default, unidades, zona horaria, idioma.
- **Auditoría:** tabla paginada con filtros (usuario, acción, entidad, fecha).

### 7.11 Usuarios (`/users`, solo Admin)
- Tabla: nombre, email, rol (badge), estado (activo/inactivo toggle), última conexión, acciones.
- Modal crear/editar: nombre, email, rol (select), contraseña (solo crear), activo toggle.
- Eliminar → desactivar (soft delete).

---

## 8. 🔔 Notificaciones y Feedback

- **Toast:** esquina superior derecha, 4 tipos (success/warning/danger/info), icono + mensaje + X, 5s auto-dismiss, apilables máx 3.
- **AlertBell en header:** icono campana con badge contador rojo; click abre dropdown con últimas 10 alertas + link "Ver todas".
- **WebSocket:** nuevas lecturas actualizan KPIs con animación subtle (fade); nuevas alertas disparan toast + badge.
- **Loading states:** skeletons en cards/tablas, spinner en botones al submit, barra de progreso en exportaciones.
- **Empty states:** ilustración lineal + mensaje + CTA para cada módulo sin datos.
- **Confirmaciones:** modales para acciones destructivas con botón Danger + texto de advertencia.

---

## 9. ♿ Accesibilidad

- Contraste mínimo 4.5:1 en texto, 3:1 en componentes UI.
- Focus visible: ring 2px `#40916C` + offset 2px en todos los interactivos.
- Navegación completa por teclado (Tab, Enter, Esc cierra modales).
- ARIA: `role`, `aria-label`, `aria-live` en toasts y alertas dinámicas, `aria-expanded` en dropdowns.
- Textos alternativos en iconos significativos. Iconos decorativos `aria-hidden`.
- Respeto a `prefers-reduced-motion` (desactivar animaciones).
- Tamaño mínimo de target táctil 44x44px en móvil.

---

## 10. 📱 Responsive

| Breakpoint | Comportamiento |
|------------|----------------|
| `< 640px` (móvil) | Sidebar como drawer overlay (hamburguesa), grid 1 col, tablas con scroll horizontal o cards, canvas full-width con toolbar compacta, modales full-screen. |
| `640–1024px` (tablet) | Sidebar colapsado a iconos (72px), grid 2 cols, canvas con panel lateral colapsable. |
| `> 1024px` (desktop) | Layout completo descrito. |
| `> 1440px` | Content max-width 1440px centrado, márgenes automáticos. |

---

## 11. 🎬 Animaciones y Microinteracciones

- Transiciones estándar: `150ms ease-out` (hover), `250ms ease-in-out` (modales, drawers).
- Sidebar colapsar: `300ms ease`.
- Drag & drop nodo: scale 1.1 + shadow `lg` mientras se arrastra, snap suave al soltar.
- Semáforo: pulso sutil en estado crítico (opacity 0.7↔1, 2s loop).
- KPI actualizado: flash de fondo `#D8F3DC` 500ms.
- Skeleton shimmer en carga.
- Página transición: fade 200ms.

---

## 12. 🖼️ Iconografía

- Librería: **Lucide React** (consistente, outline, 24px default).
- Tamaños: 16px (inline), 20px (botones), 24px (nav), 32px (KPIs), 48px (empty states).
- Colores: heredan del contexto, excepto iconos de variable (color propio).

---

## 13. 📊 Especificación de Gráficos

- Librería: **Recharts**.
- Líneas: grosor 2px, puntos hover 4px, área con gradiente 10% opacidad.
- Grid: `#DCE5DF` dashed 1px solo horizontal.
- Ejes: texto `text-xs` `#5E6B63`, sin línea de eje.
- Tooltip: card `#FFF` shadow `md`, valores mono, color por variable.
- Leyenda: arriba, pills clickeables.
- Colores por variable (ver sección 2.6).
- Responsive container 100% width, altura 320px (dashboard) / 480px (historial).

---

## 14. 🧪 Estados de Componentes (Checklist para el Agente)

Cada componente debe implementar: **default, hover, focus, active, disabled, loading, error, empty, success**. Documentar en Storybook (opcional pero recomendado).

---

## 15. 🗂️ Tokens de Diseño (CSS Variables — `:root`)

```css
:root {
  /* Primarios */
  --color-primary-900: #1B4332;
  --color-primary-700: #2D6A4F;
  --color-primary-500: #40916C;
  --color-primary-300: #74C69D;
  --color-primary-100: #D8F3DC;
  /* Semánticos */
  --color-success: #2D6A4F;
  --color-warning: #9A5700;
  --color-danger: #C1121F;
  --color-info: #37637F;
  --color-neutral: #5E6B63;
  /* Superficies */
  --bg-base: #F8FAF9;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F1F5F2;
  --bg-dark: #1A2E24;
  --bg-canvas: #EAF4EC;
  /* Texto */
  --text-primary: #1B2E24;
  --text-secondary: #5A6B62;
  --text-muted: #5E6B63;
  --text-inverse: #FFFFFF;
  /* Bordes */
  --border-default: #DCE5DF;
  --border-focus: #40916C;
  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(27,46,36,0.06);
  --shadow-md: 0 4px 12px rgba(27,46,36,0.08);
  --shadow-lg: 0 8px 24px rgba(27,46,36,0.12);
  /* Radios */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  /* Tipografía */
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  /* Espaciado */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  /* Variables de gráficos */
  --chart-humidity: #20786E;
  --chart-ph: #8338EC;
  --chart-salinity: #806000;
  --chart-soil-temp: #B8472C;
  --chart-ambient-temp: #9A4D00;
