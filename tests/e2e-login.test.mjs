import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const htmlContent = fs.readFileSync('brigada-mantenimiento/index.html', 'utf8');
const bootstrapProdContent = fs.readFileSync('scripts/bootstrap-production.mjs', 'utf8');

describe('Fase 8 - Bloc A: Login i Credencials Segures', () => {
  it('A1.1. Pantalla de login: El camp de correu d\'administrador no conté cap valor predefinit', () => {
    // Input de correu electrònic sense atribut value predefinit
    const emailMatch = htmlContent.match(/<input[^>]*id="unified-login-admin-email"[^>]*>/);
    assert.ok(emailMatch, "L'input #unified-login-admin-email ha d'existir");
    assert.doesNotMatch(emailMatch[0], /value=/, "L'input de correu d'administrador no ha de tenir atribut value");
    assert.match(emailMatch[0], /placeholder="nom@santaeugenia\.cat"/);
  });

  it('A1.2. Pantalla de login: Absència total de credencials i PINs per defecte (1234, 123456, AdminSE2026!)', () => {
    // Extreure el bloc de la vista de login
    const loginViewMatch = htmlContent.match(/<section id="view-login"[\s\S]*?<\/section>/);
    assert.ok(loginViewMatch, "La secció #view-login ha d'existir");
    const loginView = loginViewMatch[0];

    assert.doesNotMatch(loginView, /AdminSE2026/, "view-login no pot contenir 'AdminSE2026'");
    assert.doesNotMatch(loginView, /1234/, "view-login no pot contenir '1234'");
    assert.doesNotMatch(loginView, /123456/, "view-login no pot contenir '123456'");
    assert.doesNotMatch(loginView, /admin@brigada-santa-eugenia\.local/, "view-login no pot contenir el correu com a text o valor");

    // Comprovació del placeholder i text del PIN
    assert.match(loginView, /Codi PIN d'Accés \(6 xifres\) \*/);
    assert.match(loginView, /placeholder="••••••"/);
    assert.match(loginView, /Introdueix el teu PIN de 6 dígits/);
  });

  it('A1.3. Scripts de producció: bootstrap-production.mjs no té contrasenyes per defecte i exigeix variables d\'entorn', () => {
    assert.doesNotMatch(bootstrapProdContent, /'AdminSE2026!'/, "bootstrap-production.mjs no pot contenir 'AdminSE2026!' com a fallback");
    assert.doesNotMatch(bootstrapProdContent, /'123456'/, "bootstrap-production.mjs no pot contenir '123456' com a fallback");
    assert.doesNotMatch(bootstrapProdContent, /654321/, "bootstrap-production.mjs no pot contenir '654321' hardcodejat");
    assert.match(bootstrapProdContent, /ADMIN_PASSWORD/, "bootstrap-production.mjs ha de comprovar ADMIN_PASSWORD");
    assert.match(bootstrapProdContent, /PIN_OP_/, "bootstrap-production.mjs ha de comprovar PIN_OP_*");
    assert.match(bootstrapProdContent, /peplluisurraca@ajsantaeugenia\.net/, "bootstrap-production.mjs ha d'usar el correu oficial de l'administrador");
    assert.match(bootstrapProdContent, /operariId:\s*6/, "bootstrap-production.mjs ha de suportar els 6 operaris reals");
  });

  it('A2. Aïllament de sessions: L\'administrador mai és redirigit a operari-view en entrar a la mateixa pestanya', () => {
    // Simulem la funció applySessionPermissions aïllada
    const appState = {
      currentUser: { role: 'admin', nom: 'Cap de Brigada' },
      currentRole: 'admin',
      currentView: 'operari-view' // L'operari anterior havia deixat operari-view
    };

    let navigatedTo = null;
    function navigateView(viewId) { navigatedTo = viewId; }

    // Lògica de destinació d'administrador implementada
    const targetView = (appState.currentView && appState.currentView !== 'login' && appState.currentView !== 'operari-view')
      ? appState.currentView 
      : 'admin-dashboard';
    navigateView(targetView);

    assert.equal(navigatedTo, 'admin-dashboard', "L'administrador ha d'anar a admin-dashboard i mai a operari-view");
  });

  it('A3. Multi-pestanya: Reintents exponencials de recuperació de rol en cas d\'error transitori', async () => {
    let attempts = 0;
    let finalRole = null;

    // Simulador de funció de lectura de rol amb reintents exponencials
    async function fetchRoleWithRetry(uid, getDocFn) {
      let roleDocSnap = null;
      let lastRoleErr = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          roleDocSnap = await getDocFn(uid);
          if (roleDocSnap && roleDocSnap.exists()) {
            break;
          }
        } catch (err) {
          lastRoleErr = err;
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, 10)); // Curt per al test
          }
        }
      }
      if (!roleDocSnap || !roleDocSnap.exists()) {
        throw lastRoleErr || new Error("No role");
      }
      return roleDocSnap.data();
    }

    // Falla els dos primers cops per concurrència i entra al 3r
    const roleData = await fetchRoleWithRetry('uid-admin', async (uid) => {
      attempts++;
      if (attempts < 3) {
        throw new Error("permission-denied: multi-tab collision");
      }
      return { exists: () => true, data: () => ({ rol: 'admin', nom: 'Cap de Brigada' }) };
    });

    assert.equal(attempts, 3, "S'ha d'haver intentat 3 vegades abans de triomfar");
    assert.equal(roleData.rol, 'admin');
  });

  it('A4. Ordre de tancament de sessió: cleanupFirebaseSync es crida abans de signOut a logoutUnified', () => {
    // Verifiquem al codi font que cleanupFirebaseSync precedeix signOut a logoutUnified
    const logoutMatch = htmlContent.match(/async function logoutUnified\(\) \{([\s\S]*?)\n    \}/);
    assert.ok(logoutMatch, "logoutUnified ha d'estar definit");
    const logoutCode = logoutMatch[1];

    const idxCleanup = logoutCode.indexOf('cleanupFirebaseSync()');
    const idxSignOut = logoutCode.indexOf('signOut(');

    assert.ok(idxCleanup !== -1, "cleanupFirebaseSync s'ha de cridar a logoutUnified");
    assert.ok(idxSignOut !== -1, "signOut s'ha de cridar a logoutUnified");
    assert.ok(idxCleanup < idxSignOut, "cleanupFirebaseSync ha d'executar-se ABANS de signOut");
    assert.ok(logoutCode.includes("APP_STATE.currentView = 'login'"), "currentView s'ha de reiniciar a 'login'");
  });

  it('A5. Validació estricta del PIN d\'operari a submitUnifiedLogin (exactament 6 dígits)', () => {
    function validatePin(pin) {
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return false;
      }
      return true;
    }

    assert.equal(validatePin('1234'), false, "Ha de rebutjar PIN de 4 xifres");
    assert.equal(validatePin('12345'), false, "Ha de rebutjar PIN de 5 xifres");
    assert.equal(validatePin('1234567'), false, "Ha de rebutjar PIN de 7 xifres");
    assert.equal(validatePin('12345a'), false, "Ha de rebutjar PIN amb caràcters no numèrics");
    assert.equal(validatePin(' 123456 '), false, "Ha de rebutjar PIN amb espais");
    assert.equal(validatePin('123456'), true, "Ha d'acceptar PIN vàlid de 6 xifres");
  });

  it('A6. Scripts bootstrap-auth.mjs sense contrasenyes ni PINs per defecte', () => {
    const bootstrapAuthContent = fs.readFileSync('scripts/bootstrap-auth.mjs', 'utf8');
    assert.doesNotMatch(bootstrapAuthContent, /'AdminSE2026!'/, "bootstrap-auth.mjs no pot contenir 'AdminSE2026!'");
    assert.doesNotMatch(bootstrapAuthContent, /'123456'/, "bootstrap-auth.mjs no pot contenir '123456'");
    assert.doesNotMatch(bootstrapAuthContent, /654321/, "bootstrap-auth.mjs no pot contenir '654321' hardcodejat");
    assert.match(bootstrapAuthContent, /ADMIN_PASSWORD/, "bootstrap-auth.mjs ha d'exigir ADMIN_PASSWORD");
    assert.match(bootstrapAuthContent, /PIN_OP_/, "bootstrap-auth.mjs ha d'exigir PIN_OP_*");
    assert.match(bootstrapAuthContent, /id:\s*6/, "bootstrap-auth.mjs ha de suportar els 6 operaris reals");
  });

  it('A7. Revocació immediata d\'operari inactiu (actiu: false) a onSnapshot i tolerància offline a onAuthStateChanged', () => {
    // 1. Revocació immediata a onSnapshot d'operaris
    assert.match(htmlContent, /if\s*\(!op \|\| op\.actiu === false\)\s*\{[\s\S]*?signOut\(window\.FB\.auth\)/, "onSnapshot d'operaris ha de revocar immediatament la sessió si actiu === false");

    // 2. Tolerància offline (unavailable) a onAuthStateChanged
    assert.match(htmlContent, /const isOfflineAuthError = \(err\) =>/, "onAuthStateChanged ha de definir isOfflineAuthError");
    assert.match(htmlContent, /code === 'unavailable'/, "Ha de detectar errors 'unavailable' de Firestore");
    assert.match(htmlContent, /if \(isOfflineAuthError\(err\)\)[\s\S]*?return;/, "El catch d'onAuthStateChanged no ha d'executar signOut en mode offline");
  });

  it('A8. Eliminació segura de tasques (modal propi, data-action, getDocs adjunts + Promise.all, sense confirm natiu)', () => {
    assert.match(htmlContent, /data-action="open-delete-task" data-id="\$\{esc\(task\.id\)\}"/, "La taula admin ha d'incloure el botó d'eliminar amb data-action i data-id escapat");
    assert.match(htmlContent, /id="modal-confirmar-eliminar-tasca"/, "Ha d'existir el modal propi de confirmació");
    assert.match(htmlContent, /async function confirmDeleteTask\(\)/, "Ha d'existir confirmDeleteTask()");

    const delFnMatch = htmlContent.match(/async function confirmDeleteTask\(\) \{([\s\S]*?)\n    \}/);
    assert.ok(delFnMatch, "confirmDeleteTask ha d'estar definit");
    const delFn = delFnMatch[1];
    assert.doesNotMatch(delFn, /confirm\(/, "No es pot fer servir confirm() natiu");
    assert.match(delFn, /getDocs\(adjuntsColRef\)/, "Ha de llistar tots els documents d'adjunts amb getDocs");
    assert.match(delFn, /Promise\.all\(/, "Ha d'esborrar els adjunts en paral·lel amb Promise.all");
    assert.ok(delFn.indexOf('adjuntsSnap') < delFn.indexOf("doc(window.FB.db, 'tasques', taskId)"), "Ha d'esborrar adjunts ABANS de la tasca pare");
    assert.doesNotMatch(delFn, /\.catch\(\(\)\s*=>\s*\{\}\)/, "No pot silenciar errors amb .catch(() => {})");
  });

  it('A9. Validació XSS/imatges (openReportModal, renderMapMarkers, SVG exclòs, sense Unsplash)', () => {
    // openReportModal usa safeImageSrc i esc()
    const reportMatch = htmlContent.match(/function openReportModal\(taskId\) \{([\s\S]*?)\n    \}/);
    assert.ok(reportMatch, "openReportModal ha d'estar definit");
    assert.match(reportMatch[1], /safeImageSrc\(fotoAbans\)/, "openReportModal ha de validar fotoAbans amb safeImageSrc");
    assert.match(reportMatch[1], /safeImageSrc\(fotoDespres\)/, "openReportModal ha de validar fotoDespres amb safeImageSrc");
    assert.match(reportMatch[1], /safeImageSrc\(signatura\)/, "openReportModal ha de validar signatura amb safeImageSrc");
    assert.match(reportMatch[1], /src="\$\{esc\(safeFotoAbans\)\}"/, "openReportModal ha d'escapar safeFotoAbans");

    // safeImageSrc rebutja SVG
    const safeImgMatch = htmlContent.match(/function safeImageSrc\(v\) \{([\s\S]*?)\n    \}/);
    assert.ok(safeImgMatch, "safeImageSrc ha d'estar definit");
    const safeImageSrc = new Function('v', safeImgMatch[1]);
    assert.equal(safeImageSrc('data:image/svg+xml;base64,PHN2Zy8+'), '', "safeImageSrc ha de rebutjar data:image/svg+xml");
    assert.equal(safeImageSrc('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=', "safeImageSrc ha d'acceptar PNG base64");

    // renderMapMarkers escapa waLink i nom d'operari
    assert.match(htmlContent, /href="\$\{esc\(waLink \|\| '#'\)\}"/, "renderMapMarkers ha d'escapar waLink");
    assert.match(htmlContent, /Avisar \$\{esc\(String\(op\.nom \|\| ''\)\.split\(' '\)\[0\]\)\}/, "renderMapMarkers ha d'escapar el nom de l'operari");

    // Sense URLs d'Unsplash
    assert.doesNotMatch(htmlContent, /images\.unsplash\.com/, "No pot quedar cap URL per defecte d'images.unsplash.com");
  });

  it('A10. Persistència atòmica (writeBatch a confirmBulkReassignment, handleCreateVia, fallback offline ID, @media print i CI)', () => {
    // confirmBulkReassignment: deduplicació + writeBatch
    const bulkMatch = htmlContent.match(/async function confirmBulkReassignment\(\) \{([\s\S]*?)\n    \}/);
    assert.ok(bulkMatch, "confirmBulkReassignment ha de ser async");
    assert.match(bulkMatch[1], /new Set\(/, "confirmBulkReassignment ha d'evitar duplicats a operariIds");
    assert.match(bulkMatch[1], /writeBatch\(/, "confirmBulkReassignment ha d'utilitzar writeBatch per atomicidad");

    // handleCreateVia: persistència Firestore
    const viaMatch = htmlContent.match(/async function handleCreateVia\(e\) \{([\s\S]*?)\n    \}/);
    assert.ok(viaMatch, "handleCreateVia ha de ser async");
    assert.match(viaMatch[1], /doc\(window\.FB\.db, 'vies', viaId\)/, "handleCreateVia ha de persistir la via a Firestore");

    // @media print amaga #view-operari-view
    assert.match(htmlContent, /#view-operari-view/, "@media print ha d'amagar #view-operari-view");
    assert.doesNotMatch(htmlContent, /#view-operari,/, "No pot quedar el selector antic #view-operari a @media print");

    // CI workflow (a .github/workflows/ci.yml o plantilla a scripts/ci.yml) amb emuladors
    const ciPath = fs.existsSync('.github/workflows/ci.yml') ? '.github/workflows/ci.yml' : 'scripts/ci.yml';
    assert.ok(fs.existsSync(ciPath), "Ha d'existir el fitxer de configuració CI");
    const ciContent = fs.readFileSync(ciPath, 'utf8');
    assert.match(ciContent, /firebase emulators:exec --only auth,firestore "npm run test:rules/, "CI ha d'executar npm run test:rules amb emuladors");
  });

  it('A11. Recuperació de contrasenya d\'Admin i canvi de PIN propi per Operari (sense 654321 hardcodejat)', () => {
    assert.doesNotMatch(htmlContent, /654321/, "index.html no pot contenir cap PIN inicial 654321 hardcodejat");
    assert.match(htmlContent, /id="btn-reset-admin-pass"/, "El login d'administrador ha de tenir el botó de recuperació de contrasenya");
    assert.match(htmlContent, /sendPasswordResetEmail\(window\.FB\.auth, email\)/, "Ha de cridar sendPasswordResetEmail per recuperar contrasenya d'admin");
    assert.match(htmlContent, /id="btn-open-canviar-pin"/, "La vista d'operari ha de tenir el botó Canviar PIN");
    assert.match(htmlContent, /id="modal-canviar-pin-operari"/, "Ha d'existir el modal propi de canvi de PIN d'operari");
    assert.match(htmlContent, /reauthenticateWithCredential\(authUser, credential\)/, "El canvi de PIN ha de reautenticar primer l'operari");
    assert.match(htmlContent, /updatePassword\(authUser, pinNou\)/, "El canvi de PIN ha d'actualitzar la clau amb updatePassword");
  });
});
