import admin from 'firebase-admin';

const databaseURL = process.env.FIREBASE_DATABASE_URL;
const masterEmail = process.env.MASTER_EMAIL ?? 'master@indianpoker.local';
const masterName = process.env.MASTER_NAME;
const masterPin = process.env.MASTER_PIN;

function firebasePasswordFromPin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('MASTER_PIN must be exactly four digits.');
  }

  return `pin-${pin}-indian-poker`;
}

if (!databaseURL) {
  throw new Error('Set FIREBASE_DATABASE_URL before running this script.');
}

if (!masterName || !masterPin) {
  throw new Error('Set MASTER_NAME and MASTER_PIN before running this script.');
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

  console.log(`Operator account ready: ${masterName}`);
  console.log(`Firebase Auth email: ${masterEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
