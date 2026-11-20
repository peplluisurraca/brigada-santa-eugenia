# Contexto_IA — App Brigada Santa Eugènia (PWA de manteniment municipal)

**Última actualización:** 2026-11-20 (Fase 8: Correcció urgent de seguretat, login i còmput d'hores arran d'auditoria).

## Qué es este proyecto
PWA para la Brigada Municipal del **Ajuntament de Santa Eugènia** (Mallorca, CP 07142): órdenes de trabajo e incidencias, vista móvil del operario (PIN, GPS, «Com arribar», WhatsApp, cronómetro, firma), mantenimiento preventivo, nomenclátor oficial (37 vías), gestión de personal y ausencias, e informe PDF.
Es un proyecto **distinto e independiente** de «Proposta Santa Eugènia» (formación en IA, carpeta en ADMINISTRACIONES PÚBLICAS) y de «Santa Eugènia — MITECO 2026 — Mobilitat compartida».

## Ubicaciones
- **Código:** GitHub `peplluisurraca/brigada-santa-eugenia` (rama de producció `main`, branca d'integració `develop`, branca de seguretat `fix/fase-8-seguretat-urgent`). App en `brigada-mantenimiento/index.html`.
- **Firebase:** proyecto `brigada-santa-eugenia` (Firestore + Hosting, plan Spark). Colecciones: `tasques`, `operaris`, `tasques_programades`, `rols`, `comptadors`.
- **Desarrollo anterior:** hecho con Google **Antigravity** (las rutas `C:\Users\jlurracam\.gemini\antigravity\scratch\` aparecen en docs y tests). En Drive existe además `brigada-claude-code.zip` (26/10/2026, otra carpeta).
- **Esta carpeta:** `Cowork/Projects/App Brigada Santa Eugènia/`.

## Estado actual (20/11/2026)
- **Fase 8: Correcció Urgent de Seguretat, Login i Còmput d'Hores (20/11/2026)** a la branca `fix/fase-8-seguretat-urgent`:
  - ✅ **Bloc A (Autenticació i Credencials Segures - commit `719338b`)**: Retirada completa de credencials i PINs per defecte dels formularis HTML i de `scripts/bootstrap-production.mjs`. Enforçat el PIN estrictament numèric de 6 dígits. Aïllament de sessions multi-pestanya amb reintents exponencials de recuperació de rol a Firestore. Desacoblada la comprovació d'inici de sessió d'`APP_STATE.operaris`. Ordre correcte de tancament de sessió (`cleanupFirebaseSync` abans de `signOut`).
  - ✅ **Bloc B (Regles Firestore i RGPD Salut - commit `cfc5218`)**: Desbloquejada la consulta de tasques per operari (retirada la condició estàtica `is list` que impedia consultes `where('operariIds', 'array-contains', id)`). Protecció de tasques finalitzades (immutables per a operaris) i obligatorietat de signatura (`teSignatura == true`). Subcol·lecció `adjunts` restringida a creació de `fotoFinal` i `signatura` amb regex de validació de Base64, prohibint `fotoInicial` a operaris i sobreescriptures. Helper `isOperari()` exigeix `actiu == true`. Segregació de dades de salut a la subcol·lecció protegida `operaris/{id}/absencies/{absId}` (RGPD Art. 9) amb privadesa entre operaris.
  - ✅ **Bloc C (Sanitització d'Imatges i Blindatge XSS - commit `471eb31`)**: Introduïda la utilitat `safeImageSrc(url)` per validar que totes les imatges provinguin de Data URLs Base64 o URLs HTTPS segures. Escapament sistemàtic amb `esc()` de més de 40 interpolacions pendents a plantilles innerHTML. Eliminat l'últim manejador inline `onchange` en favor de delegació d'esdeveniments desacoblada.
  - ✅ **Bloc D (Còmput Canònic de Temps i Certificats - commit `1de77fc`)**: Unificació de tot el càlcul d'hores en el helper canònic `getTaskCurrentElapsedSeconds(task)`. Retirat el valor per defecte de 75 minuts i les deduccions d'esmorzar de 30 minuts als certificats d'activitat (mostra «Sense temps registrat» si és 0). Eliminada la referència no normativa a purga de 30 dies.
  - ✅ **Bloc E (Transaccionalitat, Gestió d'Errors i CI - commit `9fe9a9c`)**: Eliminat el soroll aleatori de coordenades GPS (posicions deterministes). Generador transaccional atòmic d'identificadors municipals (`getNextTaskIdTransactional()`) sobre `comptadors/tasques` (`SE-YYYY-NNNN`). Eliminats els `.catch(() => {})` silenciosos per toasts informatius. Connexió a emuladors protegida estrictament per `localhost`/`127.0.0.1` i paràmetre `?emulador=1`. CI preparat a `scripts/ci.yml` amb execució d'emuladors. Service Worker actualitzat a `brigada-se-v1.6.0`.
  - ✅ **Suite de tests**: 52/52 tests verds a `npm test`.
  - ⚠️ **Desplegament i Fusió**: En compliment de la Regla 1 d'`AGENTS.md`, no s'ha fet deploy directe a producció ni fusió a `main`. Branca llesta a GitHub per a re-auditoria externa.
- **Optimització d'Impressió Oficial PDF en A4 net, Auto-redimensionament del Mapa Leaflet i Gestió d'Equips Multidisciplinaris (19/11/2026)** a la branca `fix/impressio-pdf-i-mapa-dashboard`:
  - ✅ **CSS d'Impressió Oficial Redissenyat (`@media print`)**: S'ha substituït l'antiga estratègia de `visibility: hidden` per `display: none !important` directe sobre totes les vistes, menús i elements de navegació. Això elimina la lentitud/retard en prémer el botó d'impressió (evitant el recalculat complet de la geometria del DOM) i evita la despaginació amb marges superiors massius.
  - ✅ **Enquadernació A4 i Paginació Neta**: S'ha afegit `@page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }`, s'ha desarmat el contenidor flex (`display: block !important; position: static !important; overflow: visible !important`) per a `#print-report-modal` i `#modal-informe-global-pdf`, i s'han protegit taules, capçaleres i blocs de signatura amb `break-inside: avoid !important`. Verificat amb impressió real en Chrome headless reduint el certificat de 3 pàgines desquadrades a exactament 1 pàgina neta.
  - ✅ **Auto-redimensionament robust del Mapa Leaflet (`#map`)**: S'ha afegit un `ResizeObserver` directe sobre el contenidor `#map` i la utilitat `refreshLeafletMapSize()` disparada a `requestAnimationFrame`, 50 ms i 250 ms en accedir a la vista de gestió (`navigateView('admin-dashboard')`) i en canvis de mida de finestra. Es corregeix el defecte pel qual Leaflet calculava una mida de 0 o 256px mostrant un únic mosaic central («Ses Alqueries») envoltat de gris.
  - ✅ **Flux i Criteri d'Operaris Múltiples**: S'ha afegit guia explícita a la interfície indicant que, en assignar diversos operaris a una mateixa tasca, el primer seleccionat actua com a operari responsable de referència (`operariId`), mentre que tots dos tenen accés complet per gestionar cronòmetre, pauses, tancament amb signatura digital i generació de certificats.
  - ✅ **Service Worker v1.5.3**: Actualitzat el nom de memòria cau a `brigada-se-v1.5.3` per a renovació automàtica d'actius a dispositius mòbils i ordinadors.
  - ✅ **Suite de tests**: 37/37 tests verds a `npm test` incloent les noves verificacions de layout d'impressió i robustesa del mapa Leaflet.
- **Correcció del Cronòmetre Dinàmic en Viu, Gestió de Pauses i Tancament d'Ordres amb Temps Real (17/11/2026)** a la branca `fix/cronometre-tasques-en-curs`:
  - ✅ **Substitució del valor estàtic `01:15:20`**: El comptador fix de la targeta d'operari s'ha reemplaçat per un cronòmetre dinàmic en viu segon a segon (`TASK_TIMER_INTERVAL`) formatat en `HH:MM:SS` i vinculat a l'atribut `data-timer-task-id`.
  - ✅ **Càlcul i Acumulació Precisa de Temps (`tempsTotalSegons`, `tempsInici`, `tempsPausa`)**: En prémer *«Pausa / Material»*, el sistema calcula els segons transcorreguts, els suma al temps acumulat i mostra a la targeta pausada el text clar *«Temps aturat: HH:MM:SS»*. En reprendre la feina (*«Reprendre Feina»*), el cronòmetre continua sumant des d'aquell punt exacte.
  - ✅ **Modal de Finalització amb Temps Cronometrat Dinàmic**: Al modal de tancament, `#modal-cronometre-val` es calcula i formata automàticament en funció del temps real efectiu (ex. `1h 1m 7s`), eliminant el text fixat d'`1h 15m`.
  - ✅ **Validació i sincronització amb Firestore**: Sincronització atòmica dels camps de progrés compatibles amb les regles de seguretat de Firestore (`affectedKeys()`).
  - ✅ **Service Worker v1.5.2**: Actualitzat el nom de la memòria cau a `brigada-se-v1.5.2` per a renovació automàtica d'actius.
  - ✅ **Suite de tests**: 35/35 tests verds a `npm test` incloent la nova prova d'usabilitat del cronòmetre en viu.
- **Correcció d'Autenticació, Suport PINs Habituals i Inicialització Mòbil a Producció (Live) (16/11/2026)**:
  - Resolt el problema d'inici de sessió tant a ordinador com a mòbil.
  - ✅ **Compatibilitat Dual de PINs i Contrasenyes**: Suport transparent tant per al PIN habitual de 4 xifres `1234` com per a les noves credencials de 6 xifres (`123456` per a operaris i `AdminSE2026!` o `1234` per a administrador), complint els requisits mínims de seguretat de Firebase Auth sense trencar els hàbits d'ús de la brigada.
  - ✅ **Espera Activa d'Autenticació (`ensureFirebaseAuthReady`)**: Polling actiu i listener d'esdeveniment per no perdre mai l'estat llest de Firebase en xarxes amb latència.
  - ✅ **Inicialització Progressiva i Resistent**: `window.FB` disponible de forma immediata amb doble fallback de Firestore (`memoryLocalCache`).
  - ✅ **Service Worker v1.5.1**: Renovació immediata de la memòria cau a tots els dispositius.
  - ✅ Desplegat a Firebase Hosting (`https://brigada-santa-eugenia.web.app`) i validat automàticament amb proves reals en navegador headless.
- **Desplegament de la Fase 7 a Producció (Live) completat (16/11/2026)**:
  - Consolidació i fusió de `feat/fase-7-informes` cap a `develop` i `main` (commit `1fb2f25`).
  - Desplegament amb èxit a Firebase Hosting (`https://brigada-santa-eugenia.web.app`) i Firestore Rules sota autorització expressa de l'usuari.
  - Verificada la resposta en viu `HTTP 200`, el funcionament de la nova vista d'informes i analítica municipal, la correcció de l'indicador «● En línia» al header i el blindatge de selectors d'operaris contra pantalles buides.
- **Fase 7 completada (16/11/2026)**:
  - ✅ **Mòdul complet d'Informes i Analítica Municipal**: Nova vista d'administració (`view-informes-analitica`) amb pestanya de navegació dedicada (`tab-informes-analitica`) i icona `bar-chart-3`.
  - ✅ **Filtres ràpids i controls d'àmbit**: Botons de selecció de període (`mes_actual`, `mes_anterior`, `trimestre`, `any_actual`, `tots`) i desplegables per Nucli (4 nuclis oficials), Especialitat i Operari amb etiquetes accessibles (`label for`).
  - ✅ **Tauler de Mètriques KPI**: Càlcul dinàmic d'ordres totals, taxa de resolució (%), hores reals totals registrades, temps mitjà de resolució i compliment d'urgències.
  - ✅ **Desglossament d'activitat i Territori**: Gràfics de barra i percentatges per especialitat (electricitat, obra/paleteria, peó/neteja viària, etc.) i territorial per nucli (Santa Eugènia Vila, Ses Alqueries, Ses Olleries, Ses Coves).
  - ✅ **Parte de Treball per Operari**: Taula detallada de còmput horari del personal de la brigada, tasques assignades, tasques finalitzades i ràtio d'eficàcia.
  - ✅ **Retirada de la deducció automàtica d'esmorzar (Acord Batlia)**: Eliminat el descompte arbitrari de 30 minuts als informes, justificants de treball i modal de tancament. Còmput exclusiu del temps real cronometrat i registrat.
  - ✅ **Exportació oficial a CSV / Excel**: Generació de fitxer CSV amb BOM UTF-8 (`\uFEFF`) per a perfecta visualització de caràcters catalans a Microsoft Excel i separador per punt i coma (`;`), dissenyat per a Secretaria i Intervenció.
  - ✅ **Informe Global PDF Municipal**: Modal d'informe d'activitat amb capçalera oficial de l'Ajuntament de Santa Eugènia, escut municipal (`logo-santa-eugenia.jpg`), taules resumides i peus de signatura per al Cap de la Brigada Municipal i Alcaldia / Regidoria Delegada. Estils CSS `@media print` per impressió neta sense capçaleres de l'app ni elements sobrants.
  - ✅ **Millora d'usabilitat a la capçalera (Header)**: Indicador de connectivitat (`#conn-status`) amb text «● En línia» clarament visible sense classes d'ocultació responsive buides.
  - ✅ **Suite de proves automatitzada**: 9/9 tests verds a `tests/informes.test.mjs`, i suite global de 33/33 proves verdes a `npm test`.
- **Provisió d'Autenticació i Rols a Producció (Live) completada (15/11/2026)**:
  - Activació de Firebase Authentication al projecte `brigada-santa-eugenia`.
  - Executat el script de provisió `scripts/bootstrap-production.mjs`: creats els comptes d'Auth i assignats els documents de rols a Firestore (`rols/{uid}`) per a l'administrador (`admin@brigada-santa-eugenia.local`) i els 4 operaris (`op-1` a `op-4` amb PIN per defecte `123456`).
  - Verificat l'inici de sessió real via API Identity Toolkit i la lectura de rols a Firestore amb token JWT retornant `HTTP 200`.
- **Desplegament a Producció (Live) completat (14/11/2026)**:
  - Fases 1 a 6 consolidades i fusionades a la branca `main` (`ac02c08..a35615c`) i desplegades a Firebase Hosting (`https://brigada-santa-eugenia.web.app`) i Firestore Rules amb autorització de l'usuari.
  - Verificada la resposta en viu `HTTP 200`, capçaleres Content-Security-Policy (CSP), Service Worker v1.4.0 i manifest PWA normatiu.
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
- **Fase 6 completada (13/11/2026)** a la branca `fix/fase-6-higiene-repo`:
  - ✅ **Eliminació de fitxers i còpies duplicades**: esborrat `brigada-mantenimiento/src/index.html` (còpia desfasada de 263 KB), carpetes redundants `public/` i `src/`, servidors i tests antics PowerShell (`server.ps1`, `autotest.ps1`).
  - ✅ **Arxiu de documentació històrica**: moguts els esquemes antics de Supabase i requeriments obsolets a `docs/arxiu/` corregint rutes absolutes de Windows (`file:///C:/`).
  - ✅ **Seguretat de desplegament (`firebase.json`)**: afegit a `"ignore"` els directoris interns `docs/**`, `tests/**`, `scripts/**`, `server.*`, `package*.json`, `*.md` i `src/**` per evitar la publicació indeguda a Firebase Hosting.
  - ✅ **Fixació de dependències i compilació d'estils**: substituït el CDN dinàmic de Tailwind pel build minificat estàtic (`css/dist.css`, 38 KB), fixada la versió de Lucide Icons a `0.468.0`, i actualitzat el Service Worker a la versió `1.4.0`.
  - ✅ **Integració contínua (CI) i proves**: plantilla de workflow de GitHub Actions (`scripts/ci.yml`) per compilar estils i executar la suite de proves en cada PR i push; configurat `npm test` per validar automàticament les 24 proves del projecte (XSS, Offline PWA, Adjunts i Usabilitat).
  - ✅ **Documentació tècnica actualitzada**: actualitzats els fitxers `README.md` (arrel i aplicació) reflectint la pila tecnològica real (Firebase Auth, Cloud Firestore persistent, gestió de rols i PWA).
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
- **PENDIENTE DE VERIFICAR CON EL BATLE (16/11/2026):** Política de la pausa de desayuno (30 min) en el cómputo de horas (horario oficial y circunstancias exactas en que aplica deducción, ej. si no se para el cronómetro). Mientras tanto, se retira cualquier deducción automática de 30 min en informes PDF y exportaciones CSV, computando exclusivamente el tiempo real cronometrado/registrado.
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
