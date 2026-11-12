#!/usr/bin/env node
/**
 * scripts/seed-demo.mjs
 * 
 * Carrega dades de prova representatives a Firestore (Emulador o entorn de desenvolupament)
 * sense contaminar el client ni auto-sembrar des de la interfície.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'brigada-santa-eugenia';

let app;
if (process.env.SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.SERVICE_ACCOUNT_KEY)) {
  const serviceAccount = JSON.parse(fs.readFileSync(process.env.SERVICE_ACCOUNT_KEY, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: PROJECT_ID
  });
} else {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  app = initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore(app);

const OPERARIS_DEMO = [
  { id: 1, nom: "Toni Coll", rol: "Oficial 1ª Obra / Paleteria", especialitat: "obra_albanileria", telefon: "611223344", actiu: true, baixes_temporals: [] },
  { id: 2, nom: "Joan Bibiloni", rol: "Especialista Electricitat", especialitat: "electricitat", telefon: "622334455", actiu: true, baixes_temporals: [{ id: 101, tipus: "dies_lliures", dataInici: "2026-11-05", dataFi: "2026-11-06", motiu: "Assumptes propis / Permís" }] },
  { id: 3, nom: "Biel Pou", rol: "Peó / Neteja Viària", especialitat: "peo_neteja", telefon: "633445566", actiu: true, baixes_temporals: [{ id: 102, tipus: "vacances", dataInici: "2026-10-28", dataFi: "2026-11-04", motiu: "Vacances de tardor" }] },
  { id: 4, nom: "Pere Ramis", rol: "Oficial Climatització i Calefacció", especialitat: "climatitzacio", telefon: "644556677", actiu: true, baixes_temporals: [] }
];

const TASQUES_DEMO = [
  {
    id: "SE-2026-0001",
    titol: "Reparació de fanal i presa de terra al carrer principal",
    descripcio: "Fanal intermitent amb perill elèctric davant l'Escoleta municipal. Requereix equip de 2 persones per alçada i seguretat elèctrica.",
    prioritat: "urgent",
    categoria: "electricitat",
    estat: "pendent",
    carrer: "MAJOR",
    codiCarrer: "00103",
    nucli: "Santa Eugènia (Vila)",
    operariIds: [1, 2],
    tempsTotalSegons: 0,
    creatEl: new Date().toISOString()
  },
  {
    id: "SE-2026-0002",
    titol: "Neteja i desbrossament del camí d'accés",
    descripcio: "Mala herba envaint vorera i visibilitat reduïda a la cruïlla principal.",
    prioritat: "mitja",
    categoria: "peo_neteja",
    estat: "pendent",
    carrer: "PUGET",
    codiCarrer: "00071",
    nucli: "Santa Eugènia (Vila)",
    operariIds: [3],
    tempsTotalSegons: 0,
    creatEl: new Date().toISOString()
  }
];

async function seed() {
  console.log("🌱 Sembrant dades de prova a Firestore...");
  
  for (const op of OPERARIS_DEMO) {
    await db.collection('operaris').doc(String(op.id)).set(op, { merge: true });
    console.log(`  ✓ Operari: ${op.nom} (ID: ${op.id})`);
  }

  for (const t of TASQUES_DEMO) {
    await db.collection('tasques').doc(t.id).set(t, { merge: true });
    console.log(`  ✓ Tasca: ${t.id} - ${t.titol}`);
  }

  console.log("✅ Dades demo carregades satisfactòriament.");
}

seed().catch(console.error);
