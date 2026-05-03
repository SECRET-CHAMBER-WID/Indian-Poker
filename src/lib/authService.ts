import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { auth, database, MASTER_EMAIL } from '../config/firebase';
import type { UserProfile } from '../types';

const AUTH_EMAIL_DOMAIN = 'indianpoker.local';
export const DEFAULT_CREDITS = 1000;

export function validatePin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function firebasePasswordFromPin(pin: string) {
  if (!validatePin(pin)) {
    throw new Error('비밀번호는 4자리 숫자여야 합니다.');
  }

  return `pin-${pin}-indian-poker`;
}

function nicknameToAuthEmail(nickname: string) {
  const normalized = nickname.trim().toLowerCase();
  const bytes = Array.from(new TextEncoder().encode(normalized));
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `u-${hex}@${AUTH_EMAIL_DOMAIN}`;
}

function buildPlayerProfile(user: User, nickname: string): UserProfile {
  const now = Date.now();

  return {
    uid: user.uid,
    nickname,
    role: 'player',
    credits: DEFAULT_CREDITS,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    online: true,
    currentRoom: null,
    createdAt: now,
    lastSeen: now
  };
}

async function ensurePlayerProfile(user: User, nickname: string) {
  const profileRef = ref(database, `users/${user.uid}`);
  const snapshot = await get(profileRef);

  if (!snapshot.exists()) {
    await set(profileRef, buildPlayerProfile(user, nickname));
    return;
  }

  await update(profileRef, {
    nickname,
    online: true,
    lastSeen: Date.now()
  });
}

export async function loginOrRegister(nickname: string, pin: string) {
  const cleanNickname = nickname.trim();

  if (!cleanNickname) {
    throw new Error('닉네임을 입력해 주세요.');
  }

  if (cleanNickname === '위드') {
    throw new Error('이 이름은 사용할 수 없습니다.');
  }

  const email = nicknameToAuthEmail(cleanNickname);
  const password = firebasePasswordFromPin(pin);

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensurePlayerProfile(credential.user, cleanNickname);
    return credential.user;
  } catch (signInError) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: cleanNickname });
      await ensurePlayerProfile(credential.user, cleanNickname);
      return credential.user;
    } catch (createError) {
      const code = (createError as { code?: string }).code;

      if (code === 'auth/email-already-in-use') {
        throw new Error('이미 사용 중인 이름입니다. 기존 4자리 비밀번호를 입력해 주세요.');
      }

      throw signInError;
    }
  }
}

export async function loginMaster(pin: string) {
  const password = firebasePasswordFromPin(pin);
  const credential = await signInWithEmailAndPassword(auth, MASTER_EMAIL, password);
  const snapshot = await get(ref(database, `users/${credential.user.uid}`));
  const profile = snapshot.val() as UserProfile | null;

  if (profile?.role !== 'master' || profile.nickname !== '위드') {
    await signOut(auth);
    throw new Error('접속 정보를 확인해 주세요.');
  }

  await update(ref(database, `users/${credential.user.uid}`), {
    online: true,
    lastSeen: Date.now()
  });

  return credential.user;
}

export async function logout() {
  const uid = auth.currentUser?.uid;

  if (uid) {
    await update(ref(database, `users/${uid}`), {
      online: false,
      currentRoom: null,
      lastSeen: Date.now()
    }).catch(() => undefined);
  }

  await signOut(auth);
}
