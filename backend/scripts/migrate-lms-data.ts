/**
 * LMS Data Migration Script
 * Migrates all LMS collections from NERMAI_ACADEMY (nermai-academy-backend)
 * to NERMAI_IAS_ACADEMY (nermaiiasacademy-519c8)
 *
 * Collections migrated:
 *   courses, subjects, topics, classes, resources,
 *   live_sessions, enrollments, batch_memberships, watch_history
 *
 * Run with: npx ts-node migrate-lms-data.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ── SOURCE project (NERMAI_ACADEMY → nermai-academy-backend) ──────────────────
const SOURCE_CREDENTIAL = {
  projectId: 'nermai-academy-backend',
  clientEmail: 'firebase-adminsdk-fbsvc@nermai-academy-backend.iam.gserviceaccount.com',
  privateKey: [
    '-----BEGIN PRIVATE KEY-----',
    'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDnaVOPjfuVOzR8',
    'RSuxk3Hm8Pa3vcinqt8l/cz//b02gqX7U406GTJ4VeyT9M2XHF3lhFUGwa0TRqqW',
    '9pa93asUdMarbyz5khBsQd0met5Nr6tX47/hykcgYZSRe2xoaVjm4IFArkpmJ9IQ',
    'QTeoQ/QU7XTtT3BH3fzC1kwY+CrP3mDZwq0BUWmdHsW3sqQDunBW9An0wwHh4vAj',
    'tePIFUIh50trhWWagZB9VDLKpNpWaSqdnbDa5yQsDFx+b3khswVF+BdzYtrL654b',
    'LD3wTTwHNqrKXajkwWUwu3SqAVXHNJl0oMJc6QbcOVw2NRfDfo59KJp+yYiSixma',
    'g4MsHb39AgMBAAECggEAIwIVoJmHrmdTBNvIBOi76gaZJGnjIa5hbNNtAGsoBUeV',
    'iaR1sIzgTEEfdbCqq4ogkFjJLij9oHVn2Ee8vUN8Hq+d4JCEmsrkjiQWqzwaRmFl',
    'h/nN7QAXa4gnnCyyVUdeqirbkufrHHI4vrnHDD8ffU0BC+ehIlYsZ2NZBswAWgrO',
    'MO15dxSNJFBryCjmd0lEMxzoXg9JW4bAJyWYHoCXh7HUIlnecNQHu70SmsuGluqp',
    'o24fjVu0/Djb8k/KgUhASzn2j38c1as6fnnFtGPq4ICKvqcCxx3vOLNCIz2+A3eD',
    'jiLFbBglYQtMLt7kL6gByeyv6se+BSWvytxBtkx1kQKBgQD2cgrmfC9FhFEZKBDq',
    'u/CM4xSAx4eqz+u/auB9wbkOE+eWMWiyWDrzwVSR+G5akN8Mhj04up/yOsmYnd26',
    '85X9a1ycHL2jU3btjBss0tm0PhbKh/k2MlRBQirmk620i93U4SCmN+DHgqamCqy+',
    'N4lWKB+u3YLAD88c9dqeYWkrVQKBgQDwYhJe0ospRwVd8pkYq6GsSigu3pCaOM9l',
    'WO3K053t5GsMnN0SAMuMgxGaf5vf2invCyGLY4wj/PYtKDCivmFdBjmTL1rHnuAg',
    'LUAvYrz4ftB/ISeJ5MV250iireXOuPtp1o+64ZzIOIs0bePbbIdueubQtnIGeHB9',
    'D8NVEm5YCQKBgA5JKBaaRkc6V1Uk/G4O/O+9zhd0+YlOSjUrZd4EV8zYHImZTZ9g',
    '+/HbWCKqCwOW+EcKlQvvzYvGGp+NLyhCLISnL5QhGmEYWoGEqKKdil8nZjzRSwH4',
    'QugRhNke4Gfh37cSYckg3hfSnARuA/t2zrA+3S9OyeCGShQ8sDKUJPuNAoGBALbz',
    'fVXL2nxNAGmzVQ/wuLifLBwX6mhmKnrRBxJiowVG3q6XyK2GC2Vi8AftbV4e9eFo',
    'UFx9JFDTmy1dND74tLOPJEzAMtBRO/VhW0N1W6upINhRDH2nrx5DAwZFYe1G3pp7',
    '4aJzSdcdKd16cXw0CpNsWLWq1ffUvJCCacEaqP65AoGBAMYFZp1fypuJPOVqgFFF',
    'au+AT19Wy8QRvau6iU7b9GGhx0ISoYjE3PWfzNMCkq0pPe1uOTzebppHPC2Vp6sm',
    'j9c+u8uteMXWi1oeFqDka7Dp5QHaDHuiwjaP4LeCMv3R+w308gwNxm2rEaH7QMge',
    'jATGDvx1nxvBcIxl8+0GghCv',
    '-----END PRIVATE KEY-----',
  ].join('\n'),
};

// ── DESTINATION project (NERMAI_IAS_ACADEMY → nermaiiasacademy-519c8) ──────────
const DEST_CREDENTIAL = {
  projectId: 'nermaiiasacademy-519c8',
  clientEmail: 'firebase-adminsdk-fbsvc@nermaiiasacademy-519c8.iam.gserviceaccount.com',
  privateKey: process.env.DEST_PRIVATE_KEY ||
    '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCexbdDuiTtJRtM\nZqPUUJmMiBQLNMD7pH9/KqAIKXQruGK/pqrWygAlto+6dGFU6jI9GTmvmpfAvoUO\n+r2uhG8U//yGp1F1Z1/38AoTHQcCng/omCH+29Sbwgz6gxeZ+VMTc8M/lGWxh/sO\nj5KgeBCcJOJk2mtTNUr6xzh2cyQvQJDIEiZoERbBgP8LMTO5zj7VzFj++nqoCfGP\n3uKEbQF02DlU2eCcsCXM7bvrNl/2YGhkmRnBvk7cBDvTqch71so3nVlibRWt89zP\nu37G6yjwATnFi8ddn4zbD6I4mA0/v7N3Ly6rKZCh2BzHzXRKZRWBOqvAWoSE9dn3\ncLqb0j61AgMBAAECggEAJQc2665qpLzh7jJE1IP8n4Pv6sIhnL57NpjmDClAzN56\ndzhjQOcI3ELEp+cy+OcKkunCZJQg/qRgK0Nqf9wmfOcLiYrVilQy00PR0a3UH/Xl\nf2kVipbRsYay2KzAkRoO2CtIFpihE+OC910gBNkjhIrsmrk+zP/RjgVuw18sifE+\nlKQTsF96BDb8ha0a35+563hDQzM6rNIaQQO7j+y8B/XkGqmVZVAWp34O9vyYuUsm\no0BMVuP/GpryLOPiCVyEee3BKfsfJKVL0BMbZlzfnUobFZVjdmR6py/ARnTCp/jQ\nVnX0rB4ToWcAbKgJuK3LX3Hiaa43X9mgZjtLuUSyoQKBgQDNj20PQSwvm4alqd2w\nGSPJ8pdXFiZZD9SamMEql50GTyEQMIWzpOOF52Xzh1z7hNDFzbnA5v3eGCPTgrMU\nJi9R8Y9o8xST07akUUpNwmHf1mwpWIrooRgN0C7htTaxucB4owYd0iLlosumchos\n74OKCtZnH+5y4BPG3LFI7ATQIQKBgQDFuzx9a2vHO81bTKfO50IWRINYFcin5/a2\ng4NLCRFSF/yPao4rRQfLzsGW4wZ9jGQtFRIlZtqNfQn2P4SylIevxfPCL69zWxAe\nqh4BtKrAP099ZLNNrcuLKGZuyBw+dJL2JvOJf/hfW2B2dS5iOtGIF4PsIXxTzXVL\n6GaDvLesFQKBgEuluqbgfxhODfEtYA4MUmVhR1yfJCGmd8Ek8gFwpjLKMAq7MJj5\n11lR3O0QJaHSMNp6aR+aYla3X4fZE3oYy1VGplYjDrGQOiiiWcvf+xDa4hcdJJGT\npzx+HqKlg6lICJLcu8WBraIAlR195DAhPLEyZ9CvqZrQ57ZJRVzmrqbBAoGAGR7O\ncoihKrCYSE8WypxqsvWFUj2CPoKjv1A57+B5CNrvRTEeWrTsZqIfyhGRk4WwfGG+\n6m2EupD2IQi0zRM9ocEeVL9GJPuesqaeJU1UnBPu/1k5xlacE1PQn6ZgoDajLQ6J\nxiAx57tuJ95/RA+A6y9BnVArwWHK0xf1XistknkCgYBbJ3rZbmBkYvb19fohJXff\nlOhxK1NyxM6+0gowCuxVLRFi+xsGsf/Vkg8GpeKjYvkeUg0wJIG9uZKvpWgrgGFd\nqJZoLOfv55PwZt+lehwGpedT/HsCJZgNXsfGLG8V3RiysLalJJ2Xio0zy1ePTVh3\nqglBmMhg2C4R+FQ/+u4IsA==\n-----END PRIVATE KEY-----\n',
};

const TARGET_TENANT_ID = 'default_tenant';

// LMS collections to migrate
const LMS_COLLECTIONS = [
  'courses',
  'subjects',
  'topics',
  'classes',
  'resources',
  'live_sessions',
  'enrollments',
  'batch_memberships',
  'watch_history',
  'access_rules',
  'knowledge_base',
];

async function migrate() {
  console.log('🚀 Starting LMS Data Migration');
  console.log(`   Source:      nermai-academy-backend`);
  console.log(`   Destination: nermaiiasacademy-519c8`);
  console.log('');

  // Initialize source app
  const sourceApp = admin.initializeApp(
    {
      credential: admin.credential.cert(SOURCE_CREDENTIAL as admin.ServiceAccount),
      projectId: SOURCE_CREDENTIAL.projectId,
    },
    'source'
  );

  // Initialize destination app
  const destApp = admin.initializeApp(
    {
      credential: admin.credential.cert(DEST_CREDENTIAL as admin.ServiceAccount),
      projectId: DEST_CREDENTIAL.projectId,
    },
    'destination'
  );

  const sourceDb = admin.firestore(sourceApp);
  const destDb = admin.firestore(destApp);

  let totalMigrated = 0;
  let totalSkipped = 0;
  const summary: Record<string, { migrated: number; skipped: number }> = {};

  for (const collectionName of LMS_COLLECTIONS) {
    console.log(`📦 Migrating collection: ${collectionName}`);
    
    try {
      const snapshot = await sourceDb.collection(collectionName).get();

      if (snapshot.empty) {
        console.log(`   ⚠️  Empty — skipping`);
        summary[collectionName] = { migrated: 0, skipped: 0 };
        continue;
      }

      let migrated = 0;
      let skipped = 0;

      // Write in batches of 400 (Firestore limit is 500)
      const BATCH_SIZE = 400;
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = destDb.batch();
        const chunk = docs.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          const data = doc.data();

          // Check if already exists in destination
          const existingDoc = await destDb.collection(collectionName).doc(doc.id).get();
          if (existingDoc.exists) {
            skipped++;
            continue;
          }

          // Stamp with tenantId if not present
          const enriched = {
            ...data,
            tenantId: data.tenantId || TARGET_TENANT_ID,
            _migratedAt: new Date().toISOString(),
            _migratedFrom: 'nermai-academy-backend',
          };

          batch.set(destDb.collection(collectionName).doc(doc.id), enriched);
          migrated++;
        }

        await batch.commit();
        console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: wrote ${Math.min(chunk.length, migrated)} docs`);
      }

      console.log(`   📊 ${collectionName}: ${migrated} migrated, ${skipped} already existed`);
      summary[collectionName] = { migrated, skipped };
      totalMigrated += migrated;
      totalSkipped += skipped;

    } catch (err: any) {
      console.error(`   ❌ Error migrating ${collectionName}:`, err.message);
      summary[collectionName] = { migrated: 0, skipped: 0 };
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ MIGRATION COMPLETE');
  console.log(`   Total migrated: ${totalMigrated} documents`);
  console.log(`   Total skipped:  ${totalSkipped} documents (already existed)`);
  console.log('\nPer-collection breakdown:');
  for (const [col, stats] of Object.entries(summary)) {
    console.log(`   ${col.padEnd(20)}: ${stats.migrated} migrated, ${stats.skipped} skipped`);
  }
  console.log('═══════════════════════════════════════════');

  // Clean up
  await sourceApp.delete();
  await destApp.delete();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
