import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Fase 8 - Bloc B: Validació Estricta de firestore.rules i RGPD', () => {
  const rulesPath = path.join(rootDir, 'firestore.rules');
  assert.ok(fs.existsSync(rulesPath), 'El fitxer firestore.rules ha d\'existir');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('B1: Consulta per operari no bloquejada (sense condició estàtica is list a read)', () => {
    // Comprovar que la regla read no conté 'resource.data.operariIds is list &&'
    const tasquesMatch = rules.match(/match \/tasques\/\{tascaId\}[\s\S]*?(?=match \/tasques_programades)/);
    assert.ok(tasquesMatch, 'Ha de contenir el bloc match /tasques/{tascaId}');
    const tasquesBlock = tasquesMatch[0];
    
    // Extreure allow read
    const readMatch = tasquesBlock.match(/allow read:[\s\S]*?;/);
    assert.ok(readMatch, 'Ha de contenir allow read per a tasques');
    assert.ok(!readMatch[0].includes('resource.data.operariIds is list &&'), 'allow read no ha de contenir resource.data.operariIds is list &&');
    assert.ok(readMatch[0].includes('getOperariId() in resource.data.operariIds'), 'allow read ha de validar getOperariId() in resource.data.operariIds');
  });

  it('B2: Protecció de tasques finalitzades i validació de signatura', () => {
    assert.ok(rules.includes("resource.data.estat != 'finalitzada'"), 'Ha de bloquejar actualitzacions si estat == finalitzada');
    assert.ok(rules.includes("request.resource.data.estat in ['en_curs', 'pendent_material', 'finalitzada']"), 'Ha de restringir els estats a valors vàlids');
    assert.ok(rules.includes("request.resource.data.teSignatura == true"), 'Ha d\'exigir teSignatura == true per finalitzar');
    assert.ok(rules.includes("request.resource.data.nomSignatari is string"), 'Ha d\'exigir nomSignatari is string');
    assert.ok(rules.includes("request.resource.data.nomSignatari.size() > 0"), 'nomSignatari no pot ser buit');
    assert.ok(rules.includes("request.resource.data.nomSignatari.size() <= 120"), 'nomSignatari ha de tenir màxim 120 caràcters');
  });

  it('B3: Protecció de la subcol·lecció adjunts (fotoFinal i signatura en create, mai fotoInicial per operari)', () => {
    assert.ok(rules.includes("match /adjunts/{adjuntId}"), 'Ha de protegir la subcol·lecció adjunts');
    assert.ok(rules.includes("allow create:"), 'Ha de definir allow create específic per a adjunts');
    assert.ok(rules.includes("adjuntId in ['fotoFinal', 'signatura']"), 'Operari només pot crear fotoFinal o signatura');
    assert.ok(rules.includes("request.resource.data.data.matches('^data:image/(png|jpeg|webp);base64,.*')"), 'Ha d\'exigir que el payload sigui imatge base64 vàlida');
    assert.ok(rules.includes("allow update, delete: if isAdmin();"), 'Operari mai pot sobreescriure ni eliminar adjunts existents');
  });

  it('B4: Validació d\'estat actiu a isOperari()', () => {
    const isOperariMatch = rules.match(/function isOperari\(\)[\s\S]*?\}/);
    assert.ok(isOperariMatch, 'Ha de contenir la funció isOperari()');
    const funcBody = isOperariMatch[0];
    assert.ok(funcBody.includes('.data.actiu == true'), 'isOperari ha de validar que operaris/{id}.actiu == true');
  });

  it('B5: Protecció de dades mèdiques i baixes temporals (RGPD Art. 9)', () => {
    assert.ok(rules.includes("match /absencies/{absenciaId}"), 'Ha de protegir la subcol·lecció absencies');
    assert.ok(rules.includes("string(getOperariId()) == operariId"), 'Només el propi operari o admin pot llegir la subcol·lecció d\'absències');
    assert.ok(rules.includes("allow write: if isAdmin();"), 'Només l\'administrador pot escriure absències');
  });

  it('E3: Regles per a comptadors transaccionals atòmics', () => {
    assert.ok(rules.includes("match /comptadors/{comptadorId}"), 'Ha de definir regles per a comptadors transaccionals');
  });
});
