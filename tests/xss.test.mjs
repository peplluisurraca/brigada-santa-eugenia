import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const htmlPath = path.resolve('brigada-mantenimiento/index.html');
const firebaseJsonPath = path.resolve('firebase.json');

test('Fase 2: Seguretat XSS, caràcters especials i Content-Security-Policy', async (t) => {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  await t.test('1. Funció esc(str) escapa correctament entitats HTML', () => {
    // Extreure funció esc del codi font
    const match = htmlContent.match(/function esc\(str\) \{([\s\S]*?)\n    \}/);
    assert.ok(match, 'La funció esc ha d\'estar definida a index.html');
    
    const esc = new Function('str', match[1]);

    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(''), '');
    assert.equal(esc(123), '123');
    assert.equal(esc(true), 'true');

    // Payloads XSS
    assert.equal(
      esc('<img src=x onerror="window.__xss=1">'),
      '&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;'
    );
    assert.equal(
      esc('<script>alert("XSS")</script>'),
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );

    // Apòstrofs en català
    assert.equal(esc("Miquel D'Oliva"), "Miquel D&#39;Oliva");
    assert.equal(esc("Plaça de l'Ajuntament"), "Plaça de l&#39;Ajuntament");
    assert.equal(esc('Tomàs & Jeroni "Operaris"'), 'Tomàs &amp; Jeroni &quot;Operaris&quot;');
  });

  await t.test('2. Sanitització d\'URLs i enllaços externs', () => {
    const sanitizeUrlMatch = htmlContent.match(/function sanitizeUrl\([\s\S]*?\n    \}/);
    const sanitizeTelMatch = htmlContent.match(/function sanitizeTel\([\s\S]*?\n    \}/);
    const sanitizeMapsMatch = htmlContent.match(/function sanitizeMapsUrl\([\s\S]*?\n    \}/);

    assert.ok(sanitizeUrlMatch, 'sanitizeUrl ha d\'estar definida');
    assert.ok(sanitizeTelMatch, 'sanitizeTel ha d\'estar definida');
    assert.ok(sanitizeMapsMatch, 'sanitizeMapsUrl ha d\'estar definida');

    const fnScope = new Function(`
      ${sanitizeUrlMatch[0]}
      ${sanitizeTelMatch[0]}
      ${sanitizeMapsMatch[0]}
      return { sanitizeUrl, sanitizeTel, sanitizeMapsUrl };
    `)();

    // URLs permeses
    assert.equal(fnScope.sanitizeUrl('https://example.com'), 'https://example.com');
    assert.equal(fnScope.sanitizeUrl('http://example.com'), 'http://example.com');
    assert.equal(fnScope.sanitizeUrl('tel:+34622334455'), 'tel:+34622334455');
    assert.equal(fnScope.sanitizeUrl('/index.html'), '/index.html');

    // URLs malicioses blocades
    assert.equal(fnScope.sanitizeUrl('javascript:alert(1)'), '#');
    assert.equal(fnScope.sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
    assert.equal(fnScope.sanitizeUrl('vbscript:msgbox(1)'), '#');

    // Telèfon
    assert.equal(fnScope.sanitizeTel('622 33 44 55'), 'tel:622334455');
    assert.equal(fnScope.sanitizeTel('+34 622-33-44-55'), 'tel:+34622334455');
    assert.equal(fnScope.sanitizeTel(''), '#');

    // Google Maps
    assert.ok(fnScope.sanitizeMapsUrl(39.62354, 2.83685).startsWith('https://www.google.com/maps/dir/'));
  });

  await t.test('3. Eliminació d\'onclicks dinàmics concatenats amb identificadors/strings', () => {
    // Comprovar que no queden onclicks inline amb interpolacions ${...} a les plantilles de tasques
    const lines = htmlContent.split('\n');
    const dangerousOnclicks = [];
    lines.forEach((line, i) => {
      if (line.includes('onclick="openEditTaskModal(\'${') ||
          line.includes('onclick="openReportModal(\'${') ||
          line.includes('onclick="openPhotoViewerById(\'${') ||
          line.includes('onclick="openModalFinalitzar(\'${') ||
          line.includes('onclick="pauseTaskMaterial(\'${') ||
          line.includes('onclick="generarOrdreFromProgramada(\'${')) {
        dangerousOnclicks.push(`${i + 1}: ${line.trim()}`);
      }
    });

    assert.equal(
      dangerousOnclicks.length,
      0,
      `S'han trobat onclicks dinàmics no segurs:\n${dangerousOnclicks.join('\n')}`
    );
  });

  await t.test('4. Prova d\'injecció DOM en JSDOM: Payload XSS no s\'executa i apòstrofs no trenquen la renderització', () => {
    const dom = new JSDOM(htmlContent, {
      runScripts: 'outside-only',
      url: 'http://localhost:8080/'
    });
    const { window } = dom;

    // Simular que Tailwind, Leaflet i Lucide existeixen a window
    window.tailwind = { config: {} };
    const dummyLayerGroup = { clearLayers: () => {}, addLayer: () => {}, addTo: function() { return this; } };
    window.L = {
      map: () => ({ setView: () => ({}) }),
      tileLayer: () => ({ addTo: () => ({}) }),
      layerGroup: () => dummyLayerGroup,
      divIcon: () => ({}),
      marker: () => ({ bindPopup: () => ({}), addTo: () => ({}) })
    };
    window.lucide = { createIcons: () => {} };

    // Executar l'script principal a la finestra de JSDOM
    const scripts = dom.window.document.querySelectorAll('script:not([type="module"]):not([src])');
    scripts.forEach(s => {
      window.eval(s.textContent);
    });

    assert.ok(typeof window.esc === 'function', 'window.esc ha d\'existir a la finestra');
    assert.ok(typeof window.renderAdminTasks === 'function', 'renderAdminTasks ha d\'existir');

    // Injectar una tasca amb payload d'injecció de codi i un operari amb apòstrof
    window.APP_STATE.tasks = [
      {
        id: 'SE-XSS-001',
        titol: '<img src=x onerror="window.__xss=1"> Incidència Alumbrat',
        descripcio: '<script>window.__xss=2</script> Reparació farola',
        categoria: 'enllumenat',
        prioritat: 'urgent',
        estat: 'pendent',
        nucli: "Santa Eugènia (Vila)",
        via: "Carrer Major",
        lat: 39.623,
        lng: 2.836,
        operariIds: [99]
      }
    ];

    window.APP_STATE.operaris = [
      {
        id: 99,
        nom: "Miquel D'Oliva",
        rol: "Oficial 1ª",
        especialitat: "enllumenat",
        telefon: "622334455",
        actiu: true
      }
    ];

    // Renderitzar panell d'administració
    window.renderAdminTasks();

    // Comprovar que window.__xss no s'ha executat
    assert.equal(window.__xss, undefined, 'El payload XSS no s\'ha d\'executar sota cap circumstància');

    // Comprovar que el títol està degudament escapat com a text i no hi ha elements img amb onerror
    const tbody = window.document.getElementById('admin-tasks-tbody');
    assert.ok(tbody, 'admin-tasks-tbody ha d\'existir');
    assert.equal(tbody.querySelector('img[onerror]'), null, 'No ha d\'existir cap element img amb manipulador onerror');
    assert.ok(tbody.innerHTML.includes('&lt;img src=x onerror='), 'El payload HTML ha d\'aparèixer com a entitats escapades (&lt;img)');
    assert.ok(tbody.innerHTML.includes("Miquel D&#39;Oliva") || tbody.innerHTML.includes("Miquel D'Oliva"), "El nom de l'operari es renderitza correctament");

    // Provar la vista d'operari
    window.APP_STATE.activeOperari = window.APP_STATE.operaris[0];
    window.renderOperariScreen();

    const operariList = window.document.getElementById('operari-tasks-list');
    assert.ok(operariList, 'operari-tasks-list ha d\'existir');
    assert.equal(operariList.querySelector('img[onerror]'), null, 'Cap element img amb onerror a la vista d\'operari');
    assert.ok(operariList.innerHTML.includes('&lt;img src=x onerror='), 'A la vista d\'operari el títol també està escapat (&lt;img)');

    // Comprovar que els botons d'acció utilitzen data-action i data-id
    const finalitzarBtn = operariList.querySelector('[data-action="open-finalitzar"]');
    assert.ok(finalitzarBtn, 'El botó de finalitzar ha de tenir atribut data-action="open-finalitzar"');
    assert.equal(finalitzarBtn.getAttribute('data-id'), 'SE-XSS-001', 'El botó ha de contenir el data-id de la tasca');

    // Despatxar clic a través del listener delegat de document
    finalitzarBtn.click();

    // Comprovar que s'ha obert el modal de tancament sense llançar cap error
    const modalFinalitzar = window.document.getElementById('modal-finalitzar-tasca');
    assert.ok(!modalFinalitzar.classList.contains('hidden'), 'El modal de finalitzar tasca s\'obre correctament en fer clic al botó');
  });

  await t.test('5. Configuració de Content-Security-Policy a firebase.json', () => {
    const rawJson = fs.readFileSync(firebaseJsonPath, 'utf8');
    const fbConfig = JSON.parse(rawJson);

    assert.ok(fbConfig.hosting, 'firebase.json ha de tenir configuració de hosting');
    assert.ok(Array.isArray(fbConfig.hosting.headers), 'hosting.headers ha d\'existir com a array');

    const globalHeaders = fbConfig.hosting.headers.find(h => h.source === '**');
    assert.ok(globalHeaders, 'Hi ha d\'haver headers globals per a source "**"');

    const cspHeader = globalHeaders.headers.find(h => h.key === 'Content-Security-Policy');
    assert.ok(cspHeader, 'Ha d\'existir la capçalera Content-Security-Policy');

    const cspValue = cspHeader.value;
    assert.ok(cspValue.includes("default-src 'self'"), 'CSP ha d\'incloure default-src');
    assert.ok(cspValue.includes("script-src 'self'"), 'CSP ha d\'incloure script-src');
    assert.ok(cspValue.includes("https://www.gstatic.com"), 'CSP ha de permetre CDN de Firebase (gstatic.com)');
    assert.ok(cspValue.includes("connect-src 'self'"), 'CSP ha d\'incloure connect-src');
    assert.ok(cspValue.includes("https://identitytoolkit.googleapis.com"), 'CSP ha de permetre Firebase Auth');
  });
});
