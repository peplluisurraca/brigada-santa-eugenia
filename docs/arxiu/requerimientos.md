# Requerimientos y Alcance - Brigada de Mantenimiento

Este documento recoge los requisitos funcionales y no funcionales para la aplicación de gestión de la brigada de mantenimiento.

---

## 1. Módulos Principales

### 1.1. Gestión de Incidencias / Partes de Trabajo
- **Registro rápido de aviso**:
  - Título y descripción de la avería/tarea.
  - Ubicación física (Edificio, Planta, Zona / Coordenadas GPS opcionales).
  - Categoría (Electricidad, Fontanería, Climatización, Albañilería, Cerrajería, etc.).
  - Nivel de prioridad (Crítica, Alta, Media, Preventiva).
  - Fotografías adjuntas (capturadas con la cámara del dispositivo móvil).
- **Flujo de estados**:
  - `Pendiente`: Notificado, sin asignar o sin iniciar.
  - `En curso`: El técnico está desplazado o realizando la reparación.
  - `En espera de material`: Bloqueado por falta de repuestos.
  - `Finalizado`: Tarea terminada con parte firmado o validado.

### 1.2. Módulo de Operarios (Vista Móvil)
- Lista filtrada de tareas del día asignadas al operario.
- Registro de horas/tiempo invertido.
- Materiales y repuestos utilizados.
- Recogida de firma digital en pantalla (cliente o supervisor).

### 1.3. Módulo de Coordinación / Despacho (Vista Escritorio/Tablet)
- Tablero Kanban o lista interactiva de avisos clasificados por estado.
- Asignación rápida de operarios.
- Métricas rápidas: Tareas pendientes, tiempo medio de resolución, avisos urgentes activos.

---

## 2. Requisitos Técnicos y de Experiencia de Usuario (PWA)
- **Instalable**: Añadible a la pantalla de inicio del smartphone como app nativa (manifiesto PWA).
- **Offline-First**:
  - Almacenamiento local mediante IndexedDB en el navegador.
  - Si el técnico entra en un sótano o zona sin cobertura, puede seguir consultando sus tareas y rellenando partes.
  - Cola de sincronización que actualiza los datos al recuperar la conexión.
- **Diseño Responsive**: Adaptación fluida a pantallas pequeñas (móviles de campo) y pantallas anchas (oficinas).
