#!/usr/bin/env node
/**
 * scripts/bootstrap-production.mjs
 * Provisió automàtica d'usuaris d'Auth i rols de Firestore a Producció.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const API_KEY = 'AIzaSyBr_ntrv7rZqF4LbUnvjRCK3GijReSH1Mc';
const PROJECT_ID = 'brigada-santa-eugenia';

// Llegir el token d'accés de Firebase CLI
const configPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error("❌ No s'ha trobat la sessió de Firebase CLI a ~/.config/configstore/firebase-tools.json");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const cliAccessToken = config.tokens?.access_token;
if (!cliAccessToken) {
  console.error("❌ No s'ha trobat cap access_token vàlid a la configuració de Firebase CLI.");
  process.exit(1);
}

// Validació estricta de variables d'entorn a Producció (sense contrasenyes per defecte)
const initialOpPin = process.env.OPERARI_INITIAL_PIN || '';
const getOpPin = (num) => process.env[`PIN_OP_${num}`] || initialOpPin;

const missingEnv = [];
if (!process.env.ADMIN_PASSWORD) missingEnv.push('ADMIN_PASSWORD');
for (let i = 1; i <= 6; i++) {
  if (!getOpPin(i)) missingEnv.push(`PIN_OP_${i} (o OPERARI_INITIAL_PIN)`);
}

if (missingEnv.length > 0) {
  console.error(`❌ Error crític: Falten les següents variables d'entorn obligatòries a producció: ${missingEnv.join(', ')}.`);
  console.error("   Per motius de seguretat no es permeten credencials ni PINs per defecte codificats al programa.");
  process.exit(1);
}

const USUARIS = [
  {
    tipus: 'admin',
    email: process.env.ADMIN_EMAIL || 'peplluisurraca@ajsantaeugenia.net',
    password: process.env.ADMIN_PASSWORD,
    nom: 'Cap de Brigada',
    rol: 'admin'
  },
  {
    tipus: 'operari',
    operariId: 1,
    email: 'op-1@brigada-santa-eugenia.local',
    password: getOpPin(1),
    nom: 'Nofre Torrens',
    rol: 'operari'
  },
  {
    tipus: 'operari',
    operariId: 2,
    email: 'op-2@brigada-santa-eugenia.local',
    password: getOpPin(2),
    nom: 'Joan Bibiloni',
    rol: 'operari'
  },
  {
    tipus: 'operari',
    operariId: 3,
    email: 'op-3@brigada-santa-eugenia.local',
    password: getOpPin(3),
    nom: 'Carlos Ferriol',
    rol: 'operari'
  },
  {
    tipus: 'operari',
    operariId: 4,
    email: 'op-4@brigada-santa-eugenia.local',
    password: getOpPin(4),
    nom: 'Miquel Roca',
    rol: 'operari'
  },
  {
    tipus: 'operari',
    operariId: 5,
    email: 'op-5@brigada-santa-eugenia.local',
    password: getOpPin(5),
    nom: 'Juan Carlos Alfonso',
    rol: 'operari'
  },
  {
    tipus: 'operari',
    operariId: 6,
    email: 'op-6@brigada-santa-eugenia.local',
    password: getOpPin(6),
    nom: 'Juan Carlos Dols',
    rol: 'operari'
  }
];

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function createUserOrGetUid(email, password, displayName) {
  // Prova de crear usuari
  const createRes = await httpRequest({
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signUp?key=${API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email,
    password,
    displayName,
    returnSecureToken: true
  });

  if (createRes.status === 200 && createRes.data?.localId) {
    return { uid: createRes.data.localId, isNew: true };
  }

  // Si ja existeix (EMAIL_EXISTS), fem login per obtenir el UID
  if (createRes.data?.error?.message === 'EMAIL_EXISTS') {
    const loginRes = await httpRequest({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email,
      password,
      returnSecureToken: true
    });

    if (loginRes.status === 200 && loginRes.data?.localId) {
      return { uid: loginRes.data.localId, isNew: false };
    }
    throw new Error(`Error en obtenir UID de ${email}: ${JSON.stringify(loginRes.data)}`);
  }

  throw new Error(`Error en crear ${email} (${createRes.status}): ${JSON.stringify(createRes.data)}`);
}

async function setFirestoreRole(uid, roleData) {
  const fields = {
    rol: { stringValue: roleData.rol },
    nom: { stringValue: roleData.nom },
    email: { stringValue: roleData.email },
    actualitzatEl: { stringValue: new Date().toISOString() }
  };
  if (roleData.operariId !== undefined) {
    fields.operariId = { integerValue: String(roleData.operariId) };
  }

  const res = await httpRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/rols/${uid}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${cliAccessToken}`,
      'Content-Type': 'application/json'
    }
  }, { fields });

  if (res.status !== 200) {
    throw new Error(`Error escrivint a Firestore rols/${uid} (${res.status}): ${JSON.stringify(res.data)}`);
  }
}

async function main() {
  console.log('🚀 Iniciant provisió d\'usuaris i rols a Producció Firebase...');

  for (const user of USUARIS) {
    try {
      console.log(`\nProcessant usuari: ${user.email} (${user.nom})...`);
      const { uid, isNew } = await createUserOrGetUid(user.email, user.password, user.nom);
      console.log(`  ✓ Auth UID: ${uid} (${isNew ? 'Creat' : 'Existent'})`);

      await setFirestoreRole(uid, user);
      console.log(`  ✓ Rol assignat a Firestore rols/${uid} -> rol: '${user.rol}'${user.operariId ? `, operariId: ${user.operariId}` : ''}`);
    } catch (err) {
      console.error(`  ❌ Error amb ${user.email}:`, err.message);
      if (err.message.includes('CONFIGURATION_NOT_FOUND')) {
        console.error('\n⚠️ ATENCIÓ: Firebase Authentication encara no està habilitat a la consola.');
        console.error('Si us plau, accedeix a https://console.firebase.google.com/project/brigada-santa-eugenia/authentication');
        console.error('Clica "Comença" i activa el proveïdor "Correu electrònic / contrasenya".');
        process.exit(2);
      }
    }
  }

  console.log('\n✅ Provisió completada correctament!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
