import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'brigada-mantenimiento', 'index.html');

describe('Fase 7: Informes i Analítica Municipal (Backoffice P1)', () => {

  const html = fs.readFileSync(indexPath, 'utf8');

  test('1. Pestanya de navegació i control d\'accés per a Informes i Analítica', () => {
    // Pestanya al main-nav
    assert.ok(html.includes('id="tab-informes-analitica"'),
      'Ha d\'existir el botó de navegació tab-informes-analitica');
    assert.ok(html.includes('data-lucide="bar-chart-3"'),
      'La pestanya d\'informes ha d\'utilitzar la icona bar-chart-3');
    assert.ok(html.includes("navigateView('informes-analitica')"),
      'La pestanya d\'informes ha de cridar a navigateView("informes-analitica")');

    // Secció del tauler d\'informes
    assert.ok(html.includes('id="view-informes-analitica"'),
      'Ha d\'existir la secció view-informes-analitica');

    // Integració als arrays de vistes
    assert.ok(html.includes("'view-informes-analitica'"),
      'allViews i views han d\'incloure view-informes-analitica');
  });

  test('2. Panell de filtres temporals i d\'àmbits amb accessibilitat (WCAG AA)', () => {
    // Píndoles de rang ràpid
    assert.ok(html.includes('data-id="mes_actual"'), 'Ha d\'existir el rang ràpid Mes actual');
    assert.ok(html.includes('data-id="mes_anterior"'), 'Ha d\'existir el rang ràpid Mes anterior');
    assert.ok(html.includes('data-id="trimestre"'), 'Ha d\'existir el rang ràpid Últim trimestre');
    assert.ok(html.includes('data-id="any_actual"'), 'Ha d\'existir el rang ràpid Any 2026');
    assert.ok(html.includes('data-id="tots"'), 'Ha d\'existir el rang ràpid Històric complet');

    // Controls de formulari amb etiqueta label associada
    assert.ok(html.includes('for="informes-data-inici"'), 'Ha d\'existir label for per data d\'inici');
    assert.ok(html.includes('for="informes-data-fi"'), 'Ha d\'existir label for per data de fi');
    assert.ok(html.includes('for="informes-filter-categoria"'), 'Ha d\'existir label for per especialitat');
    assert.ok(html.includes('for="informes-filter-nucli"'), 'Ha d\'existir label for per nucli');
    assert.ok(html.includes('for="informes-filter-operari"'), 'Ha d\'existir label for per operari');

    // Presència dels 4 nuclis oficials de Santa Eugènia
    assert.ok(html.includes('value="Santa Eugènia (Vila)"'), 'Ha d\'incloure Santa Eugènia (Vila)');
    assert.ok(html.includes('value="Ses Alqueries"'), 'Ha d\'incloure Ses Alqueries');
    assert.ok(html.includes('value="Ses Olleries"'), 'Ha d\'incloure Ses Olleries');
    assert.ok(html.includes('value="Ses Coves"'), 'Ha d\'incloure Ses Coves');
  });

  test('3. Tauler de Mètriques KPI d\'Activitat Municipal', () => {
    assert.ok(html.includes('id="kpi-total-ordres"'), 'Ha d\'existir el KPI de Total Ordres');
    assert.ok(html.includes('id="kpi-taxa-resolucio"'), 'Ha d\'existir el KPI de Taxa de Resolució');
    assert.ok(html.includes('id="kpi-hores-totals"'), 'Ha d\'existir el KPI d\'Hores Totals Registrades');
    assert.ok(html.includes('id="kpi-temps-mitja"'), 'Ha d\'existir el KPI de Temps Mitjà');
    assert.ok(html.includes('id="kpi-urgencies"'), 'Ha d\'existir el KPI de Compliment d\'Urgències');
  });

  test('4. Retirada de la deducció automàtica d\'esmorzar als informes (Acord Batlia)', () => {
    // 4.1. Hores totals calculades directament del temps real registrat
    assert.ok(html.includes('const totalHores = totalSegons / 3600;'),
      'Les hores totals s\'han de calcular sense restar arbitràriament 30 minuts');

    // 4.2. Retirada de la deducció als justificants de treball
    assert.ok(!html.includes('id="pdf-pausa-esmorzar"'),
      'pdf-pausa-esmorzar ha d\'haver estat eliminat del justificant PDF');

    // 4.3. Retirada del text d\'esmorzar deduït al modal de finalització
    assert.ok(!html.includes('id="modal-pausa-esmorzar-text"'),
      'modal-pausa-esmorzar-text ha d\'haver estat eliminat del modal de tancament');
  });

  test('5. Desglossaments per Especialitat, Nuclis i Parte per Operari', () => {
    assert.ok(html.includes('id="container-distribucio-especialitats"'),
      'Ha d\'existir el contenidor de distribució per especialitat');
    assert.ok(html.includes('id="container-distribucio-nuclis"'),
      'Ha d\'existir el contenidor de distribució territorial per nucli');
    assert.ok(html.includes('id="informes-operaris-tbody"'),
      'Ha d\'existir la taula del parte de treball per operari');
    assert.ok(html.includes('id="informes-tasques-tbody"'),
      'Ha d\'existir la taula de llistat d\'ordres del període');
  });

  test('6. Exportació Oficial a Excel / CSV (per a Secretaria i Intervenció)', () => {
    // Funció d\'exportació
    assert.ok(html.includes('function exportarInformesCSV'),
      'Ha d\'existir la funció exportarInformesCSV');

    // Byte Order Mark UTF-8 per a compatibilitat total amb caràcters catalans
    assert.ok(html.includes('\\uFEFF'),
      'El fitxer CSV ha de començar amb el BOM UTF-8 (\\uFEFF)');

    // Delimitador punt i coma (;)
    assert.ok(html.includes(".join(';')"),
      'El CSV ha d\'utilitzar punt i coma com a delimitador');

    // Columnes oficials
    assert.ok(html.includes('"Codi"'), 'El CSV ha d\'incloure la columna Codi');
    assert.ok(html.includes('"Data Registre"'), 'El CSV ha d\'incloure la columna Data Registre');
    assert.ok(html.includes('"Equip Assignat"'), 'El CSV ha d\'incloure la columna Equip Assignat');
    assert.ok(html.includes('"Hores Registrades (decimals)"'), 'El CSV ha d\'incloure la columna Hores Registrades');
    assert.ok(!html.includes('"Pausa Esmorzar"'), 'El CSV no pot contenir columnes de pausa d\'esmorzar');
  });

  test('7. Modal d\'Informe Oficial Municipal en PDF i Estils d\'Impressió', () => {
    assert.ok(html.includes('id="modal-informe-global-pdf"'),
      'Ha d\'existir el modal d\'informe global PDF');
    assert.ok(html.includes('id="printable-informe-municipal"'),
      'Ha d\'existir l\'àrea de contingut imprimible');

    // Elements institucionals oficials
    assert.ok(html.includes('AJUNTAMENT DE SANTA EUGÈNIA'),
      'L\'informe ha d\'incloure el nom oficial de l\'Ajuntament');
    assert.ok(html.includes('logo-santa-eugenia.jpg'),
      'L\'informe ha d\'incloure l\'escut municipal oficial');
    assert.ok(html.includes('El Cap de la Brigada Municipal'),
      'L\'informe ha d\'incloure peu de signatura per al Cap de Brigada');
    assert.ok(html.includes('El Batle / Regidoria Delegada de Serveis'),
      'L\'informe ha d\'incloure peu de signatura per a Alcaldia / Regidoria');

    // Regles CSS @media print
    assert.ok(html.includes('#modal-informe-global-pdf, #modal-informe-global-pdf *'),
      'El CSS d\'impressió ha d\'incloure el modal d\'informe global');
  });

  test('8. Indicador de connectivitat clar al Header (text En línia visible)', () => {
    // S\'ha eliminat hidden xs:inline per evitar pastilles buides
    assert.ok(html.includes('id="conn-status-text" class="text-[11px] font-semibold leading-none">En línia</span>'),
      'conn-status-text ha de ser visible directament sense quedar ocult');
  });

  test('9. Escapament sistemàtic contra XSS a totes les taules d\'informes', () => {
    assert.ok(html.includes('esc(item.nom)'), 'Les especialitats han d\'estar escapades amb esc()');
    assert.ok(html.includes('esc(op.nom)'), 'Els noms d\'operari han d\'estar escapats amb esc()');
    assert.ok(html.includes('esc(task.titol)'), 'Els títols de tasca han d\'estar escapats amb esc()');
    assert.ok(html.includes('esc(task.nucli)'), 'Els nuclis han d\'estar escapats amb esc()');
  });

});
