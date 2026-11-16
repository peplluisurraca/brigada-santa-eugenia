# Pla d'Implementació — Fase 7: Informes i Analítica Municipal (Backoffice P1)

Aquest pla defineix el desenvolupament del primer mòdul de Backoffice de prioritat **P1** segons el catàleg de funcionalitats de [`docs/PLAN_ANTIGRAVITY.md`](file:///Users/xavi/Desktop/brigada-santa-eugenia/docs/PLAN_ANTIGRAVITY.md) (§Catàleg de funcionalitats A1, A2 i A3), a desenvolupar a la branca dedicada **`feat/fase-7-informes`** creada des de `develop`.

---

## 🎯 Objectius del Mòdul d'Informes i Analítica

Permetre a l'administrador (Cap de Brigada, Regidoria de Serveis i Batlia) obtenir una visió analítica completa del rendiment dels serveis municipals, justificar despeses i hores davant Secretaria i Intervenció, i generar informes oficials imprimibles en PDF i exportables a Excel/CSV.

---

## 📋 Funcionalitats a Desenvolupar

### 1. Nova Secció a l'Admin: «Informes i Analítica»
- Afegir una pestanya de navegació [`#tab-informes-analitica`](file:///Users/xavi/Desktop/brigada-santa-eugenia/brigada-mantenimiento/index.html) a la barra superior d'administració amb icona `bar-chart-3`.
- Crear la vista de contingut [`view-informes-analitica`](file:///Users/xavi/Desktop/brigada-santa-eugenia/brigada-mantenimiento/index.html) integrada fluidament en el disseny Tailwind de la PWA.

### 2. Filtres Temporals i d'Àmbit de Treball
- **Selectors de rang temporal ràpid**:
  - *Mes actual* (per defecte)
  - *Mes anterior*
  - *Últim trimestre*
  - *Any en curs*
  - *Rang de dates personalitzat* (Data d'inici i Data de fi)
- **Filtres d'agrupació**:
  - Per *Especialitat / Categoria* (totes o específica: enllumenat, aigua, obres, neteja, parcs...)
  - Per *Nucli de població* (tots o específic: Santa Eugènia - Vila, Ses Alqueries, Ses Coves, Ses Olleries)
  - Per *Operari* (tots o operari concret)

### 3. Tauler de Mètriques KPI d'Activitat Municipal
- **Total d'Ordres de Treball** registrades en el període.
- **Taxa de Resolució (%)**: Ordres finalitzades vs. pendents/en curs.
- **Temps Mitjà de Resolució**: Calculat en hores des de la creació fins al tancament.
- **Hores Totals Invertides**: Sumatori d'hores de feina cronometrades/registrades per la brigada (sense deducció automàtica d'esmorzar).
- **Compliment d'Urgències**: Percentatge d'incidències urgents resoltes dins les primeres 24-48 hores.

### 4. Quadres de Distribució i Desglossament
- **Distribució per Especialitat**: Nombre d'ordres, hores dedicades i percentatge sobre el total municipal.
- **Distribució Territorial per Nucli**: Distribució de tasques entre Santa Eugènia Vila, Ses Alqueries, Ses Coves i Ses Olleries.
- **Parte de Treball per Operari**: Taula amb ordres tancades, hores reals registrades i mitjana d'hores per actuació.

### 5. Generació d'Informe Oficial en PDF (Amb Escut Municipal)
- Botó **«Generar Informe PDF Municipal»**:
  - Modal o finestra imprimible formatada com a document administratiu oficial de l'**Ajuntament de Santa Eugènia**.
  - Capçalera institucional: Escut oficial del municipi, identificació de l'ens local (CP 07142), títol de l'informe i període analitzat.
  - Taules netes d'indicadors clau, desglossament per nuclis i especialitats, i llistat de les actuacions més rellevants amb hores reals registrades.
  - Peu de signatura formal per al **Cap de Brigada** i per al **Regidor/a Delegat/da d'Obres i Serveis**.

### 6. Exportació Oficial a Excel / CSV (per a Secretaria i Intervenció)
- Botó **«Exportar Dades a Excel / CSV»**:
  - Generació en memòria client d'un arxiu descarregable `.csv`.
  - Format adaptat a Excel per a la zona europea: delimitador punt i coma (`;`) i codificació **UTF-8 amb BOM** (`\uFEFF`) per garantir que accents i caràcters catalans (`ç`, `·`, apòstrofs) s'obrin perfectament sense fallades d'encodificació.
  - Columnes exportades: *Codi de Tasca, Data Registre, Data Finalització, Títol, Categoria, Nucli, Via/Carrer, Prioritat, Estat, Operaris Assignats, Hores de Treball Registrades, Nom Validador/Signatari*. (Sense columnes de deducció d'esmorzar).

---

### ⏸️ Acord Municipal: Pausa d'Esmorzar (Tasca Pendent amb el Batle)
- **Criteri acordat amb l'usuari:** No aplicar deduccions automàtiques de 30 minuts als informes oficials ni als justificants de treball.
- **Pendent de validació amb el Batle:** Acordar l'horari oficial de la pausa i determinar sota quines circumstàncies objectives s'ha d'aplicar (ex. només si el cronòmetre no s'ha aturat manualment durant aquella franja horària concreta). Mentrestant, es computa exclusivament el temps real registrat.

---

## 🔒 Seguretat i Validació

1. **Aïllament per Rol**: La generació i descàrrega d'informes complets i CSV és d'accés exclusiu per a usuaris amb rol `admin` (Cap de Brigada i personal autoritzat).
2. **Escapament i Sanitització**: Totes les dades d'ordres i operaris que es renderitzin a les taules i informes PDF passaran estrictament per la funció `esc(str)` per prevenir injeccions XSS.
3. **Optimització d'Emmagatzematge**: El càlcul es fa sobre les metadades lleugeres del document principal de tasques (`< 2 KB`), sense requerir la descàrrega de les fotos ni signatures pesades de les subcol·leccions d'adjunts.

---

## 🧪 Verificació i Suite de Proves

Crearem la suite automatitzada [`tests/informes.test.mjs`](file:///Users/xavi/Desktop/brigada-santa-eugenia/tests/informes.test.mjs) per validar:
1. Càlcul precís dels KPIs (taxa de resolució, hores totals, temps mitjà).
2. Filtratge exacte per rang de dates i nuclis municipals.
3. Generació del CSV amb BOM UTF-8, delimitador `;` i apòstrofs intactes.
4. Presència dels elements estructurals de l'informe PDF (capçalera municipal, escut, signatura institucional).
5. Escapament de seguretat XSS en dades manipulades per usuaris.

---

## 📂 Fitxers Implicats

- Nova branca: `feat/fase-7-informes`
- Fitxers a modificar:
  - [`brigada-mantenimiento/index.html`](file:///Users/xavi/Desktop/brigada-santa-eugenia/brigada-mantenimiento/index.html): interfície, pestanya de navegació, lògica analítica i exportacions.
  - [`package.json`](file:///Users/xavi/Desktop/brigada-santa-eugenia/package.json): afegir `tests/informes.test.mjs` a la comanda `npm test`.
  - [`docs/Contexto_IA.md`](file:///Users/xavi/Desktop/brigada-santa-eugenia/docs/Contexto_IA.md): registrar l'estat de la Fase 7.
- Nou fitxer de test:
  - [`tests/informes.test.mjs`](file:///Users/xavi/Desktop/brigada-santa-eugenia/tests/informes.test.mjs)
