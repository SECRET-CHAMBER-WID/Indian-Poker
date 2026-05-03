import admin from 'firebase-admin';

const databaseURL = process.env.FIREBASE_DATABASE_URL;
const masterEmail = process.env.MASTER_EMAIL ?? 'master@indianpoker.local';
const masterName = process.env.MASTER_NAME ?? '위드';
const masterPin = process.env.MASTER_PIN ?? '4001';

function firebasePasswordFromPin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('MASTER_PIN must be exactly four digits.');
  }
  return `pin-${pin}-indian-poker`;
}

if (!databaseURL) {
  throw new Error('Set FIREBASE_DATABASE_URL before running npm run seed:master.');
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL
});

async function main() {
  const password = firebasePasswordFromPin(masterPin);
  let user;

  try {
    user = await admin.auth().getUserByEmail(masterEmail);
    await admin.auth().updateUser(user.uid, {
      password,
      displayName: masterName
    });
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }

    user = await admin.auth().createUser({
      email: masterEmail,
      password,
      displayName: masterName
    });
  }

  await admin.auth().setCustomUserClaims(user.uid, { role: 'master' });

  await admin.database().ref(`users/${user.uid}`).set({
    uid: user.uid,
    nickname: masterName,
    role: 'master',
    credits: 0,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    online: false,
    createdAt: Date.now(),
    lastSeen: Date.now()
  });

  console.log(`Master account ready: ${masterName} / ${masterPin}`);
  console.log(`Firebase Auth email: ${masterEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
