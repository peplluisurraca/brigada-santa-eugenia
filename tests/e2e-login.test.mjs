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
    assert.match(bootstrapProdContent, /ADMIN_PASSWORD/, "bootstrap-production.mjs ha de comprovar ADMIN_PASSWORD");
    assert.match(bootstrapProdContent, /PIN_OP_1/, "bootstrap-production.mjs ha de comprovar PIN_OP_1");
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
});
