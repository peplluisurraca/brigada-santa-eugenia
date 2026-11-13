# Brigada Municipal — Ajuntament de Santa Eugènia (07142)

Aplicació Web Progressiva (PWA) per a la coordinació operativa, gestió d'incidències i manteniment preventiu de la Brigada Municipal de l'**Ajuntament de Santa Eugènia** (Mallorca, CP 07142).

---

## 🛠️ Stack Tecnològic Real

- **Frontend**: HTML5 semàntic, Tailwind CSS compilat i minificat (`css/dist.css`), Lucide Icons (`v0.468.0`), Leaflet.js (`v1.9.4` + OpenStreetMap).
- **Backend & Autenticació**:
  - **Firebase Authentication**: Login administratiu (email/contrasenya) i login mòbil d'operaris mitjançant PIN de 6 dígits amb comptes sintètics (`op-<id>@brigada-santa-eugenia.local`).
  - **Cloud Firestore**: Persistència offline nativa a IndexedDB (`persistentLocalCache` + `persistentMultipleTabManager`), consultes per rol (`operariIds array-contains`).
  - **Subcol·lecció d'Adjunts**: `tasques/{id}/adjunts/{tipus}` (`fotoInicial`, `fotoFinal`, `signatura`) per mantenir el document principal lleuger (< 2 KB).
  - **Regles de Seguretat**: `firestore.rules` blindat contra lectures i escriptures no autenticades, amb comprovació de rols a `rols/{uid}` i límit de mida per fitxer (< 950 KB).
- **Offline & PWA**:
  - Service Worker (`sw.js`) amb estratègia `network-first` per a HTML i `stale-while-revalidate` per a recursos estàtics.
  - Manifest oficial PWA (`manifest.json`) amb icones municipals instal·lables (192px, 512px, maskable).
  - Indicador de connectivitat en temps real basat en metadades de Firestore (`hasPendingWrites`).

---

## 📂 Estructura del Repositori

```
brigada-santa-eugenia/
├── brigada-mantenimiento/         # Arrel de l'aplicació web (Hosting public)
│   ├── index.html                 # PWA completa
│   ├── manifest.json              # Configuració PWA instal·lable
│   ├── sw.js                      # Service Worker
│   ├── logo-santa-eugenia.jpg     # Escut institucional
│   ├── icons/                     # Icones PWA (192, 512, maskable)
│   ├── css/
│   │   ├── input.css              # Directrius Tailwind
│   │   └── dist.css               # CSS compilat i minificat (asset estàtic)
│   └── server.js                  # Servidor local Node.js per a desenvolupament
├── docs/                          # Documentació tècnica i auditories
│   ├── Contexto_IA.md             # Memòria i estat del projecte
│   ├── AUDITORIA_2026-11-12.md    # Auditoria de seguretat i usabilitat
│   ├── PLAN_ANTIGRAVITY.md        # Pla de resolució per fases
│   └── arxiu/                     # Documents i esquemes històrics arxivats
├── scripts/
│   ├── ci.yml                     # Plantilla de workflow CI per a GitHub Actions
│   ├── bootstrap-auth.mjs         # Provisió d'usuaris a Firebase Auth
│   └── seed-demo.mjs              # Càrrega de dades demo a Firestore
├── tests/
│   ├── rules.test.mjs             # Validació de regles Firestore amb emulador
│   ├── xss.test.mjs               # Proves d'escapament HTML i sanitització
│   ├── offline.test.mjs           # Proves de Service Worker, PWA i manifest
│   ├── adjunts.test.mjs           # Proves de documents lleugers i subcol·leccions
│   └── usabilitat.test.mjs        # Proves de WCAG AA, signatura i preventiu idempotent
├── firebase.json                  # Configuració de Hosting, Emuladors i Headers/CSP
├── firestore.rules                # Regles de seguretat de Firestore
├── firestore.indexes.json         # Índexs compostos de Firestore
├── package.json                   # Dependències i scripts de test
└── tailwind.config.js             # Configuració de disseny Tailwind CSS
```

---

## 🚀 Desenvolupament Local

### 1. Instal·lació de dependències
```bash
npm install
```

### 2. Compilar estils CSS
```bash
npm run build:css
```

### 3. Executar la suite de tests
```bash
npm test
```

### 4. Iniciar el servidor local
```bash
npm start
```
L'aplicació estarà disponible a: `http://localhost:8080/`

---

## 🔒 Seguretat i Rols

El sistema disposa de dos rols clarament diferenciats a Firestore (`rols/{uid}`):
1. **Administrador (`rol: 'admin'`)**:
   - Accés complet al taulell de comandament, creació d'incidències, gestió de personal i manteniment preventiu.
2. **Operari (`rol: 'operari'`)**:
   - Accés exclusiu a la vista mòbil de treball per a les tasques assignades a la seva persona o equip.
   - Requereix signatura manuscrita de conformitat al canvas i nom del validador per tancar ordres.

---

*Ajuntament de Santa Eugènia · Àrea de Serveis Municipals i Manteniment · CP 07142 · Mallorca*
