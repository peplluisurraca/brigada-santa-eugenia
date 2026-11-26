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

  it('7. Operari: NO pot modificar una tasca que ja està en estat finalitzada (B2)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('tasques').doc('T-FIN').set({
        id: 'T-FIN',
        titol: 'Tasca tancada',
        estat: 'finalitzada',
        operariIds: [1],
        teSignatura: true,
        nomSignatari: 'Cap de Brigada',
        tempsTotalSegons: 1200
      });
    });

    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertFails(op1Db.collection('tasques').doc('T-FIN').update({
      tempsTotalSegons: 1500
    }));
  });

  it('8. Operari: NO pot finalitzar tasca sense teSignatura i nomSignatari no buit (B2)', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    // Sense signatura: ha de fallar
    await assertFails(op1Db.collection('tasques').doc('T-OP1').update({
      estat: 'finalitzada'
    }));
    // Amb signatura però sense nom: ha de fallar
    await assertFails(op1Db.collection('tasques').doc('T-OP1').update({
      estat: 'finalitzada',
      teSignatura: true,
      nomSignatari: ''
    }));
    // Amb signatura i nom vàlid: ha de tenir èxit
    await assertSucceeds(op1Db.collection('tasques').doc('T-OP1').update({
      estat: 'finalitzada',
      teSignatura: true,
      nomSignatari: 'Joan Responsable'
    }));
  });

  it('9. Operari: NO pot escriure fotoInicial a la subcol·lecció adjunts (B3)', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoInicial').set({
      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    }));
  });

  it('10. Operari: Pot crear fotoFinal i signatura, però NO sobreescriure ni esborrar (B3)', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    const validImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    
    // Create: permès
    await assertSucceeds(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoFinal').set({
      data: validImg
    }));
    
    // Update: denegat per a operari
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoFinal').update({
      data: validImg
    }));

    // Delete: denegat per a operari
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoFinal').delete());
  });

  it('11. Operari inactiu (actiu: false): NO pot accedir a cap recurs (B4)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('rols').doc('uid-inactiu').set({ rol: 'operari', operariId: 99, nom: 'Operari Inactiu' });
      await db.collection('operaris').doc('99').set({ id: 99, nom: 'Operari Inactiu', actiu: false });
      await db.collection('tasques').doc('T-INACTIU').set({
        id: 'T-INACTIU',
        titol: 'Tasca d inactiu',
        estat: 'pendent',
        operariIds: [99]
      });
    });

    const inactiuDb = testEnv.authenticatedContext('uid-inactiu').firestore();
    await assertFails(inactiuDb.collection('tasques').doc('T-INACTIU').get());
    await assertFails(inactiuDb.collection('operaris').doc('99').get());
  });

  it('12. RGPD: Operari NO pot llegir absències d un altre operari a subcol·lecció (B5)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('operaris').doc('1').collection('absencies').doc('abs-op1').set({
        tipus: 'baixa_medica',
        motiu: 'Motiu mèdic confidencial Op 1'
      });
      await db.collection('operaris').doc('2').collection('absencies').doc('abs-op2').set({
        tipus: 'baixa_medica',
        motiu: 'Motiu mèdic confidencial Op 2'
      });
    });

    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    // Pot llegir la seva pròpia absència
    await assertSucceeds(op1Db.collection('operaris').doc('1').collection('absencies').doc('abs-op1').get());
    // NO pot llegir l'absència d'un altre operari
    await assertFails(op1Db.collection('operaris').doc('2').collection('absencies').doc('abs-op2').get());
  });

  it('13. Adjunts: Payload no-imatge és rebutjat per expressió regular (B3)', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    // Text pla o atac XSS no-imatge
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('signatura').set({
      data: '<script>alert("xss")</script>'
    }));
    // URL externa
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('signatura').set({
      data: 'https://malicious.site/exploit.png'
    }));
    // SVG (bloquejat per prevenció XSS)
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('signatura').set({
      data: 'data:image/svg+xml;base64,PHN2Zy8+'
    }));
  });

  it('14. Admin pot esborrar adjunts i la tasca pare en cascada (operari denegat)', async () => {
    const validImg = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoInicial').set({ data: validImg });
      await db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoFinal').set({ data: validImg });
    });

    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    const adminDb = testEnv.authenticatedContext('uid-admin').firestore();

    // Operari no pot esborrar adjunts ni tasques
    await assertFails(op1Db.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoInicial').delete());
    await assertFails(op1Db.collection('tasques').doc('T-OP1').delete());

    // Admin sí que pot esborrar adjunts (allow delete separat) i després la tasca
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoInicial').delete());
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP1').collection('adjunts').doc('fotoFinal').delete());
    await assertSucceeds(adminDb.collection('tasques').doc('T-OP1').delete());
  });

  it('15. Vies municipals i comptadors: lectura autenticada a vies, escriptura només admin', async () => {
    const op1Db = testEnv.authenticatedContext('uid-op1').firestore();
    const adminDb = testEnv.authenticatedContext('uid-admin').firestore();

    // Admin pot crear una via i escriure comptadors
    await assertSucceeds(adminDb.collection('vies').doc('via-99').set({ nom: 'CARRER NOU', nucli: 'Santa Eugènia (Vila)' }));
    await assertSucceeds(adminDb.collection('comptadors').doc('tasques').set({ ultimAny: 2026, darrerNumero: 1 }));

    // Operari actiu pot llegir vies però NO escriure vies ni comptadors
    await assertSucceeds(op1Db.collection('vies').doc('via-99').get());
    await assertFails(op1Db.collection('vies').doc('via-100').set({ nom: 'NO PERMÈS' }));
    await assertFails(op1Db.collection('comptadors').doc('tasques').get());
  });
});
