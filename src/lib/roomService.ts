import {
  equalTo,
  get,
  limitToLast,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  set,
  update
} from 'firebase/database';
import { database } from '../config/firebase';
import { DEFAULT_CREDITS } from './authService';
import { dealCards } from './cards';
import {
  canStart,
  getPlayers,
  prepareRound,
  reduceBettingAction,
  reduceOpenVote,
  resetRoomForNextRound,
  resetTableCredits,
  settleShowdown
} from './gameEngine';
import type { BetAction, Card, ChatMessage, Room, RoomPlayer, UserProfile } from '../types';

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function getNextSeat(room: Room) {
  const occupied = new Set(getPlayers(room).map((player) => player.seat));

  for (let seat = 1; seat <= room.maxPlayers; seat += 1) {
    if (!occupied.has(seat)) {
      return seat;
    }
  }

  return room.maxPlayers;
}

function buildRoomPlayer(profile: UserProfile, room: Room): RoomPlayer {
  return {
    uid: profile.uid,
    nickname: profile.nickname,
    seat: getNextSeat(room),
    ready: false,
    joinedAt: Date.now(),
    connected: true,
    status: 'waiting',
    creditsAtTable: profile.credits > 0 ? profile.credits : DEFAULT_CREDITS,
    roundBet: 0,
    totalBet: 0
  };
}

function resetReadyFlags(room: Room) {
  if (!room.players) {
    return;
  }

  for (const player of getPlayers(room)) {
    room.players[player.uid] = {
      ...player,
      ready: false
    };
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export async function createRoom(
  profile: UserProfile,
  input: { name: string; maxPlayers: number; ante: number; minRaise: number; turnSeconds: number; isPrivate?: boolean }
) {
  const roomRef = push(ref(database, 'rooms'));
  const now = Date.now();
  const room: Room = {
    id: roomRef.key!,
    code: makeRoomCode(),
    name: input.name.trim() || `${profile.nickname}의 방`,
    status: 'waiting',
    createdBy: profile.uid,
    createdByName: profile.nickname,
    maxPlayers: input.maxPlayers,
    isPrivate: Boolean(input.isPrivate),
    ante: input.ante,
    minRaise: input.minRaise,
    turnSeconds: input.turnSeconds,
    round: 0,
    players: {},
    spectators: {},
    game: {
      phase: 'idle',
      pot: 0,
      currentBet: 0,
      minRaise: input.minRaise,
      currentTurnUid: null,
      turnOrder: [],
      actionsThisRound: {}
    },
    logs: {},
    chat: {},
    createdAt: now,
    updatedAt: now
  };

  room.players![profile.uid] = buildRoomPlayer(profile, room);

  await set(roomRef, room);
  await update(ref(database, `users/${profile.uid}`), {
    currentRoom: room.id,
    lastSeen: Date.now()
  });

  return room.id;
}

export async function joinRoom(roomId: string, profile: UserProfile) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    if (current.players?.[profile.uid] || current.spectators?.[profile.uid]) {
      return current;
    }

    const next: Room = JSON.parse(JSON.stringify(current));
    const playerCount = getPlayers(next).length;

    if (next.status === 'waiting') {
      if (playerCount >= next.maxPlayers) {
        failure = '방 최대 인원을 초과했습니다.';
        return;
      }

      next.players = next.players ?? {};
      next.players[profile.uid] = buildRoomPlayer(profile, next);
      resetReadyFlags(next);
    } else {
      failure = '게임 중인 방에는 입장할 수 없습니다.';
      return;
    }

    next.updatedAt = Date.now();
    return next;
  });

  if (failure || !result.committed) {
    throw new Error(failure || '방 입장에 실패했습니다.');
  }

  await update(ref(database, `users/${profile.uid}`), {
    currentRoom: roomId,
    lastSeen: Date.now()
  });

  return roomId;
}

export async function joinRoomByCode(code: string, profile: UserProfile) {
  const roomsQuery = query(ref(database, 'rooms'), orderByChild('code'), equalTo(normalizeCode(code)));
  const snapshot = await get(roomsQuery);

  if (!snapshot.exists()) {
    throw new Error('해당 방 코드를 찾을 수 없습니다.');
  }

  const rooms = snapshot.val() as Record<string, Room>;
  const roomId = Object.keys(rooms)[0];
  return joinRoom(roomId, profile);
}

export async function leaveRoom(roomId: string, profile: UserProfile) {
  await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      return null;
    }

    const next: Room = JSON.parse(JSON.stringify(current));
    const player = next.players?.[profile.uid];

    if (player && next.status === 'playing' && next.game?.phase === 'betting') {
      if (next.game.currentTurnUid === profile.uid && player.status === 'active') {
        try {
          return reduceBettingAction(current, profile.uid, 'fold');
        } catch {
          return next;
        }
      }

      player.status = 'folded';
      player.connected = false;
      next.players![profile.uid] = player;
      next.updatedAt = Date.now();

      return next;
    }

    if (next.players?.[profile.uid]) {
      delete next.players[profile.uid];
      resetReadyFlags(next);
    }

    if (next.spectators?.[profile.uid]) {
      delete next.spectators[profile.uid];
    }

    const remainingPlayers = getPlayers(next);

    if (remainingPlayers.length === 0) {
      return null;
    }

    if (!next.players?.[next.createdBy]) {
      next.createdBy = remainingPlayers[0].uid;
      next.createdByName = remainingPlayers[0].nickname;
    }

    next.updatedAt = Date.now();
    return next;
  });

  await Promise.all([
    update(ref(database, `users/${profile.uid}`), {
      currentRoom: null,
      credits: profile.credits,
      lastSeen: Date.now()
    }).catch(() => undefined),
    remove(ref(database, `roomCards/${roomId}/${profile.uid}`)).catch(() => undefined)
  ]);
}

export async function toggleReady(roomId: string, uid: string, ready: boolean) {
  await update(ref(database, `rooms/${roomId}/players/${uid}`), {
    ready,
    connected: true
  });
  await update(ref(database, `rooms/${roomId}`), {
    updatedAt: Date.now()
  });
}

export async function startRoomGame(room: Room, starterUid: string) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${room.id}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    const startState = canStart(current);

    if (!startState.ok) {
      failure = startState.reason;
      return;
    }

    try {
      return prepareRound(current, starterUid);
    } catch (error) {
      failure = error instanceof Error ? error.message : '게임 시작에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || '이미 다른 참가자가 게임을 시작했습니다.');
  }

  const startedRoom = result.snapshot.val() as Room;
  const cardPlayerIds = getPlayers(startedRoom)
    .filter((player) => player.status === 'active' || player.status === 'allIn')
    .map((player) => player.uid);
  const cards = dealCards(cardPlayerIds);
  const cardUpdates = Object.entries(cards).reduce<Record<string, Card>>((updates, [uid, card]) => {
    updates[`roomCards/${room.id}/${uid}`] = card;
    return updates;
  }, {});

  await update(ref(database), {
    ...cardUpdates,
    [`rooms/${room.id}/game/phase`]: 'betting',
    [`rooms/${room.id}/updatedAt`]: Date.now()
  });
}

export async function submitBetAction(roomId: string, uid: string, action: BetAction, raiseTo?: number) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    try {
      return reduceBettingAction(current, uid, action, raiseTo);
    } catch (error) {
      failure = error instanceof Error ? error.message : '베팅 처리에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || '베팅 처리가 취소되었습니다.');
  }
}

export async function submitOpenVote(roomId: string, uid: string) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    try {
      return reduceOpenVote(current, uid);
    } catch (error) {
      failure = error instanceof Error ? error.message : 'OPEN 처리에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || 'OPEN 요청이 취소되었습니다.');
  }
}

export async function handleTurnTimeout(room: Room) {
  const turnUid = room.game?.currentTurnUid;

  if (!turnUid || !room.game?.turnEndsAt || Date.now() < room.game.turnEndsAt) {
    return;
  }

  await submitBetAction(room.id, turnUid, 'fold');
}

export async function settleRoomShowdown(room: Room, cards: Record<string, Card>) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${room.id}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    try {
      return settleShowdown(current, cards);
    } catch (error) {
      failure = error instanceof Error ? error.message : '쇼다운 정산에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || '쇼다운 정산이 취소되었습니다.');
  }
}

export async function nextRound(roomId: string) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    try {
      return resetRoomForNextRound(current);
    } catch (error) {
      failure = error instanceof Error ? error.message : '다음 라운드 준비에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || '다음 라운드 준비가 취소되었습니다.');
  }

  await remove(ref(database, `roomCards/${roomId}`)).catch(() => undefined);
}

export async function resetCreditsInRoom(roomId: string) {
  let failure = '';

  const result = await runTransaction(ref(database, `rooms/${roomId}`), (current: Room | null) => {
    if (!current) {
      failure = '방을 찾을 수 없습니다.';
      return;
    }

    try {
      return resetTableCredits(current);
    } catch (error) {
      failure = error instanceof Error ? error.message : '크레딧 초기화에 실패했습니다.';
      return;
    }
  });

  if (failure || !result.committed) {
    throw new Error(failure || '크레딧 초기화가 취소되었습니다.');
  }

  await remove(ref(database, `roomCards/${roomId}`)).catch(() => undefined);
}

export async function sendChatMessage(roomId: string, profile: UserProfile, message: string) {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    return;
  }

  const messageRef = push(ref(database, `rooms/${roomId}/chat`));
  const chatMessage: ChatMessage = {
    id: messageRef.key!,
    uid: profile.uid,
    nickname: profile.nickname,
    message: cleanMessage.slice(0, 300),
    createdAt: Date.now()
  };

  await set(messageRef, chatMessage);
  await update(ref(database, `rooms/${roomId}`), {
    updatedAt: Date.now()
  });
}

export async function syncOwnProfileFromRoom(room: Room, profile: UserProfile) {
  const player = room.players?.[profile.uid];
  const settlementId = room.game?.settlementId;

  if (!player || !settlementId) {
    return;
  }

  const won = Boolean(room.game?.winnerUids?.includes(profile.uid));

  await update(ref(database, `users/${profile.uid}`), {
    credits: Math.max(0, player.creditsAtTable),
    wins: profile.wins + (won ? 1 : 0),
    losses: profile.losses + (won ? 0 : 1),
    gamesPlayed: profile.gamesPlayed + 1,
    lastSeen: Date.now()
  });
}

export async function findRecentRooms() {
  const roomsQuery = query(ref(database, 'rooms'), orderByChild('updatedAt'), limitToLast(30));
  const snapshot = await get(roomsQuery);
  return (snapshot.val() ?? {}) as Record<string, Room>;
}
