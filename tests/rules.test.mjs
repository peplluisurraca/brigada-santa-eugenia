import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PROJECT_ID = 'brigada-santa-eugenia-test';

describe('Firestore Security Rules - Brigada Santa Eugènia', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  after(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (testEnv) await testEnv.clearFirestore();

    // Dades inicials directes amb regles desactivades
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Rols
      await db.collection('rols').doc('uid-admin').set({ rol: 'admin', nom: 'Cap de Brigada' });
      await db.collection('rols').doc('uid-op1').set({ rol: 'operari', operariId: 1, nom: 'Toni Coll' });
      await db.collection('rols').doc('uid-op2').set({ rol: 'operari', operariId: 2, nom: 'Joan Bibiloni' });

      // Operaris
      await db.collection('operaris').doc('1').set({ id: 1, nom: 'Toni Coll', actiu: true });
      await db.collection('operaris').doc('2').set({ id: 2, nom: 'Joan Bibiloni', actiu: true });

      // Tasques
      await db.collection('tasques').doc('T-OP1').set({
        id: 'T-OP1',
        titol: 'Reparació de fanal',
        prioritat: 'urgent',
        estat: 'pendent',
        operariIds: [1],
        tempsTotalSegons: 0
      });

      await db.collection('tasques').doc('T-OP2').set({
        id: 'T-OP2',
        titol: 'Poda d\'arbres',
        prioritat: 'mitja',
        estat: 'pendent',
        operariIds: [2],
        tempsTotalSegons: 0
      });
    });
  });

  it('1. Anònim: No pot llegir ni escriure a cap col·lecció', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('operaris').doc('1').get());
    await assertFails(unauthedDb.collection('tasques').doc('T-OP1').get());
    await assertFails(unauthedDb.collection('rols').doc('uid-admin').get());
    await assertFails(unauthedDb.collection('tasques').add({ titol: 'Injecció no autoritzada' }));
  });

  it('2. Operari: Pot llegir operaris però NO pot escriure-hi ni donar altes', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertSucceeds(op1Db.collection('operaris').doc('1').get());
    await assertSucceeds(op1Db.collection('operaris').doc('2').get());
    await assertFails(op1Db.collection('operaris').doc('3').set({ nom: 'Nou operari' }));
  });

  it('3. Operari 1: Pot llegir la seva tasca però NO la de l\'Operari 2', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertSucceeds(op1Db.collection('tasques').doc('T-OP1').get());
    await assertFails(op1Db.collection('tasques').doc('T-OP2').get());
  });

  it('4. Operari 1: NO pot alterar la prioritat ni crear noves tasques', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertFails(op1Db.collection('tasques').doc('T-OP1').update({ prioritat: 'baixa' }));
    await assertFails(op1Db.collection('tasques').add({ titol: 'Nova tasca', operariIds: [1] }));
  });

  it('5. Operari 1: Pot actualitzar l\'estat, temps i signatura de la seva tasca', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertSucceeds(op1Db.collection('tasques').doc('T-OP1').update({
      estat: 'en_curs',
      tempsTotalSegons: 300,
      tempsInici: '2026-11-12T08:00:00Z'
    }));
  });

  it('6. Administrador: Té accés total de lectura, creació, edició i eliminació', async () => {
    const adminDb = testEnv.authenticatedContext('uid-admin').firestore();
    await assertSucceeds(adminDb.collection('operaris').doc('1').get());
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP1').get());
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP2').get());
    
    // Crear nova tasca
    await assertSucceeds(adminDb.collection('tasques').doc('T-NOVA').set({
      titol: 'Nova tasca oficial',
      prioritat: 'urgent',
      operariIds: [1, 2]
    }));

    // Modificar prioritat
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP1').update({ prioritat: 'baixa' }));

    // Esborrar tasca
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP2').delete());
  });
});
