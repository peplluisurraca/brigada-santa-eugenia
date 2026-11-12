# Plan de corrección para Antigravity — PWA Brigada Santa Eugènia

Origen: [`AUDITORIA_2026-11-12.md`](./AUDITORIA_2026-11-12.md). Cada fase es un **prompt autónomo**: se copia tal cual en el panel del agente de Antigravity, una fase por conversación y en este orden. Las fases 0 y 1 son bloqueantes; las demás pueden reordenarse.

**Reglas para el agente:** están en [`/AGENTS.md`](../AGENTS.md), en la raíz del repo. Si tu versión de Antigravity no lee `AGENTS.md`, copia su contenido como regla del workspace.

**Cómo trabajar con Antigravity:**

- Pide siempre el **plan** (Implementation Plan) antes de ejecutar y revísalo.
- Exige las capturas del navegador integrado como prueba de cada flujo.
- Un commit por fase, en una rama `fix/fase-N`.
- No dejes que despliegue (`firebase deploy`) por su cuenta: el despliegue lo hace una persona.

---

## Fase 0 — Contención (hacer HOY, 15 min, manual en la consola de Firebase)

No hace falta agente. En Firebase Console → Firestore → Reglas, publicar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

Después:

- Cambiar los PIN del personal real.
- Exportar una copia de Firestore como respaldo (`gcloud firestore export`, o los datos desde la consola).

Mientras no se complete la fase 1, la app dejará de sincronizar: es intencionado.

---

## Fase 1 — Autenticación real y reglas de seguridad

```text
Contexto: PWA de un solo fichero brigada-mantenimiento/index.html (Firebase v10 modular por CDN, plan Spark, sin Cloud Functions). Hoy el login es solo visual: contraseña de admin '1234' escrita en el código (línea ~2420), PIN maestro '1234' (línea ~2447), sesión en localStorage que se puede falsificar, y la colección `operaris` guarda el campo `pin` en texto plano. Firestore estaba abierto y se ha cerrado con `allow read, write: if false`.

Objetivo: login real con Firebase Authentication y reglas que lo exijan.

Requisitos:
1. Admin: Firebase Auth con email+contraseña (el Cap de Brigada). Elimina toda contraseña escrita en el código.
2. Operaris: Firebase Auth email+contraseña con email sintético `op-<id>@brigada-santa-eugenia.local` y PIN de 6 dígitos como contraseña (Firebase exige ≥6). La UI sigue siendo «selecciona tu nombre + teclea PIN».
3. Roles: colección `rols/{uid}` con { rol: 'admin'|'operari', operariId }. Solo un admin puede escribirla. Crea un script Node `scripts/bootstrap-auth.mjs` (firebase-admin, se ejecuta en local con una service account que NO se commitea) que crea los usuarios y los documentos de rol.
4. Elimina el campo `pin` de `operaris` y de toda la UI («PIN Actiu: •••• (1234)»). El reset de PIN lo hace el admin con el script o con «reenviar contraseña».
5. La sesión la gestiona onAuthStateChanged; borra el uso de localStorage 'brigada_user_session' para permisos.
6. Crea `firestore.rules` y `firestore.indexes.json` y referéncialos en firebase.json:
   - operaris: leer si autenticado; escribir solo admin.
   - tasques: leer admin o operari incluido en operariIds; crear/editar admin; un operari solo puede actualizar estat, temps*, fotoFinal, signatura, nomSignatari, observacionsTancament de tareas suyas (usa request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])).
   - tasques_programades y rols: solo admin.
7. Elimina la auto-siembra de datos demo cuando la colección está vacía (initFirebaseSync, líneas ~2114-2170). Pásala a un script opcional `scripts/seed-demo.mjs` solo para el emulador.
8. Quita los textos «PIN per defecte: 1234» y los mensajes que revelan la contraseña.

Verificación obligatoria:
- Tests de reglas con @firebase/rules-unit-testing contra el Firebase Emulator (tests/rules.test.mjs): anónimo no lee ni escribe nada; operari A no puede leer ni editar tareas de B ni cambiar `prioritat`; admin puede todo.
- Prueba en el navegador integrado: login admin, login operari, logout, y que escribir {role:'admin'} en localStorage NO da acceso.
- No ejecutes `firebase deploy`. Entrega un resumen de pasos manuales de despliegue.
```

---

## Fase 2 — Eliminar XSS y bugs de handlers inline

```text
En brigada-mantenimiento/index.html hay ~37 asignaciones a innerHTML con plantillas que interpolan datos de usuario sin escapar (titol, descripcio, motiu, nom, rol, observacions, via...). Un título `<img src=x onerror=...>` ejecuta código. Además, `onclick="openModalResetPin(${op.id}, '${op.nom}')"` se rompe con nombres con apóstrofe («Miquel D'Oliva»).

Tareas:
1. Añade una función `esc(str)` que escape & < > " ' y aplícala a TODA interpolación de datos en plantillas HTML. Para URL (wa.me, tel:, maps) usa encodeURIComponent y valida el esquema.
2. Sustituye los onclick inline que pasan strings por data-attributes (data-action, data-id) y un único listener delegado en document. Nunca pases nombres como argumento en atributos.
3. Añade una Content-Security-Policy en firebase.json (headers) compatible con las CDN usadas; documenta qué hace falta para quitar 'unsafe-inline' más adelante.

Verificación: test Playwright (tests/e2e/xss.spec.mjs) que crea una incidencia con título `<img src=x onerror="window.__xss=1">` y un operario «Miquel D'Oliva», y comprueba que window.__xss es undefined, que el texto se ve literal y que el modal Reset PIN abre sin errores en consola.
```

---

## Fase 3 — Offline real (Service Worker + persistencia)

```text
Problemas: (a) el SW se registra como './public/sw.js' y su scope es /public/, así que no controla index.html; (b) sin red, el estado solo vive en memoria y se pierde al recargar; (c) el manifest apunta a icons/ que no existen.

Tareas:
1. Mueve sw.js y manifest.json a la raíz de brigada-mantenimiento/ y actualiza referencias y precache (con versiones fijas de las librerías).
2. Activa la persistencia offline de Firestore: initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }). Eso da cola de escrituras y lectura offline sin IndexedDB manual.
3. El indicador de conexión debe reflejar el estado real de sincronización (snapshot.metadata.hasPendingWrites / fromCache), no solo navigator.onLine. Texto en catalán: «Sense connexió — es sincronitzarà».
4. Genera icons/icon-192.png, icon-512.png y una versión maskable a partir de logo-santa-eugenia.jpg.
5. Sustituye los `.catch(() => {})` por un aviso visible no bloqueante (toast) cuando falle una escritura.

Verificación en el navegador integrado: carga, pasa a offline, finaliza una tarea, recarga (debe abrir), vuelve a online y comprueba que el cambio llega a Firestore (emulador). Lighthouse PWA: instalable.
```

---

## Fase 4 — Fotos y firmas fuera del documento de la tarea

```text
Fotos (fotoInicial, fotoFinal) y firma se guardan en base64 dentro de tasques/{id}; el documento mayor ya pesa 435 KB y el límite es 1 MiB. El proyecto está en plan Spark (sin Storage).

Opción A (Spark): guarda cada adjunto en una subcolección tasques/{id}/adjunts/{tipus} (un documento por imagen, < 900 KB, comprobado antes de escribir) y en la tarea solo un flag/metadata. Carga los adjuntos bajo demanda (al abrir la foto o el informe), no en el listado.
Opción B (si el Ajuntament acepta Blaze): Cloud Storage con reglas por rol, y en la tarea solo la ruta.
Implementa la opción A y deja la B documentada. Ajusta las reglas de la fase 1 a la subcolección. Haz que en iOS (sin WebP en canvas) el JPEG se recomprima hasta < 300 KB.
Verificación: tarea con 2 fotos de 12 MP + firma → documento de tarea < 20 KB; el informe PDF sigue mostrando las fotos.
```

---

## Fase 5 — Usabilidad (resultado del test)

```text
Corrige estos defectos del test de usabilidad (ver docs/AUDITORIA_2026-11-12.md §3):
1. Cierre de orden: la firma manuscrita y el nombre del firmante son OBLIGATORIOS; elimina el autorrelleno del nombre y el «sello digital» automático. Botón de confirmar fijo (sticky) al pie del modal.
2. «Generar totes les ordres pendents»: idempotente. No crees una orden si ya existe una abierta de la misma programada en el mismo periodo (guarda ultimaGeneracio y comprueba). Deshabilita el botón mientras se ejecuta.
3. Responsive a 320 px: sin scroll horizontal; cabecera compacta en una línea (logo + «Brigada SE» + estado + menú); «Sortir» siempre visible.
4. Zonas táctiles ≥ 44 px («Sortir», «Ampliar foto», «Esborrar firma», cerrar modales, pestañas del login). Texto mínimo de 12 px (14 px en la vista de operario).
5. Quita maximum-scale=1 y user-scalable=no. Añade <label> al selector de operario. Corrige los contrastes señalados por axe.
6. Sustituye alert() por toasts no bloqueantes y confirm() por modales propios.
7. Spinner o estado «Desant…» en crear incidencia y en el cierre.
8. Quita «Trucar» y «WhatsApp» de la tarjeta del propio operario. Muestra «Sense ubicació» en lugar de «0 m».
9. Revisión lingüística en catalán: «Sin conexión» → «Sense connexió», «Resoltas» → «Resoltes», «Núcli» → «Nucli», «Vía» → «Via», «Callejero» → «Nomenclàtor».
Verificación: Playwright + axe-core en Pixel 7, iPhone SE y escritorio: 0 violaciones critical/serious, sin overflow-x, sin zonas táctiles < 44 px en la vista de operario.
```

---

## Fase 6 — Higiene del repositorio y despliegue

```text
1. Borra brigada-mantenimiento/src/index.html (copia duplicada).
2. firebase.json: añade a "ignore" docs/**, tests/**, scripts/**, server.*, package*.json, *.md.
3. Fija versiones: lucide@0.468.0 (o la que se use) en lugar de @latest. Sustituye el CDN de Tailwind por un build (npx tailwindcss -o dist.css --minify) y comítalo como asset.
4. Sustituye tests/autotest.ps1 por tests Playwright ejecutables en Linux/Windows (npm test) y un workflow de GitHub Actions que ejecute reglas + e2e en cada PR.
5. Actualiza los README (raíz y app): stack real Firebase, cómo usar el emulador, despliegue, roles. Archiva docs/arquitectura-supabase.sql en docs/archivo/ y corrige los enlaces file:///C:/.
6. Divide index.html en módulos ES (js/state.js, js/auth.js, js/tasques.js, js/operaris.js, js/ui.js) sin cambiar el comportamiento, en commits pequeños.
```

---

## Fase 7 — Backoffice (ver el catálogo más abajo)

Después de las fases 1–6. Se recomienda empezar por **Informes** e **Inventario/Stock**. El prompt de cada módulo se redacta a partir de su ficha.

---

# Catálogo de funcionalidades de backoffice

Prioridad: **P1** = alto valor y poco esfuerzo; **P3** = estratégico o de más esfuerzo.

### A. Informes y analítica

| Prio | Funcionalidad | Detalle |
|---|---|---|
| P1 | **Informe mensual de actividad** | Órdenes abiertas, cerradas y pendientes por especialidad, núcleo y operario; tiempo medio de resolución; urgentes fuera de plazo. Exportable a PDF con el escudo y a Excel/CSV |
| P1 | **Exportación CSV/Excel** de órdenes, horas y materiales | Para Intervención o Secretaría y para justificar subvenciones |
| P1 | **Parte de horas por operario** | Horas por día y semana, deducción de pausas, horas por tarea y por centro de coste. Base para nómina y horas extra |
| P2 | **Informe de coste por actuación** | Horas × coste/hora por categoría + materiales consumidos = coste real de cada orden y de cada edificio o vía |
| P2 | **Cuadro de mando de SLA** | Plazo objetivo por prioridad (urgente < 24 h…), % de cumplimiento, envejecimiento de la cartera |
| P2 | **Mapa de calor de incidencias** | Por vía o núcleo y por categoría: detecta puntos negros (fugas, alumbrado) |
| P2 | **Informe para el Pleno o la Junta de Gobierno** | Resumen trimestral automático en lenguaje claro |
| P3 | **Informes programados por email** | Envío automático el día 1 de cada mes al alcalde y al regidor (requiere Blaze o un servicio externo) |

### B. Inventario y stock de mantenimiento

| Prio | Funcionalidad | Detalle |
|---|---|---|
| P1 | **Catálogo de materiales** | Referencia, descripción, unidad, familia (eléctrico, fontanería, pintura, señalización…), coste unitario, proveedor |
| P1 | **Consumo de material en el cierre de la orden** | El operario selecciona materiales y cantidades; el stock baja y el coste se imputa a la orden |
| P1 | **Stock mínimo y alertas** | Aviso al admin cuando un artículo baja del mínimo; lista de «a pedir» |
| P2 | **Varios almacenes** | Nave municipal, furgonetas y edificios; traspasos entre ellos |
| P2 | **Entradas de material y albaranes** | Recepción con foto del albarán y vinculación al proveedor y al pedido |
| P2 | **Propuesta de pedido** | Genera la lista para contratación menor por proveedor |
| P2 | **Herramientas y maquinaria** | Préstamo y devolución por operario, estado, próxima revisión (desbrozadoras, generadores, escaleras) |
| P3 | **Lectura QR/código de barras** | Con la cámara del móvil para sacar material o fichar herramientas |

### C. Activos y mantenimiento preventivo

| Prio | Funcionalidad | Detalle |
|---|---|---|
| P1 | **Inventario de activos municipales** | Edificios, farolas, fuentes, parques infantiles, contenedores, vehículos, con ubicación en el mapa e historial de órdenes |
| P2 | **Fichas QR en los activos** | El operario escanea el QR de la farola o caldera y ve su historial o abre una orden |
| P2 | **Revisiones legales** | Calendario de inspecciones obligatorias (RITE calderas, baja tensión, parques infantiles UNE-EN 1176, extintores, legionela) con avisos de vencimiento |
| P2 | **Vehículos de la brigada** | Kilometraje, ITV, seguro, mantenimiento, combustible |
| P3 | **Planificador semanal (Gantt/calendario)** | Arrastrar órdenes a operarios y días, viendo ausencias y especialidades |

### D. Ciudadanía y coordinación

| Prio | Funcionalidad | Detalle |
|---|---|---|
| P2 | **Formulario público de avisos** | El vecino envía foto + ubicación, el aviso entra como «pendiente de validar» y recibe un número de seguimiento. Requiere moderación y aviso RGPD |
| P2 | **Notificación al ciudadano** al cerrar la orden (email o SMS) |
| P2 | **Avisos internos de otros departamentos** | Policía Local, escoleta o polideportivo crean peticiones con su propio rol |
| P3 | **Notificaciones push** al operario cuando se le asigna una urgencia (requiere FCM) |

### E. Administración, cumplimiento y RGPD

| Prio | Funcionalidad | Detalle |
|---|---|---|
| P1 | **Registro de auditoría** | Quién cambió qué y cuándo (append-only), sobre todo en cierres, firmas y cambios de alcance |
| P1 | **Gestión de usuarios y roles** | Admin, cap de brigada, operario, consulta (alcaldía) y otros departamentos |
| P2 | **Política de conservación** | Borrado o anonimización de fotos con personas y matrículas después de X meses; registro de actividades de tratamiento |
| P2 | **Copias de seguridad programadas** de Firestore |
| P3 | **Integración con el gestor de expedientes** (p. ej. Gestiona) para órdenes que requieren expediente |

**Hoja de ruta sugerida tras las fases 1–6:**

1. Registro de auditoría + roles (E1 y E2).
2. Catálogo de materiales + consumo en el cierre + alertas de stock mínimo (B1–B3).
3. Informe mensual + CSV + parte de horas (A1–A3).
4. Inventario de activos + revisiones legales (C1 y C3).
