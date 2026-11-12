import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'brigada-mantenimiento');

describe('Fase 3: Suport Offline Real i PWA', () => {

  test('1. Validació de manifest.json i presència d\'icones', () => {
    const manifestPath = path.join(appDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json ha d\'existir a l\'arrel de l\'aplicació');

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    assert.equal(manifest.lang, 'ca');
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons && manifest.icons.length >= 2, 'manifest.json ha de tenir almenys 2 icones definides');

    for (const icon of manifest.icons) {
      const iconPath = path.join(appDir, icon.src);
      assert.ok(fs.existsSync(iconPath), `La icona ${icon.src} ha d'existir físicament a ${iconPath}`);
      const stats = fs.statSync(iconPath);
      assert.ok(stats.size > 1000, `La icona ${icon.src} no pot ser buida (mida: ${stats.size} bytes)`);
    }
  });

  test('2. Validació del Service Worker (sw.js)', () => {
    const swPath = path.join(appDir, 'sw.js');
    assert.ok(fs.existsSync(swPath), 'sw.js ha d\'existir a l\'arrel de l\'aplicació');

    const swContent = fs.readFileSync(swPath, 'utf8');

    // Comprovar que no hi hagi errors flagrants de sintaxi
    assert.doesNotThrow(() => {
      new Function(swContent.replace(/importScripts\([^)]*\);?/g, ''));
    }, 'sw.js ha de tenir sintaxi JavaScript vàlida');

    // Comprovar precache d'actius crítics
    assert.ok(swContent.includes("'./'"), 'sw.js ha de precatxar ./');
    assert.ok(swContent.includes("'./index.html'"), 'sw.js ha de precatxar ./index.html');
    assert.ok(swContent.includes("'./manifest.json'"), 'sw.js ha de precatxar ./manifest.json');
    assert.ok(swContent.includes("'./icons/icon-192.png'"), 'sw.js ha de precatxar icon-192.png');
    assert.ok(swContent.includes("'./icons/icon-512.png'"), 'sw.js ha de precatxar icon-512.png');

    // Comprovar estratègia network-first per a documents
    assert.ok(swContent.includes("navigate") || swContent.includes("document"), 'sw.js ha d\'incloure estratègia per a navegació HTML');

    // Comprovar que no intercepti crides de Firestore/Firebase
    assert.ok(swContent.includes("googleapis.com") || swContent.includes("firebase"), 'sw.js no ha d\'interceptar el SDK natiu de Firebase');
  });

  test('3. Enllaç i registre correcte a index.html', () => {
    const indexPath = path.join(appDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html ha d\'existir');

    const html = fs.readFileSync(indexPath, 'utf8');

    // Enllaç al manifest a l'arrel
    assert.ok(html.includes('<link rel="manifest" href="./manifest.json">'), 'index.html ha d\'enllaçar ./manifest.json');
    assert.ok(html.includes('<link rel="apple-touch-icon" href="./icons/icon-192.png">'), 'index.html ha de tenir apple-touch-icon');

    // Registre del Service Worker amb àmbit arrel
    assert.ok(html.includes("navigator.serviceWorker.register('./sw.js'"), 'Ha de registrar ./sw.js des de l\'arrel');

    // Persistència offline de Firestore
    assert.ok(html.includes('persistentLocalCache'), 'index.html ha d\'importar i utilitzar persistentLocalCache');
    assert.ok(html.includes('persistentMultipleTabManager'), 'index.html ha d\'importar persistentMultipleTabManager');

    // Contenidor per a Toasts
    assert.ok(html.includes('id="toast-container"'), 'index.html ha de tenir el contenidor #toast-container');
    assert.ok(html.includes('function showToast('), 'index.html ha de definir showToast');
  });

  test('4. Absència de textos en castellà a l\'estat de sincronització i pestanyes', () => {
    const indexPath = path.join(appDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // No ha de quedar cap "Sin conexión"
    assert.equal(html.includes('Sin conexión'), false, 'No ha de contenir el text castellà "Sin conexión"');

    // Ha de contenir el text normatiu en català
    assert.ok(html.includes('Sense connexió — es sincronitzarà'), 'Ha de contenir "Sense connexió — es sincronitzarà"');
    assert.ok(html.includes('En línia'), 'Ha de contenir "En línia"');

    // Pestanyes de l'operari en català normatiu (Resoltes, no Resoltas)
    assert.equal(html.includes('Resoltas'), false, 'No ha de contenir "Resoltas" (ha de ser "Resoltes")');
    assert.ok(html.includes('Resoltes / Finalitzades'), 'Ha de contenir "Resoltes / Finalitzades"');
  });

  test('5. Configuració de capçaleres a firebase.json', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    assert.ok(fs.existsSync(firebaseJsonPath), 'firebase.json ha d\'existir');

    const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    assert.ok(config.hosting, 'hosting ha d\'estar configurat a firebase.json');
    assert.equal(config.hosting.public, 'brigada-mantenimiento');

    // Comprovar regles de Cache-Control no-cache per a sw.js i manifest.json
    const swRule = config.hosting.headers.find(h => h.source && h.source.includes('sw.js'));
    assert.ok(swRule, 'Ha d\'existir una regla de capçalera específica per a sw.js');

    const manifestRule = config.hosting.headers.find(h => h.source && h.source.includes('manifest.json'));
    assert.ok(manifestRule, 'Ha d\'existir una regla de capçalera específica per a manifest.json');
  });
});
