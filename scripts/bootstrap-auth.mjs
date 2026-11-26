#!/usr/bin/env node
/**
 * scripts/bootstrap-auth.mjs
 * 
 * Script de provisió d'usuaris i rols per a Firebase Authentication i Firestore.
 * Crea:
 *  - 1 Administrador (Cap de Brigada): email real o admin@brigada-santa-eugenia.local
 *  - 4 Operaris amb email sintètic op-<id>@brigada-santa-eugenia.local i PIN de 6 dígits
 *  - Documents a la col·lecció 'rols/{uid}'
 *
 * Ús local amb emulador:
 *   export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *   export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
 *   node scripts/bootstrap-auth.mjs
 *
 * Ús en producció / entorn remot (amb compte de servei):
 *   export SERVICE_ACCOUNT_KEY="./serviceAccountKey.json"
 *   node scripts/bootstrap-auth.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
  console.log(`🔑 Inicialitzat amb Service Account per al projecte: ${PROJECT_ID}`);
} else {
  // Emulador o credencials per defecte d'aplicació
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  app = initializeApp({
    projectId: PROJECT_ID
  });
  console.log(`🧪 Inicialitzat en mode Emulador (Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}, Firestore: ${process.env.FIRESTORE_EMULATOR_HOST})`);
}

const auth = getAuth(app);
const db = getFirestore(app);

// Validació estricta de variables d'entorn (sense contrasenyes ni PINs per defecte)
const initialOpPin = process.env.OPERARI_INITIAL_PIN || '';
const getOpPin = (num) => process.env[`PIN_OP_${num}`] || initialOpPin;

const missingEnv = [];
if (!process.env.ADMIN_PASSWORD) missingEnv.push('ADMIN_PASSWORD');
for (let i = 1; i <= 6; i++) {
  if (!getOpPin(i)) missingEnv.push(`PIN_OP_${i} (o OPERARI_INITIAL_PIN)`);
}

if (missingEnv.length > 0) {
  console.error(`❌ Error de seguretat: Falten variables d'entorn obligatòries: ${missingEnv.join(', ')}`);
  console.error("   No es permeten contrasenyes per defecte. Defineix-les abans d'executar el script.");
  process.exit(1);
}

const ADMIN_USER = {
  email: process.env.ADMIN_EMAIL || 'peplluisurraca@ajsantaeugenia.net',
  password: process.env.ADMIN_PASSWORD,
  displayName: 'Cap de Brigada',
  rol: 'admin'
};

const OPERARIS = [
  { id: 1, nom: 'Nofre Torrens', pin: getOpPin(1), rol: 'operari' },
  { id: 2, nom: 'Joan Bibiloni', pin: getOpPin(2), rol: 'operari' },
  { id: 3, nom: 'Carlos Ferriol', pin: getOpPin(3), rol: 'operari' },
  { id: 4, nom: 'Miquel Roca', pin: getOpPin(4), rol: 'operari' },
  { id: 5, nom: 'Juan Carlos Alfonso', pin: getOpPin(5), rol: 'operari' },
  { id: 6, nom: 'Juan Carlos Dols', pin: getOpPin(6), rol: 'operari' }
];

async function upsertUser(email, password, displayName) {
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`  ℹ Usuari existent trobat: ${email} (UID: ${existing.uid}). Actualitzant...`);
    await auth.updateUser(existing.uid, {
      password,
      displayName
    });
    return existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true
      });
      console.log(`  ✓ Creat nou usuari: ${email} (UID: ${created.uid})`);
      return created.uid;
    }
    throw err;
  }
}

async function main() {
  console.log('🚀 Iniciant provisió d\'usuaris i rols...');

  // 1. Administrador (Cap de Brigada)
  console.log('\n--- Providenciant Administrador ---');
  const adminUid = await upsertUser(ADMIN_USER.email, ADMIN_USER.password, ADMIN_USER.displayName);
  await db.collection('rols').doc(adminUid).set({
    rol: 'admin',
    nom: ADMIN_USER.displayName,
    email: ADMIN_USER.email,
    actualitzatEl: new Date().toISOString()
  }, { merge: true });
  console.log(`  ✓ Document de rol assignat a rols/${adminUid} -> { rol: 'admin' }`);

  // 2. Operaris
  console.log('\n--- Providenciant Operaris ---');
  for (const op of OPERARIS) {
    const email = `op-${op.id}@brigada-santa-eugenia.local`;
    const uid = await upsertUser(email, op.pin, op.nom);
    await db.collection('rols').doc(uid).set({
      rol: 'operari',
      operariId: op.id,
      nom: op.nom,
      email,
      actualitzatEl: new Date().toISOString()
    }, { merge: true });
    console.log(`  ✓ Document de rol assignat a rols/${uid} -> { rol: 'operari', operariId: ${op.id} }`);
  }

  console.log('\n✅ Provisió d\'usuaris i rols completada amb èxit!');
}

main().catch((err) => {
  console.error('\n❌ Error durant la provisió:', err);
  process.exit(1);
});
