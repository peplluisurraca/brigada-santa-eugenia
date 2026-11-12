# Contexto_IA — App Brigada Santa Eugènia (PWA de manteniment municipal)

**Última actualización:** 2026-11-12 (creado por Claude Code a petición de Xavi; primera versión. Pendiente de validación humana).

## Qué es este proyecto
PWA para la Brigada Municipal del **Ajuntament de Santa Eugènia** (Mallorca, CP 07142): órdenes de trabajo e incidencias, vista móvil del operario (PIN, GPS, «Com arribar», WhatsApp, cronómetro, firma), mantenimiento preventivo, nomenclátor oficial (37 vías), gestión de personal y ausencias, e informe PDF.
Es un proyecto **distinto e independiente** de «Proposta Santa Eugènia» (formación en IA, carpeta en ADMINISTRACIONES PÚBLICAS) y de «Santa Eugènia — MITECO 2026 — Mobilitat compartida».

## Ubicaciones
- **Código:** GitHub `peplluisurraca/brigada-santa-eugenia` (rama principal `main`). App en `brigada-mantenimiento/index.html` (un solo fichero de unas 4.900 líneas).
- **Firebase:** proyecto `brigada-santa-eugenia` (Firestore + Hosting, plan Spark). Colecciones: `tasques`, `operaris`, `tasques_programades`.
- **Desarrollo anterior:** hecho con Google **Antigravity** (las rutas `C:\Users\jlurracam\.gemini\antigravity\scratch\` aparecen en docs y tests). En Drive existe además `brigada-claude-code.zip` (26/10/2026, otra carpeta).
- **Esta carpeta:** `Cowork/Projects/App Brigada Santa Eugènia/`.

## Estado actual (12/11/2026)
- La app funciona como prototipo avanzado y está desplegada en Firebase Hosting.
- **Fase 1 completada i desplegada (12/11/2026)**:
  - ✅ Implementació real de **Firebase Authentication**: login d'administrador per email/contrasenya i operaris per PIN de 6 dígits (email sintètic `op-<id>@brigada-santa-eugenia.local`).
  - ✅ Gestió de rols centralitzada a Firestore (`rols/{uid}`).
  - ✅ `firestore.rules` i `firestore.indexes.json` configurats i **desplegats a producció amb autorització de l'usuari**. Accés públic no autenticat tancat (verificat error 403 `PERMISSION_DENIED`).
  - ✅ Eliminats tots els PINs i contrasenyes per defecte `1234`, retirats els modals de PIN en text clar i l'emmagatzematge de sessions vulnerables a `localStorage`.
  - ✅ Sincronització de tasques adaptada a consultes per rol (`operariIds array-contains`).
  - ✅ Afegits scripts de provisió (`scripts/bootstrap-auth.mjs`), dades demo (`scripts/seed-demo.mjs`) i suite de tests de regles (`tests/rules.test.mjs`).
- **Fase 2 completada (12/11/2026)** a la branca `fix/fase-2-xss-apostrofs`:
  - ✅ Funció `esc(str)` d'escapat sistemàtic d'HTML (`&`, `<`, `>`, `"`, `'`) aplicada a totes les plantilles i dades d'incidències, operaris, nomenclàtor i tasques programades.
  - ✅ Sanitització d'URLs i enllaços externs (`sanitizeUrl`, `sanitizeTel`, `sanitizeMapsUrl`).
  - ✅ Eliminats els `onclick` inline dinàmics amb concatenació de strings; substituïts per `data-action` i `data-id` amb un únic listener delegat a `document`.
  - ✅ Correcció d'apòstrofs en català (ex. «Miquel D'Oliva», «Font de ses Coves») sense ruptures de sintaxi JS ni DOM.
  - ✅ Unificació de cerca per identificadors (`String(t.id) === String(...)`), reactivant el funcionament de «Finalitzar i Signar» i «Justificant PDF».
  - ✅ Content-Security-Policy (CSP) i capçaleres de seguretat configurades a `firebase.json`.
  - ✅ Suite de tests `tests/xss.test.mjs` amb JSDOM (100% tests verds).
- **Fase 3 completada (12/11/2026)** a la branca `fix/fase-3-offline-pwa`:
  - ✅ Ubicació correcta del **Service Worker (`sw.js`)** i **Manifest (`manifest.json`)** a l'arrel de l'aplicació (`brigada-mantenimiento/`) amb àmbit arrel `{ scope: './' }`.
  - ✅ Estratègia de cau robusta: `network-first` per a documents HTML (garanteix refresc immediat en línia sense fallades offline) i `stale-while-revalidate` per a recursos estàtics i biblioteques externes (CDNs), ignorant el trànsit d'APIs de Firebase/Firestore.
  - ✅ Activació de la **persistència offline nativa de Firestore** (`initializeFirestore` amb `persistentLocalCache` i `persistentMultipleTabManager`), amb cua local de canvis a IndexedDB que se sincronitza automàticament en restablir connexió.
  - ✅ Generació i integració d'icones oficials PWA instal·lables (`icon-192.png`, `icon-512.png`, `icon-maskable.png`) a partir de l'escut municipal, amb suport per a `apple-touch-icon`.
  - ✅ **Indicador visual de connectivitat en temps real** en català normatiu: «*En línia*» (verd), «*Sincronitzant canvis...*» (taronja parpellejant) i «*Sense connexió — es sincronitzarà*» (taronja fix) basat en metadades de Firestore (`snapshot.metadata.hasPendingWrites`). Eliminades totes les cadenes en castellà («Sin conexión»).
  - ✅ Sistema de notificacions emergents no intrusives (**Toasts**) per a canvis de connectivitat i confirmació d'accions en substitució d'`alert()` bloquejants.
  - ✅ Millores a la pantalla d'operari: pestanyes «Tasques Pendents» i «Resoltes / Finalitzades» amb accés directe a justificants PDF i eliminació de referències tècniques («Haversine»).
  - ✅ Suite de tests automatitzada `tests/offline.test.mjs` (100% tests verds).
- **Fase 4 completada (12/11/2026)** a la branca `fix/fase-4-extreure-adjunts`:
  - ✅ Extracció d'imatges i signatures pesades en Base64 cap a la subcol·lecció `tasques/{id}/adjunts/{tipus}` (`fotoInicial`, `fotoFinal`, `signatura`), reduint el document principal de la tasca a < 2 KB (eliminat el risc de superar el límit d'1 MB de Firestore en el pla Spark).
  - ✅ Càrrega sota demanda (**Lazy Loading**) dels adjunts mitjançant `carregarAdjunt(taskId, tipus)` i memòria cau en memòria `ADJUNTS_CACHE` (descarrega fotos només en obrir visors o generar el justificant PDF).
  - ✅ Banderes booleanes lleugeres al document pare (`teFotoInicial`, `teFotoFinal`, `teSignatura`) per a renderitzat ràpid de targetes sense consum de xarxa.
  - ✅ Compressió adaptativa client-side amb fallback a JPEG i límit de mida < 350 KB per a compatibilitat total amb Safari/iOS.
  - ✅ Actualització de `firestore.rules` per blindar la subcol·lecció `match /adjunts/{adjuntId}` amb validació de mida màxima (< 950 KB per fitxer) i permisos estrictes per rol i operari assignat.
  - ✅ Suite de tests automatitzada `tests/adjunts.test.mjs` (100% tests verds).
- **Fase 5 completada (13/11/2026)** a la branca `fix/fase-5-usabilitat`:
  - ✅ **Tancament d'Ordres amb Signatura Manuscrita i Nom Estricte**: eliminat completament el segell digital automàtic (`generateDigitalStamp`), obligant a dibuixar el traç real de conformitat al canvas i indicar nom i llinatges del validador abans de poder tancar qualsevol ordre.
  - ✅ **Modal Finalitzar amb peu sticky**: el botó «*Validar i Finalitzar Definitivament*» és fix al peu del modal (`sticky bottom-0`), sempre accessible en pantalles petites sense dependre d'scroll intern.
  - ✅ **Manteniment Preventiu Idempotent**: comprovació d'ordres prèviament obertes (`alreadyOpen` per `programadaId`) a `generarOrdreFromProgramada` i `generarTotesOrdresPendents`, evitant la duplicació de feines per clics repetits.
  - ✅ **Adaptació Responsive 320 px (iPhone SE)**: capçalera compacta fluidament adaptable sense desbordament horitzontal (`overflow-x`), amb botó «*Sortir*» sempre visible i accessible.
  - ✅ **Accessibilitat (WCAG 2 AA)**: eliminat `user-scalable=no` i `maximum-scale=1.0` del `meta viewport`, afegides etiquetes `<label for="...">` accessibles a tots els camps del login centralitzat i alçades tàctils mínimes (≥ 44 px).
  - ✅ **Ergonomia de la Vista d'Operari**: retirats els botons d'auto-trucada a la targeta personal de l'operari en torn; format de distància GPS adaptatiu que mostra clarament «*Sense ubicació*» si no es disposa de senyal en lloc de «0 m».
  - ✅ **Feedback d'Acció**: estats de càrrega amb bloqueig de botons per prevenir dobles enviaments a la creació d'ordres, login i tancament. Substitució de tots els `alert()` bloquejants per `showToast()`.
  - ✅ **Revisió Lingüística Integral en Català Normatiu**: correcció sistemàtica de «Callejero» → «Nomenclàtor», «Núcli» → «Nucli», «Vía» → «Via».
  - ✅ Suite de tests automatitzada `tests/usabilitat.test.mjs` (8/8 tests verds).
- **Auditoría del 12/11/2026** (`AUDITORIA_2026-11-12.md` en esta carpeta y en el repo, `docs/`):
  - 🔴 **Firestore es público sin autenticar para LEER, ESCRIBIR y BORRAR.** Verificado con sondas que no modifican nada. Expone nombre, teléfono y **PIN** del personal, además de firmas, fotos y ubicaciones.
  - 🔴 Login solo visual: contraseña de admin `1234` en el código, PIN maestro `1234`, sesión falsificable en localStorage.
  - 🔴 XSS almacenado confirmado.
  - 🟠 La app no funciona offline (el Service Worker está mal ubicado); sin Firebase se pierden los datos al recargar; las fotos y firmas en base64 se acercan al límite de 1 MiB (el documento más grande pesa 435 KB).
- **Test de usabilidad** (Playwright, Pixel 7 / iPhone SE / escritorio, con producción bloqueada):
  - Cierre de orden sin firma ni nombre.
  - Un nombre con apóstrofe rompe el reset de PIN.
  - El preventivo se duplica si se genera dos veces.
  - Desbordamiento horizontal a 320 px que oculta «Sortir».
  - Zonas táctiles y textos demasiado pequeños, zoom bloqueado.
  - Mezcla castellano/catalán.
- **Plan de corrección para Antigravity** (`PLAN_ANTIGRAVITY.md`): fases 0–7 con prompts autónomos y un catálogo de funcionalidades de backoffice (informes, stock y almacén, activos y revisiones legales, ciudadanía, auditoría y RGPD).
- En el repo se ha añadido `AGENTS.md` con reglas para agentes (no usar producción, no desplegar, catalán, escapar HTML).

## Decisiones y pendientes
- **PENDIENTE URGENTE (manual, Xavi o el responsable de Firebase):** fase 0. Cerrar las reglas de Firestore, cambiar los PIN reales, hacer una copia de seguridad y valorar con el DPD del Ajuntament si procede notificar el incidente RGPD.
- PENDIENTE: el commit local con la auditoría, `PLAN_ANTIGRAVITY.md` y `AGENTS.md` (rama `claude/focused-darwin-2rx6st`) **no se ha podido subir a GitHub**, porque la app de Claude no tiene acceso al repo. Hay que instalar la Claude GitHub App en el repo o subir los ficheros a mano (están en esta carpeta).
- PENDIENTE de decisión: ¿plan Blaze (Storage, Functions, emails programados) o mantener Spark? Condiciona las fases 4 y 7.
- PENDIENTE de decisión: priorización de los módulos de backoffice (propuesta: auditoría + roles → stock → informes → activos).
- No asumir que existe un contrato o encargo formal con el Ajuntament: no está documentado aquí.

## Próximos pasos
1. Fase 0 (hoy).
2. Fase 1 en Antigravity: Firebase Auth + reglas + tests de reglas.
3. Fases 2–6.
4. Backoffice.
