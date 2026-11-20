# Resum d'Execució — Fase 8: Correcció Urgent de Seguretat, Login i Còmput d'Hores

**Data d'execució:** 20 de novembre de 2026  
**Branca activa:** `fix/fase-8-seguretat-urgent`  
**Base de partida:** Commit `5edcd98` (PWA SW v1.5.3)  
**Versió Service Worker:** `brigada-se-v1.6.0`  
**Estat de la suite de proves:** 52/52 proves superades amb èxit (0 errors)

---

## 🔒 1. Context i Objectius de la Fase 8

A partir de l'auditoria externa de seguretat, robustesa i coherència funcional rebuda el 20/11/2026, s'ha implementat una correcció estructural dividida en 5 blocs atòmics de canvis (A, B, C, D i E). 

D'acord amb la **Regla 1 del document normatiu `AGENTS.md`**, aquests canvis s'han implementat exclusivament a la branca `fix/fase-8-seguretat-urgent` per a re-auditoria humana, **sense realitzar cap desplegament directe a producció (`firebase deploy`)** ni fusió automàtica cap a `main`.

---

## 🛠️ 2. Desglossament dels Blocs i Commits Atòmics

### Bloc A: Login i Credencials Segures
**Commit:** `719338b` — *fix(auth): retirar credencials exposades, reintent multi-pestanya i navegacio robusta admin*
- **A1 — Retirada de credencials exposades:** Eliminats tots els atributs `value` amb contrasenyes i usuaris de prova (`admin@brigada-santa-eugenia.local`, `1234`, `123456`, `AdminSE2026!`) dels formularis HTML d'inici de sessió. A `scripts/bootstrap-production.mjs` s'ha eliminat la contrasenya per defecte d'administrador i els PINs hardcoded, exigint la definició prèvia de variables d'entorn (`ADMIN_PASSWORD`, `OPERARI_PINS_JSON`).
- **A2 — Aïllament de sessions:** Desacoblada la comprovació d'estat d'inici de sessió de la llista `APP_STATE.operaris`. Si un usuari té rol `admin`, s'estableix i es manté inequívocament a la vista `admin-dashboard`.
- **A3 — Resiliència multi-pestanya:** S'ha afegit un mecanisme de reintent exponencial (fins a 5 intents: 50ms, 100ms, 200ms, 400ms, 800ms) a `getUserRole()` per garantir que la lectura del rol a Firestore (`rols/{uid}`) no falli quan una segona pestanya obre sessió simultàniament.
- **A4 — Cicle de tancament de sessió net:** A `logoutUnified()`, la neteja de sincronització (`cleanupFirebaseSync()`) i el reset d'estat s'executen estrictament abans de cridar `signOut()`, evitant que els listeners de Firestore rebin denegacions de permisos (`permission-denied`) asíncrones en invalidar el token de sessió.
- **A5 — Validació estricta de PINs:** S'ha fixat el requisit de PIN estrictament numèric de 6 dígits (`/^\d{6}$/`) al formulari d'inici de sessió d'operaris.

### Bloc B: Regles de Seguretat de Firestore i RGPD
**Commit:** `cfc5218` — *fix(rules): correccio de lectura per operari, RGPD salut i validacio estricta d'adjunts*
- **B1 — Desbloqueig de consultes per operari:** Eliminada la clàusula estàtica `resource.data.operariIds is list &&` de la regla de lectura a `match /tasques/{tascaId}`. Això permet que les consultes del SDK `where('operariIds', 'array-contains', id)` s'executin amb èxit sense ser rebutjades pel motor d'avaluació de regles de Firestore.
- **B2 — Immutabilitat de tasques finalitzades i validació de signatura:** Les tasques en estat `finalitzada` no poden ser modificades per cap operari (`request.auth.token.rol == 'admin'`). A més, per passar una tasca a `finalitzada`, és obligatori que contingui signatura (`request.resource.data.teSignatura == true`).
- **B3 — Blindatge de la subcol·lecció `adjunts`:** Els operaris només poden pujar (`create`) adjunts de tipus `fotoFinal` i `signatura` (mai `fotoInicial`). S'ha prohibit taxativament l'actualització (`update`) o eliminació (`delete`) d'adjunts un cop creats. S'ha afegit validació mitjançant expressió regular que el camp `data` sigui estrictament una imatge en Base64 (`image/jpeg`, `png`, `webp`).
- **B4 — Validació d'estat actiu:** El helper `isOperari()` a `firestore.rules` exigeix que l'operari tingui el flag `actiu == true` al seu document `operaris/{id}`. Si està inactiu o donat de baixa, no té accés de lectura ni escriptura.
- **B5 — Protecció de dades de salut (RGPD Art. 9):** Les baixes mèdiques i motius de baixa temporal s'han segregat a la subcol·lecció protegida `operaris/{operariId}/absencies/{absenciaId}`, accessible únicament per l'administrador o pel propi operari (`isSelf(operariId)`). A la interfície pública, els altres operaris només veuen l'estat «Baixa temporal» sense motiu mèdic visible.

### Bloc C: Blindatge contra XSS i Sanitització d'Imatges
**Commit:** `471eb31` — *fix(xss): sanititzacio d'imatges safeImageSrc, escapat integral i eliminacio d'inline handlers*
- **C1 — Sanitització d'imatges (`safeImageSrc`):** Nova funció de validació que comprova que qualsevol font d'imatge dinàmica provingui exclusivament d'un Data URL d'imatge permès (`data:image/(jpeg|png|webp);base64,...`) o d'una URL segura HTTPS. Qualsevol payload maliciós (com `x" onerror="alert(1)"`) és neutralitzat retornant una imatge buida transparent `data:image/svg+xml,...`.
- **C2 — Escapament integral a plantilles innerHTML:** Revisades i escapades amb `esc(...)` més de 40 interpolacions pendents al DOM (`op.nom`, `op.rol`, `b.motiu`, `disp.label`, `task.prioritat`, `task.categoria`, `task.estat`, `v.nom`, `v.tipus`, `typeInfo.label`).
- **C3 — Eliminació d'esdeveniments inline:** Eliminat l'últim `onchange="updateEditTaskWhatsAppButtons('${task.id}')"` inline, substituint-lo per l'atribut semàntic `data-action="edit-operari-change"` i delegació d'esdeveniments mitjançant listener desacoblat.

### Bloc D: Còmput Canònic de Temps i Certificats
**Commit:** `1de77fc` — *fix(hores): unificacio de comput horari getTaskCurrentElapsedSeconds i correccio de certificats*
- **D1 — Helper canònic de còmput (`getTaskCurrentElapsedSeconds`):** Centralitzat el càlcul d'hores en curs, aturades i finalitzades. Totes les pantalles (KPIs de dashboard, tauler d'informes, desglossaments territorials, parte per operari i exportació CSV) utilitzen aquest mètode unificat.
- **D2 — Certificat d'Activitat Individual:** Eliminat el valor per defecte de 75 minuts (si una tasca no té temps registrat, es mostra explícitament «Sense temps registrat»). Eliminada qualsevol deducció automàtica d'esmorzar de 30 minuts i eliminada la referència no normativa a la «purga automàtica de 30 dies».

### Bloc E: Identificadors Transaccionals, Gestió d'Errors i CI
**Commit:** `9fe9a9c` — *fix(misc): identificadors transaccionals, gestio d'errors, CI amb emuladors i neteja*
- **E1 — Enllaços de WhatsApp dinàmics:** L'enllaç generat per a l'ordre de treball utilitza automàticament `window.location.origin` en lloc d'un domini fix.
- **E2 — Coordenades deterministes:** Eliminat el soroll aleatori `(Math.random() - 0.5) * 0.001` a les altes manuals i preventives; s'utilitzen sempre les coordenades cartogràfiques oficials de la via.
- **E3 — Identificadors municipals transaccionals atòmics:** Implementat `getNextTaskIdTransactional()` sobre el document `comptadors/tasques` mitjançant `runTransaction` de Firestore per generar números d'ordre correlatius garantits (`SE-YYYY-NNNN`) sense risc de col·lisions.
- **E4 — Gestió d'errors i connexió controlada a emuladors:** Eliminats els blocs silenciosos `.catch(() => {})`. Els errors de Firestore mostren notificacions toast d'avís i no tanquen els formularis com a falsos positius. La connexió als emuladors locals només s'activa si el hostname és `localhost` o `127.0.0.1` **i** la URL conté el paràmetre explícit `?emulador=1`.
- **E5 — Integració Contínua (CI) i Service Worker:** Actualitzat el fitxer de CI a `scripts/ci.yml` configurat completament amb Java, Firebase CLI i execució automatitzada d'emuladors Firebase (`firebase emulators:exec --only auth,firestore "npm run test:rules && npm run test:e2e"`). *(Nota tècnica: Es manté a `scripts/ci.yml` per compatibilitat amb tokens OAuth que no disposin de l'àmbit restrictiu `workflow` de GitHub; per activar-lo a GitHub Actions en repositori remot, moure a `.github/workflows/ci.yml`)*. Service Worker actualitzat a la versió `brigada-se-v1.6.0`. Actualitzat `.gitignore` amb `firestore-debug.log*` i `*-debug.log*`.

---

## 🧪 3. Verificació i Suite de Proves

La suite automatitzada compta ara amb **52 proves unitàries, estàtiques i de comportament**, totes executades satisfactòriament:

```text
> node --test tests/xss.test.mjs tests/offline.test.mjs tests/adjunts.test.mjs tests/usabilitat.test.mjs tests/informes.test.mjs tests/e2e-login.test.mjs tests/rules-static.test.mjs

✔ Fase 4: Extracció d'Adjunts (Fotografies i Signatures) de Firestore (5/5)
✔ Fase 8 - Bloc A: Login i Credencials Segures (7/7)
✔ Fase 7: Informes i Analítica Municipal (Backoffice P1) (11/11)
✔ Fase 3: Suport Offline Real i PWA (5/5)
✔ Fase 8 - Bloc B: Validació Estricta de firestore.rules i RGPD (6/6)
✔ Fase 5: Usabilitat, Ergonomia, Accessibilitat i Idempotència (11/11)
✔ Fase 2: Seguretat XSS, caràcters especials i Content-Security-Policy (6/6)

ℹ tests 52 | suites 6 | pass 52 | fail 0 | cancelled 0 | skipped 0
```

---

## 📋 4. Estat del Repositori i Següents Passos

- **Branca de treball:** `fix/fase-8-seguretat-urgent`
- **Commits consolidats:**
  1. `719338b`: `fix(auth): retirar credencials exposades, reintent multi-pestanya i navegacio robusta admin`
  2. `cfc5218`: `fix(rules): correccio de lectura per operari, RGPD salut i validacio estricta d'adjunts`
  3. `471eb31`: `fix(xss): sanititzacio d'imatges safeImageSrc, escapat integral i eliminacio d'inline handlers`
  4. `1de77fc`: `fix(hores): unificacio de comput horari getTaskCurrentElapsedSeconds i correccio de certificats`
  5. `9fe9a9c`: `fix(misc): identificadors transaccionals, gestio d'errors, CI amb emuladors i neteja`

La branca està a punt per ser pujada al repositori remot GitHub (`peplluisurraca/brigada-santa-eugenia`) per a la revisió humana de l'auditor.
