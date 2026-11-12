import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'brigada-mantenimiento', 'index.html');

describe('Fase 5: Usabilitat, Ergonomia, Accessibilitat i Idempotència', () => {

  test('1. Meta Viewport accessible sense bloqueig de zoom (WCAG 2 AA)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Ha de permetre zoom (sense maximum-scale=1.0 ni user-scalable=no)
    assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'),
      'El viewport ha de ser estàndard sense user-scalable=no');
    assert.ok(!html.includes('user-scalable=no'),
      'El viewport no pot contenir user-scalable=no');
    assert.ok(!html.includes('maximum-scale=1.0'),
      'El viewport no pot limitar maximum-scale=1.0');
  });

  test('2. Accessibilitat del formulari d\'inici de sessió (etiquetes for associades)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Labels associats amb for als controls de formulari
    assert.ok(html.includes('for="unified-login-operari-select"'),
      'El selector d\'operari ha de tenir una etiqueta <label for="..."> associada');
    assert.ok(html.includes('for="unified-login-operari-pin"'),
      'El camp de PIN ha de tenir una etiqueta <label for="..."> associada');
    assert.ok(html.includes('for="unified-login-admin-email"'),
      'El camp d\'email d\'admin ha de tenir una etiqueta <label for="..."> associada');
    assert.ok(html.includes('for="unified-login-admin-pass"'),
      'El camp de contrasenya d\'admin ha de tenir una etiqueta <label for="..."> associada');

    // Pestanyes de login amb alçada tàctil mínima
    assert.ok(html.includes('id="login-tab-operari"'), 'Ha d\'existir la pestanya de login d\'operari');
    assert.ok(html.includes('id="login-tab-admin"'), 'Ha d\'existir la pestanya de login d\'administrador');
  });

  test('3. Tancament d\'Ordres: Signatura manuscrita i nom del validador estrictament obligatoris (U1)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // 3.1. S\'ha eliminat la generació automàtica del segell digital fraudulent
    assert.ok(!html.includes('function generateDigitalStamp'),
      'generateDigitalStamp s\'ha d\'haver eliminat completament');
    assert.ok(!html.includes('generateDigitalStamp('),
      'No es pot cridar a generateDigitalStamp');

    // 3.2. Validació estricta de nom del signatari abans de tancar
    assert.ok(html.includes('És obligatori indicar el nom i llinatges'),
      'confirmTaskCompletion ha de validar que el nom del signatari no estigui buit');

    // 3.3. Validació estricta de traç manuscrit al canvas abans de tancar
    assert.ok(html.includes('És obligatori signar la conformitat al requadre abans de finalitzar'),
      'confirmTaskCompletion ha de validar que s\'hagi dibuixat una signatura manuscrita');

    // 3.4. No pre-omplir el camp de nom a openModalFinalitzar (ha de ser explícit)
    const openModalSnippet = html.slice(html.indexOf('function openModalFinalitzar('), html.indexOf('function closeModalFinalitzar('));
    assert.ok(openModalSnippet.includes("inputNom.value = ''") || openModalSnippet.includes('inputNom.value = ""'),
      'openModalFinalitzar no ha de pre-omplir el nom del signatari automàticament');

    // 3.5. Botó de validació visible amb contenidor sticky / peu fix
    assert.ok(html.includes('id="btn-confirm-task-completion"'),
      'El botó de confirmar el tancament ha de tenir un identificador dedicat');
  });

  test('4. Idempotència del manteniment preventiu (U3)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // 4.1. Comprovació d\'ordre ja oberta abans de generar-ne una de nova
    assert.ok(html.includes('alreadyOpen') || html.includes('Ja existeix una ordre oberta'),
      'generarOrdreFromProgramada ha de comprovar si ja existeix una ordre oberta per a la tasca periòdica');

    // 4.2. Assignació de programadaId a la nova tasca generada
    assert.ok(html.includes('programadaId: prog.id'),
      'La tasca generada ha d\'incloure programadaId per a traçabilitat');

    // 4.3. Deshabilitar botó i feedback durant la generació en bloc
    assert.ok(html.includes('btn-generar-totes-programades'),
      'Ha d\'existir el botó btn-generar-totes-programades per controlar la generació');
    assert.ok(html.includes('Totes les rutines preventives actives ja tenen ordres en curs obertes al taulell'),
      'generarTotesOrdresPendents ha d\'avisar si totes les ordres ja estan en curs');
  });

  test('5. Retirada de botons d\'auto-trucada a la targeta d\'operari en torn (U10)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // La targeta de l'operari en torn (operari-work-panel) no ha de tenir botó de trucar-se a si mateix (600112233)
    assert.ok(!html.includes('tel:600112233'),
      'S\'han d\'eliminar els enllaços tel:600112233 de la barra de l\'operari actiu');
    assert.ok(!html.includes('wa.me/34600112233'),
      'S\'han d\'eliminar els enllaços wa.me a si mateix');
  });

  test('6. Càlcul de distància GPS: format "Sense ubicació" si no hi ha senyal (U11)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // formatDistance ha de retornar "Sense ubicació" quan distKm és invàlid o nul
    assert.ok(html.includes('function formatDistance('), 'Ha d\'existir la funció formatDistance');
    assert.ok(html.includes('"Sense ubicació"'), 'formatDistance ha de retornar "Sense ubicació"');
  });

  test('7. Revisió lingüística integral en català normatiu (U12)', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Absència de castellanismes i errades tipogràfiques
    assert.ok(!html.includes('Callejero'), 'No hi pot haver cap referència a "Callejero"');
    assert.ok(!html.includes('Núcli'), 'No hi pot haver cap accent erroni a "Núcli" (correcte: "Nucli")');
    assert.ok(!html.includes('Vía'), 'No hi pot haver cap accent agut a "Vía" (correcte: "Via")');
    assert.ok(!html.includes('resoltas'), 'No hi pot haver cap forma incorrecta "resoltas"');

    // Eliminació d'alertes bloquejants alert(...)
    const alertMatches = html.match(/alert\s*\(/g);
    assert.equal(alertMatches, null, 'No ha de quedar cap crida a alert() a index.html (substituïts per showToast)');
  });

  test('8. Ergonomia tàctil: zones de toc mínimes (≥ 44 px) i mides de text accessibles', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Botons clau amb min-touch i min-h-[44px]
    assert.ok(html.includes('btn-operari-tab-pendents'), 'Pestanya de pendents ha d\'existir');
    assert.ok(html.includes('btn-operari-tab-resoltes'), 'Pestanya de resoltes ha d\'existir');
    assert.ok(html.includes('min-h-[44px]'), 'S\'ha d\'establir l\'alçada mínima tàctil min-h-[44px]');
  });

});
