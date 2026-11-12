import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'brigada-mantenimiento');

describe('Fase 4: Extracció d\'Adjunts (Fotografies i Signatures) de Firestore', () => {

  test('1. Document de tasca lleuger (< 20 KB) sense cadenes Base64 massives', () => {
    const indexPath = path.join(appDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // Comprovar que confirmTaskCompletion elimina fotoFinal i signatura del document principal
    assert.ok(html.includes('delete cleanTask.fotoFinal'), 'confirmTaskCompletion ha d\'eliminar fotoFinal del document principal');
    assert.ok(html.includes('delete cleanTask.signatura'), 'confirmTaskCompletion ha d\'eliminar signatura del document principal');

    // Comprovar que s\'utilitzen banderes booleanes lleugeres
    assert.ok(html.includes('teFotoInicial'), 'index.html ha d\'utilitzar la bandera teFotoInicial');
    assert.ok(html.includes('teFotoFinal'), 'index.html ha d\'utilitzar la bandera teFotoFinal');
    assert.ok(html.includes('teSignatura'), 'index.html ha d\'utilitzar la bandera teSignatura');

    // Simular un document de tasca complet amb metadades i comprovar la seva mida
    const sampleTaskDoc = {
      id: 'SE-2026-0001',
      titol: 'Reparació farola Plaça Major',
      descripcio: 'Substitució de làmpada LED i revisió de cablejat',
      categoria: 'enllumenat',
      prioritat: 'urgent',
      nucli: 'Santa Eugènia (Vila)',
      via: 'Plaça Major',
      lat: 39.6235,
      lng: 2.8368,
      estat: 'finalitzada',
      operariIds: [1, 2],
      operariId: 1,
      esImportant: true,
      tempsTranscorregut: 3600,
      teFotoInicial: true,
      teFotoFinal: true,
      teSignatura: true,
      nomSignatari: 'Toni Coll (Oficial 1ª)',
      observacionsTancament: 'Comprovat funcionament correcte',
      tempsFinalitzacio: new Date().toISOString(),
      finalitzadaEl: '12/11/2026, 18:30:00',
      creatEl: new Date().toISOString()
    };

    const docSize = Buffer.byteLength(JSON.stringify(sampleTaskDoc), 'utf8');
    assert.ok(docSize < 2048, `El document de la tasca ha de pesar menys de 2 KB (mida calculada: ${docSize} bytes)`);
  });

  test('2. Subcol·lecció tasques/{id}/adjunts/{tipus} i funció carregarAdjunt', () => {
    const indexPath = path.join(appDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // Comprovar declaració de carregarAdjunt i memòria cau ADJUNTS_CACHE
    assert.ok(html.includes('const ADJUNTS_CACHE = new Map()'), 'Ha d\'existir la memòria cau ADJUNTS_CACHE');
    assert.ok(html.includes('async function carregarAdjunt('), 'Ha d\'existir la funció asíncrona carregarAdjunt');

    // Comprovar escriptura a la subcol·lecció adjunts
    assert.ok(html.includes("'adjunts', 'signatura'"), 'Ha de desar la signatura a la subcol·lecció adjunts/signatura');
    assert.ok(html.includes("'adjunts', 'fotoFinal'"), 'Ha de desar la foto final a la subcol·lecció adjunts/fotoFinal');
    assert.ok(html.includes("'adjunts', 'fotoInicial'"), 'Ha de desar la foto inicial a la subcol·lecció adjunts/fotoInicial');
  });

  test('3. Càrrega sota demanda (Lazy Loading) a informes i visors', () => {
    const indexPath = path.join(appDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // openReportModal carrega adjunts asíncronament amb carregarAdjunt
    assert.ok(html.includes("carregarAdjunt(task.id, 'fotoInicial')"), 'openReportModal ha de carregar fotoInicial sota demanda');
    assert.ok(html.includes("carregarAdjunt(task.id, 'fotoFinal')"), 'openReportModal ha de carregar fotoFinal sota demanda');
    assert.ok(html.includes("carregarAdjunt(task.id, 'signatura')"), 'openReportModal ha de carregar signatura sota demanda');

    // Visors de fotos inicial i final utilitzen carregarAdjunt
    assert.ok(html.includes("await carregarAdjunt(taskId, 'fotoInicial')"), 'openPhotoViewerById ha d\'utilitzar carregarAdjunt');
    assert.ok(html.includes("await carregarAdjunt(taskId, 'fotoFinal')"), 'openPhotoViewerFinalById ha d\'utilitzar carregarAdjunt');
  });

  test('4. Compressió adaptativa d\'imatges (suport WebP amb fallback JPEG)', () => {
    const indexPath = path.join(appDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    assert.ok(html.includes("canvas.toDataURL('image/webp'"), 'compressImageFile ha d\'intentar WebP');
    assert.ok(html.includes("canvas.toDataURL('image/jpeg'"), 'compressImageFile ha d\'admetre fallback JPEG');
    assert.ok(html.includes("350 * 1024"), 'compressImageFile ha de recomprimir si supera el límit recomanat');
  });

  test('5. Regles de seguretat firestore.rules per a subcol·leccions d\'adjunts', () => {
    const rulesPath = path.join(rootDir, 'firestore.rules');
    assert.ok(fs.existsSync(rulesPath), 'firestore.rules ha d\'existir');

    const rules = fs.readFileSync(rulesPath, 'utf8');

    // Comprovar que s\'ha definit el bloc de la subcol·lecció
    assert.ok(rules.includes('match /adjunts/{adjuntId}'), 'firestore.rules ha de protegir la subcol·lecció /adjunts/{adjuntId}');

    // Comprovar control de mida màxima per adjunt
    assert.ok(rules.includes('request.resource.data.data.size() < 972800'), 'Ha de limitar cada adjunt a < 950 KB');

    // Comprovar que els operaris assignats poden escriure fotoFinal i signatura
    assert.ok(rules.includes("adjuntId in ['fotoInicial', 'fotoFinal', 'signatura']"), 'Ha de validar els identificadors d\'adjunts permesos');

    // Comprovar que l\'operari pot actualitzar teFotoFinal i teSignatura a la tasca
    assert.ok(rules.includes("'teFotoFinal'"), 'Regles de tasques han de permetre teFotoFinal');
    assert.ok(rules.includes("'teSignatura'"), 'Regles de tasques han de permetre teSignatura');
    assert.ok(rules.includes("'tempsFinalitzacio'"), 'Regles de tasques han de permetre tempsFinalitzacio');
  });
});
