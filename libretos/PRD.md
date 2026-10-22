# Documento de requisitos del producto (PRD)

# 📘 AgroSense — Documento de Especificación para Agente de Desarrollo

---

## 1. 🌍 Contexto

AgroSense es una plataforma web de monitoreo de calidad de suelo orientada a productores agrícolas y agrónomos. El sistema se integra con nodos sensores físicos (vía API) que miden cinco variables: **Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente**. La información se centraliza, visualiza sobre un mapa del terreno y se compara contra rangos óptimos configurables según cultivo y estado fenológico.

La interfaz, las notificaciones y los reportes se presentarán en español. Los nombres técnicos internos y las rutas de API seguirán las convenciones definidas en `ARCHITECTURE.md`.

---

## 2. 🎯 Problema a Resolver

Los agricultores carecen de una herramienta centralizada, visual e inteligente que les permita conocer en tiempo real el estado del suelo en cada punto del terreno, comparar lecturas contra rangos óptimos por cultivo/estado y recibir alertas oportunas ante desviaciones. Esto provoca pérdidas de cosecha, uso ineficiente de recursos (agua, fertilizantes) y decisiones reactivas en lugar de preventivas.

**Problemas específicos:**
- Monitoreo manual y esporádico → datos desactualizados.
- Sin visibilidad espacial del terreno → no se identifica la zona en riesgo.
- Desconocimiento de rangos óptimos por cultivo/estado → riego y fertilización inadecuados.
- Sin alertas tempranas → pérdidas de cosecha y recursos.
- Información dispersa sin trazabilidad ni historial.
- Dificultad para generar reportes consolidados.
- Gestión manual de múltiples nodos → configuración propensa a errores.

---

## 3. 🎯 Objetivo

**General:** Desarrollar una plataforma web que centralice el monitoreo de la calidad del suelo mediante nodos sensores, visualice indicadores en tiempo real sobre un mapa del terreno, gestione cultivos y estados con rangos óptimos configurables, y genere alertas y reportes que apoyen la toma de decisiones agrícolas.

**Específicos:**
1. Acceso seguro con roles diferenciados.
2. Visualización interactiva de nodos sobre un lienzo.
3. CRUD de nodos (crear, configurar, reubicar, eliminar).
4. Gestión de cultivos y estados con rangos óptimos por variable.
5. Alertas automáticas al salirse de rango.
6. Historial de variables en diagramas interactivos.
7. Reportes exportables.

---

## 4. 📦 Alcance

**Incluido:**
- Plataforma web responsive con login y roles.
- Dashboard con los 5 indicadores y semáforo de estado.
- Lienzo interactivo con nodos y drag & drop.
- CRUD completo de nodos, cultivos y estados.
- Motor de alertas con notificaciones en panel y email.
- Historial gráfico y reportes exportables en PDF/Excel.
- Integración con nodos sensores vía API (solo consumo).

---

## 5. 🚫 Fuera de Alcance

- Desarrollo de hardware/firmware de nodos sensores.
- Aplicación móvil nativa (solo web responsive).
- Modelos predictivos con IA.
- Integración con maquinaria agrícola o ERP externos.
- SMS/WhatsApp para notificaciones (opcional futuro).

---

## 6. ⚙️ Funcionalidades

### 6.1 Autenticación y Usuarios
- F-01 Iniciar sesión (email + contraseña).
- F-02 Recuperar contraseña vía email.
- F-03 Gestionar sesión (logout, expiración por inactividad).
- F-04 Roles y permisos (Administrador, Operador, Consulta).
- F-05 CRUD de usuarios (solo Administrador).
- F-06 2FA opcional.

### 6.2 Dashboard
- F-07 KPIs en tiempo real para las cinco variables por nodo: Humedad, pH, Salinidad, Temperatura del suelo y Temperatura ambiente.
- F-08 Semáforo de estado (verde/amarillo/rojo).
- F-09 Gráfico histórico rápido (24h / 7d / 30d).
- F-10 Resumen de alertas activas.
- F-11 Filtros por nodo/cultivo.

### 6.3 Mapa del Terreno (Canvas)
- F-12 Visualizar nodos en posición (x, y).
- F-13 Colorear nodos por estado.
- F-14 Tooltip/popup con 5 lecturas al seleccionar nodo.
- F-15 Reubicar nodos (drag & drop).
- F-16 Zoom y capas (cuadrícula, etiquetas, alertas).
- F-17 Filtrar nodos por cultivo/estado/alerta.

### 6.4 Gestión de Nodos
- F-18 Agregar nodo (ID, nombre, posición, cultivo).
- F-19 Editar/configurar nodo (frecuencia de muestreo).
- F-20 Eliminar nodo (con confirmación/archivado).
- F-21 Listar/buscar nodos con filtros.
- F-22 Consultar estado (online/offline, batería, última lectura).
- F-23 Asignar cultivo y estado fenológico al nodo.

### 6.5 Gestión de Cultivos
- F-24 Registrar cultivo (nombre, descripción, rangos).
- F-25 Editar cultivo.
- F-26 Eliminar cultivo (validar dependencias).
- F-27 Listar cultivos.
- F-28 Definir rangos óptimos por variable (mín/máx).

### 6.6 Gestión de Estados del Cultivo
- F-29 Registrar estado (siembra, crecimiento, floración, cosecha) con rangos.
- F-30 Modificar estado.
- F-31 Eliminar estado (validar dependencias).
- F-32 Asociar estado a cultivo con orden cronológico.
- F-33 Visualizar línea de tiempo/Gantt de estados.
- F-34 Activar estado vigente (aplica sus rangos).

### 6.7 Alertas
- F-35 Evaluar lecturas vs. rangos automáticamente.
- F-36 Generar alerta al salirse de rango.
- F-37 Clasificar severidad (Info, Advertencia, Crítico).
- F-38 Notificar en panel y email.
- F-39 Gestionar alertas (leer, silenciar, cerrar).
- F-40 Historial de alertas con filtros.

### 6.8 Historial y Tendencias
- F-41 Consultar historial por variable.
- F-42 Filtrar por rango de fechas.
- F-43 Comparar múltiples nodos en un gráfico.
- F-44 Exportar gráfico como imagen.
- F-45 Analizar correlaciones entre variables.

### 6.9 Reportes
- F-46 Generar reporte general consolidado.
- F-47 Seleccionar periodo y filtros.
- F-48 Exportar PDF/Excel.
- F-49 Programar reportes automáticos (semanal/mensual).
- F-50 Compartir reporte (enlace o correo).

### 6.10 Configuración
- F-51 Configurar umbrales de alerta por variable.
- F-52 Configurar parámetros (frecuencia, unidades, zona horaria).
- F-53 Gestionar perfil de usuario.
- F-54 Consultar auditoría de cambios.

---

## 7. 👥 Usuarios y Roles

| Rol | Funciones permitidas |
|-----|---------------------|
| **Administrador** | Configurar nodos, cultivos, estados, usuarios y umbrales. Acceso total (F-01 a F-54). |
| **Operador / Agrónomo** | Monitorear terreno, recibir alertas, gestionar nodos/cultivos/estados asignados, consultar historial y generar reportes. Sin gestión de usuarios. |
| **Consulta / Directivo** | Visualizar dashboards, consultar historial y descargar reportes. Solo lectura. |

---

## 8. 📏 Reglas de Negocio

- **RN-01:** Un nodo debe estar asociado a un cultivo y a un estado vigente para evaluar alertas.
- **RN-02:** Cada estado de cultivo define rangos mín/máx para las 5 variables; el estado vigente es el que se aplica al motor de alertas.
- **RN-03:** Solo puede haber un estado vigente por cultivo a la vez.
- **RN-04:** No se puede eliminar un cultivo con nodos o estados asociados (validación de dependencias).
- **RN-05:** No se puede eliminar un estado asociado a un cultivo activo.
- **RN-06:** Una alerta se genera cuando una lectura sale del rango [mín, máx] del estado vigente del cultivo del nodo.
- **RN-07:** Severidad por desviación relativa al ancho del rango: Info = <5%, Advertencia = ≥5% y <15%, Crítico = ≥15%. La desviación es la distancia fuera del límite más cercano dividida entre `máx - mín`; los umbrales `warning` y `critical` son configurables en `SystemConfig` (por defecto 5 y 15).
- **RN-08:** Las posiciones de nodos se almacenan como coordenadas (x, y) relativas al lienzo del terreno.
- **RN-09:** Contraseñas cifradas (hash), sesiones con expiración por inactividad.
- **RN-10:** Todo cambio crítico (CRUD nodos/cultivos/estados/usuarios) se registra en auditoría.
- **RN-11:** Actualización de indicadores en dashboard ≤ 5 s; consultas ≤ 2 s.
- **RN-12:** Disponibilidad ≥ 99%, plataforma responsive para navegadores modernos y móvil.

---
