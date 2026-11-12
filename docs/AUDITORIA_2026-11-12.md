# Auditoría técnica y test de usabilidad — PWA Brigada Municipal de Santa Eugènia

- **Fecha:** 12/11/2026
- **Commit auditado:** `848311a` (rama `main`)
- **Alcance:** código del repositorio, configuración de Firebase, base de datos Firestore en producción (solo sondas que no modifican nada) y test de usabilidad automatizado con Playwright.
- **Pendiente de revisión humana.** Este documento lo ha generado un asistente de IA a partir de pruebas automáticas, y lo debe validar el responsable del proyecto antes de compartirlo con el Ajuntament.

---

## 1. ¿La base de datos es accesible públicamente sin autenticar?

**Sí, para leer, escribir y borrar.** Lo he comprobado el 12/11/2026 contra `brigada-santa-eugenia` (Firestore, base de datos `(default)`), sin ninguna credencial:

| Prueba (API REST, sin token) | Resultado | Significado |
|---|---|---|
| `GET /operaris` | 200, devuelve documentos con los campos `nom`, `telefon`, **`pin`**, `rol`, `especialitat`, `actiu`, `baixes_temporals` | Cualquiera puede descargar los nombres, teléfonos y PIN del personal |
| `GET /tasques` | 200, 6 documentos con `signatura`, `nomSignatari`, `fotoInicial`, `fotoFinal`, `lat`/`lng`, `observacionsTancament` | Firmas manuscritas, fotos y ubicaciones expuestas |
| `GET /tasques_programades` | 200 | Expuesto |
| `PATCH /tasques/{id-inexistente}` con la condición «el documento debe existir» | `NOT_FOUND` (no `PERMISSION_DENIED`) | Las reglas **permiten escribir sin identificarse**. No se ha escrito nada gracias a esa condición |
| `DELETE /operaris/{id-inexistente}` con la misma condición | `NOT_FOUND` | Las reglas **permiten borrar sin identificarse** |
| Listar Firebase Storage | 404 | El bucket no está en uso; las fotos se guardan dentro de Firestore |

**Consecuencias:**

- Fuga de datos personales del personal municipal (RGPD, artículos 5.1.f y 32) y de firmas manuscritas.
- Cualquiera puede borrar o falsear órdenes de trabajo e informes firmados.
- Combinado con el XSS del apartado 3.1, se puede ejecutar código en el navegador del Cap de Brigada.

Lo más probable es que las reglas estén en «modo de prueba» (`allow read, write: if true` o `if request.time < …`). El repositorio no contiene `firestore.rules`, así que no hay control de versiones sobre ellas.

**Acción inmediata recomendada (antes de cualquier otra mejora):**

1. En la consola de Firebase, bloquear las reglas (`allow read, write: if false;`). Así no se pierde ningún dato, pero la app deja de sincronizar hasta implantar el login real (fase 1 del plan para Antigravity).
2. Cambiar todos los PIN reales del personal (`1234` y cualquier otro), porque han estado expuestos.
3. Valorar con el Delegado de Protección de Datos del Ajuntament si procede registrar el incidente (artículo 33 del RGPD).

---

## 2. Hallazgos de seguridad y arquitectura

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| S1 | 🔴 Crítico | Firestore abierto para leer, escribir y borrar | Apartado 1 |
| S2 | 🔴 Crítico | Contraseña de administrador escrita en el código (`'1234'`) | `index.html:2420` |
| S3 | 🔴 Crítico | El PIN maestro `1234` sirve para cualquier operario | `index.html:2447` |
| S4 | 🔴 Crítico | La sesión en `localStorage` se puede falsificar: basta escribir `{role:'admin'}` para entrar como administrador | Test: sesión falsificada → `admin-dashboard` |
| S5 | 🔴 Crítico | XSS almacenado: 37 `innerHTML` con datos sin escapar | Test: título `<img onerror>` → código ejecutado |
| S6 | 🟠 Alto | PIN en texto plano, visible en las tarjetas del personal («PIN Actiu: •••• (1234)») | `index.html:3193` |
| S7 | 🟠 Alto | El Service Worker se registra en `./public/sw.js`, así que solo controla `/public/` y la app no funciona offline | `index.html:4920` |
| S8 | 🟠 Alto | Sin conexión a Firebase, el estado vive solo en memoria y se pierde al recargar (no hay IndexedDB ni cola de sincronización) | Test: tareas finalizadas que vuelven a estar «en curso» tras recargar |
| S9 | 🟠 Alto | Fotos y firma en base64 dentro del documento de la tarea. El documento más grande ya pesa **435 KB**, y el límite de Firestore es de 1 MiB | Sonda de lectura |
| S10 | 🟠 Alto | Si una colección llega vacía, la app vuelve a insertar los datos de demostración, y varios clientes pueden hacerlo a la vez | `index.html:2114-2170` |
| S11 | 🟡 Medio | Hosting publica `docs/`, `tests/`, `server.*` y `package.json` | `firebase.json` |
| S12 | 🟡 Medio | Dependencias sin versión fija (`lucide@latest`) y Tailwind por CDN (no recomendado para producción) | `index.html:21,46` |
| S13 | 🟡 Medio | `src/index.html` es una copia exacta de `index.html` (4.927 líneas) | `diff` |
| S14 | 🟡 Medio | El manifest apunta a `icons/icon-192.png` e `icons/icon-512.png`, que no existen: no se puede instalar en Android y aparecen 404 en consola | Test |
| S15 | 🟡 Medio | Los tests (`autotest.ps1`) solo buscan cadenas de texto y usan rutas `C:\Users\jlurracam\...` | `tests/autotest.ps1` |
| S16 | 🟡 Medio | La documentación no coincide con el código: el README habla de Supabase y Vercel, y la especificación enlaza a `file:///C:/...` | `README.md`, `docs/` |
| S17 | 🟢 Bajo | Los errores de Firestore se silencian con `.catch(() => {})`, así que el usuario cree que se ha guardado cuando no es así | Varias líneas |

---

## 3. Test intenso de usabilidad

**Método:** Playwright con Chromium en tres dispositivos: Pixel 7 (412 px), iPhone SE (320 px) y escritorio (1366×850). Firebase estaba **bloqueado por la red** para no tocar producción. Las CDN se sustituyeron por copias locales equivalentes. Se ha medido el tamaño de las zonas táctiles (mínimo 44 px), los textos de menos de 12 px, el desbordamiento horizontal y la accesibilidad con axe-core (WCAG 2 A/AA), y se han probado los flujos completos.

### 3.1 Defectos funcionales encontrados

| # | Severidad | Flujo | Resultado |
|---|---|---|---|
| U1 | 🔴 | Cierre de una orden | **Se puede cerrar sin firma y sin escribir el nombre.** El nombre del firmante se rellena solo con el del operario, y si no hay trazo se genera un «sello digital». La firma pierde valor como prueba de conformidad |
| U2 | 🔴 | Alta de personal | Un nombre con apóstrofe (p. ej. **«Miquel D'Oliva»**, muy habitual en catalán) rompe el botón «Reset PIN»: `onclick="openModalResetPin(5, 'Miquel D'Oliva')"` da el error JS `missing ) after argument list` |
| U3 | 🟠 | Mantenimiento preventivo | Pulsar dos veces «Generar totes les ordres pendents» **duplica** las órdenes (6 → 14 tareas) |
| U4 | 🟠 | iPhone SE (320 px) | Desbordamiento horizontal (contenido de 410 px en 320 px): **el botón «Sortir» queda fuera de la pantalla** |
| U5 | 🟠 | Recargar sin conexión | `ERR_INTERNET_DISCONNECTED`: la app no abre (relacionado con S7) |
| U6 | 🟡 | Indicador de red | Indica «En línia» aunque Firebase no haya cargado. Solo mira `navigator.onLine`, no si sincroniza de verdad |
| U7 | 🟡 | Login | Los errores revelan la contraseña: «La contrasenya és 1234» |
| U8 | 🟡 | Modal de cierre (móvil) | El botón de confirmar queda por debajo del pliegue y hay que desplazar dentro del modal; no hay botón fijo |
| U9 | 🟡 | Crear incidencia | 1,5 s de espera bloqueante sin indicador de carga, porque espera a `setDoc` |
| U10 | 🟢 | Vista del operario | La propia tarjeta del operario ofrece «Trucar» y «WhatsApp»… a sí mismo |
| U11 | 🟢 | Distancia | Muestra «0 m» cuando no hay GPS en lugar de «sin ubicación» |
| U12 | 🟢 | Idioma | Mezcla castellano y catalán: «Sin conexión» (`index.html:2040`), «Resoltas» (debería ser «Resoltes»), «Callejero», «Núcli» (debería ser «Nucli»), «Vía» (debería ser «Via») |

### 3.2 Ergonomía y accesibilidad

| Pantalla | Zonas táctiles < 44 px | Textos < 12 px | axe-core (WCAG AA) |
|---|---|---|---|
| Login (móvil) | 2 (pestañas Operari/Administrador, 32 px de alto) | 4 | 🔴 `meta-viewport` (zoom bloqueado), 🔴 `select-name` (selector sin etiqueta), 🟠 contraste ×4 |
| Vista del operario (móvil) | 5: «Sortir» 24 px, «Ampliar foto» **16 px** | 23 (10–11 px) | 🔴 `meta-viewport`, 🟠 contraste ×9 |
| Modal de cierre | 8: «Esborrar firma» 17 px, cerrar 28 px | 28 | — |
| Dashboard (escritorio) | 20 | 42 | — |

**Valoración UX:**

- **Puntos fuertes:** el flujo del operario es claro (Iniciar → Pausa/Material → Finalitzar i Signar), los botones principales son grandes, «Com arribar», «Trucar» y «WhatsApp» resultan muy útiles en campo, los KPI se pueden filtrar y el mapa da una buena visión de conjunto.
- **Puntos débiles:**
  - En móvil, la cabecera ocupa unos 170 px (17 % de la pantalla) porque el título se parte en tres líneas.
  - Abundan los textos de 10–11 px, poco legibles al sol y con guantes.
  - Las zonas táctiles secundarias son demasiado pequeñas.
  - El zoom está bloqueado.
  - Todos los avisos son `alert()` nativos, que interrumpen el flujo.

Las capturas de pantalla las genera el script del test y no están en el repositorio.

---

## 4. Lo que está bien

- `server.js` es correcto (protección contra path traversal, solo GET/HEAD).
- La compresión de imágenes en el cliente reduce mucho el peso.
- Buen enfoque de dominio: nomenclátor oficial, especialidades, ausencias temporales, reasignación en bloque y equipos.
- Commits descriptivos.
