import { get, ref, remove, runTransaction, update } from 'firebase/database';
import { database } from '../config/firebase';
import type { Room, UserProfile } from '../types';

export async function adjustUserCredits(uid: string, delta: number) {
  await runTransaction(ref(database, `users/${uid}/credits`), (current: number | null) => {
    return Math.max(0, Number(current ?? 0) + delta);
  });
}

export async function deleteUserData(uid: string) {
  const roomsSnapshot = await get(ref(database, 'rooms'));
  const rooms = (roomsSnapshot.val() ?? {}) as Record<string, Room>;
  const updates: Record<string, unknown> = {
    [`users/${uid}`]: null
  };

  for (const room of Object.values(rooms)) {
    if (room.players?.[uid]) {
      updates[`rooms/${room.id}/players/${uid}`] = null;
    }

    if (room.spectators?.[uid]) {
      updates[`rooms/${room.id}/spectators/${uid}`] = null;
    }

    updates[`roomCards/${room.id}/${uid}`] = null;
  }

  await update(ref(database), updates);
}

export async function resetGameData() {
  await update(ref(database), {
    rooms: null,
    roomCards: null
  });
}

export async function resetAllData(masterProfile: UserProfile) {
  const preservedMaster: UserProfile = {
    ...masterProfile,
    online: true,
    currentRoom: null,
    lastSeen: Date.now()
  };

  await update(ref(database), {
    rooms: null,
    roomCards: null,
    users: {
      [masterProfile.uid]: preservedMaster
    }
  });
}

export async function deleteRoom(roomId: string) {
  await Promise.all([
    remove(ref(database, `rooms/${roomId}`)),
    remove(ref(database, `roomCards/${roomId}`))
  ]);
}
