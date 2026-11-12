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
