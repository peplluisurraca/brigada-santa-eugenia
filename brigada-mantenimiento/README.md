# PWA Brigada Municipal — Ajuntament de Santa Eugènia (07142)

Aplicació web progressiva (PWA) per a la gestió de tasques i brigada municipal del terme de **Santa Eugènia** (Mallorca).

## Tecnologia

- **Frontend**: HTML5 + Tailwind CSS (CDN) + Lucide Icons + Leaflet.js
- **Backend (producció)**: Supabase (PostgreSQL + Storage + Auth)
- **Hosting (producció)**: Vercel + SSL
- **Servidor local de prova**: PowerShell HTTP Server (port 8080)

## Funcionalitats implementades

- ✅ Dashboard d'administració amb mapa interactiu (Leaflet + OpenStreetMap)
- ✅ Gestió d'ordres de treball (Canvi d'abast, reassignació, marca "Important")
- ✅ 37 vies del Nomenclàtor oficial (30 padró + 7 camins complementaris)
- ✅ Gestió integral de personal (Alta, Baixa, Modificació + Reassignació en bloc)
- ✅ Integració WhatsApp (`wa.me/34TEL?text=...`) per avisar operaris
- ✅ Vista mòbil d'operari amb login per PIN (4 dígits) i ordenació per GPS
- ✅ Navegació directa a Google Maps (`Com arribar`) des de cada tasca
- ✅ Indicador de cobertura Online/Offline en temps real
- ✅ Temporitzador amb deducció automàtica de 30 min d'esmorzar
- ✅ Canvas de firma tàctil (HTML5) al tancament de les ordres
- ✅ Plantilla d'informe PDF imprimible amb escut i fotos comparatives
- ✅ Service Worker PWA (offline cache + manifest)
- ✅ Especialitats: Climatització, Electricitat, Fontaneria, Obra, Neteja, Jardineria, Senyalització, Paperes

## Estructura de fitxers

```
brigada-mantenimiento/
├── index.html           # Aplicació principal (totes les vistes)
├── logo-santa-eugenia.jpg
├── server.ps1           # Servidor HTTP local (port 8080)
├── .gitignore
├── README.md
├── public/
│   ├── manifest.json    # Configuració PWA
│   └── sw.js            # Service Worker (offline cache)
├── src/
│   └── index.html       # Còpia sincronitzada per a desplegament
├── docs/
│   ├── arquitectura-supabase.sql  # Esquema PostgreSQL complet
│   └── especificacion-tecnica.md  # Especificació tècnica i UX
└── tests/
    └── autotest.ps1     # Suite d'autotests (8 tests, 100% pass)
```

## Inici ràpid (prova local)

```powershell
# Clona el repositori
git clone https://github.com/TU_USUARI/brigada-mantenimiento.git

# Inicia el servidor local
powershell -ExecutionPolicy Bypass -File server.ps1 -Port 8080

# Accedeix a: http://localhost:8080/
```

## Credencials per defecte (desenvolupament)

| Operari | PIN |
|---|---|
| Tots els operaris | 1234 |

## Municipis coberts

- Santa Eugènia (Vila) — nucli principal
- Ses Alqueries · Ses Olleries · Ses Coves

---
*Ajuntament de Santa Eugènia · Àrea de Serveis Municipals i Manteniment · CP 07142 · Mallorca*
