import { DEFAULT_CREDITS } from './authService';
import type { BetAction, Card, ChatMessage, GameLog, Room, RoomPlayer } from '../types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

function cloneRoom(room: Room): Room {
  return JSON.parse(JSON.stringify(room)) as Room;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeLog(message: string, actorUid?: string): GameLog {
  const log: GameLog = {
    id: makeId(),
    createdAt: Date.now(),
    message
  };

  if (actorUid) {
    log.actorUid = actorUid;
  }

  return log;
}

function addLog(room: Room, message: string, actorUid?: string) {
  const log = makeLog(message, actorUid);
  room.logs = {
    ...(room.logs ?? {}),
    [log.id]: log
  };
}

function addSystemChat(room: Room, message: string) {
  const chat: ChatMessage = {
    id: makeId(),
    uid: 'system',
    nickname: '게임',
    message,
    createdAt: Date.now()
  };

  room.chat = {
    ...(room.chat ?? {}),
    [chat.id]: chat
  };
}

export function getPlayers(room?: Room | null) {
  return Object.values(room?.players ?? {}).sort((a, b) => a.seat - b.seat);
}

export function getSeatedPlayerIds(room: Room) {
  return getPlayers(room)
    .filter((player) => player.status !== 'spectator')
    .map((player) => player.uid);
}

export function getLivePlayers(room: Room) {
  return getPlayers(room).filter((player) => player.status === 'active' || player.status === 'allIn');
}

export function getActablePlayers(room: Room) {
  return getPlayers(room).filter((player) => player.status === 'active' && player.creditsAtTable > 0);
}

export function canStart(room?: Room | null) {
  const players = getPlayers(room);

  if (!room) {
    return { ok: false, reason: '방 정보를 불러오는 중입니다.' };
  }

  if (room.status !== 'waiting') {
    return { ok: false, reason: '대기 중인 방에서만 시작할 수 있습니다.' };
  }

  if (players.length < MIN_PLAYERS) {
    return { ok: false, reason: '최소 2명이 필요합니다.' };
  }

  if (players.length > MAX_PLAYERS) {
    return { ok: false, reason: '최대 8명까지 플레이할 수 있습니다.' };
  }

  if (players.some((player) => !player.ready)) {
    return { ok: false, reason: '모든 참가자의 시작 동의가 필요합니다.' };
  }

  if (players.filter((player) => player.creditsAtTable > 0).length < MIN_PLAYERS) {
    return { ok: false, reason: '크레딧이 남은 플레이어가 2명 이상이어야 합니다.' };
  }

  return { ok: true, reason: '게임을 시작할 수 있습니다.' };
}

export function prepareRound(room: Room, starterUid: string): Room {
  const startState = canStart(room);

  if (!startState.ok) {
    throw new Error(startState.reason);
  }

  const next = cloneRoom(room);
  const now = Date.now();
  const participatingPlayers = getPlayers(next).filter((player) => player.creditsAtTable > 0);
  const turnOrder = participatingPlayers.map((player) => player.uid);
  let pot = 0;

  next.status = 'playing';
  next.round += 1;
  next.updatedAt = now;
  next.players = { ...(next.players ?? {}) };

  for (const player of getPlayers(next)) {
    const nextPlayer = { ...player };
    nextPlayer.ready = false;
    nextPlayer.roundBet = 0;
    nextPlayer.totalBet = 0;

    if (turnOrder.includes(player.uid)) {
      const basicBet = Math.min(next.ante, nextPlayer.creditsAtTable);
      nextPlayer.creditsAtTable -= basicBet;
      nextPlayer.roundBet = basicBet;
      nextPlayer.totalBet = basicBet;
      nextPlayer.status = nextPlayer.creditsAtTable === 0 ? 'allIn' : 'active';
      pot += basicBet;
    } else {
      nextPlayer.status = 'out';
    }

    next.players[nextPlayer.uid] = nextPlayer;
  }

  const firstTurnUid = getActablePlayers(next)[0]?.uid ?? null;

  next.game = {
    phase: 'dealing',
    pot,
    currentBet: next.ante,
    minRaise: next.minRaise,
    currentTurnUid: firstTurnUid,
    turnOrder,
    turnStartedAt: now,
    actionsThisRound: {},
    openVotes: {},
    startedAt: now
  };

  addLog(next, `${next.round}라운드를 시작했습니다.`, starterUid);
  return next;
}

function getNextTurnUid(room: Room, fromUid: string) {
  const order = room.game?.turnOrder ?? [];
  const actable = new Set(getActablePlayers(room).map((player) => player.uid));

  if (actable.size === 0) {
    return null;
  }

  const startIndex = Math.max(0, order.indexOf(fromUid));

  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(startIndex + offset) % order.length];

    if (actable.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isBettingSettled(room: Room) {
  const game = room.game;

  if (!game) {
    return false;
  }

  const livePlayers = getLivePlayers(room);
  const actablePlayers = getActablePlayers(room);

  if (livePlayers.length <= 1) {
    return true;
  }

  if (actablePlayers.length === 0) {
    return true;
  }

  const actionsThisRound = game.actionsThisRound ?? {};

  return actablePlayers.every((player) => player.roundBet >= game.currentBet && actionsThisRound[player.uid]);
}

function moveTurn(room: Room, actorUid: string) {
  if (!room.game) {
    return;
  }

  room.game.currentTurnUid = getNextTurnUid(room, actorUid);
  room.game.turnStartedAt = Date.now();
}

function awardSingleRemainingPlayer(room: Room) {
  const winner = getLivePlayers(room)[0];
  const now = Date.now();

  if (!winner || !room.game || !room.players) {
    return;
  }

  const message = `${winner.nickname}님이 마지막까지 남아 ${room.game.pot} 크레딧을 가져갑니다.`;

  room.players[winner.uid] = {
    ...winner,
    creditsAtTable: winner.creditsAtTable + room.game.pot
  };

  room.status = 'showdown';
  room.updatedAt = now;
  room.game = {
    ...room.game,
    phase: 'showdown',
    currentTurnUid: null,
    winnerUids: [winner.uid],
    settlementId: makeId(),
    showdownMessage: message,
    endedAt: now
  };
  addLog(room, message, winner.uid);
  addSystemChat(room, message);
}

export function reduceBettingAction(room: Room, actorUid: string, action: BetAction, raiseTo?: number): Room {
  const next = cloneRoom(room);
  const game = next.game;
  const actor = next.players?.[actorUid];

  if (!game || game.phase !== 'betting') {
    throw new Error('지금은 베팅할 수 없습니다.');
  }

  game.actionsThisRound = game.actionsThisRound ?? {};
  game.openVotes = game.openVotes ?? {};
  game.turnOrder = game.turnOrder ?? getLivePlayers(next).map((player) => player.uid);

  if (!actor || actor.status !== 'active') {
    throw new Error('베팅 가능한 플레이어가 아닙니다.');
  }

  if (game.currentTurnUid !== actorUid) {
    throw new Error('현재 차례가 아닙니다.');
  }

  if (!next.players) {
    throw new Error('플레이어 정보를 찾을 수 없습니다.');
  }

  const updatedActor: RoomPlayer = { ...actor };

  if (action === 'fold') {
    updatedActor.status = 'folded';
    game.actionsThisRound[actorUid] = true;
    next.players[actorUid] = updatedActor;
    addLog(next, `${actor.nickname}님이 드랍했습니다.`, actorUid);

    if (getLivePlayers(next).length === 1) {
      awardSingleRemainingPlayer(next);
      return next;
    }
  }

  if (action === 'call') {
    const required = Math.max(0, game.currentBet - updatedActor.roundBet);
    const payment = Math.min(required, updatedActor.creditsAtTable);
    updatedActor.creditsAtTable -= payment;
    updatedActor.roundBet += payment;
    updatedActor.totalBet += payment;
    updatedActor.status = updatedActor.creditsAtTable === 0 ? 'allIn' : 'active';
    game.pot += payment;
    game.actionsThisRound[actorUid] = true;
    next.players[actorUid] = updatedActor;
    addLog(next, payment > 0 ? `${actor.nickname}님이 ${payment} 크레딧을 콜했습니다.` : `${actor.nickname}님이 콜했습니다.`, actorUid);
  }

  if (action === 'raise') {
    const targetBet = Math.floor(Number(raiseTo ?? 0));
    const minTarget = game.currentBet + game.minRaise;
    const maxTarget = updatedActor.roundBet + updatedActor.creditsAtTable;

    if (targetBet < minTarget) {
      throw new Error(`최소 ${minTarget}까지 레이스해야 합니다.`);
    }

    if (targetBet > maxTarget) {
      throw new Error('보유 크레딧보다 많이 레이스할 수 없습니다.');
    }

    const payment = targetBet - updatedActor.roundBet;
    updatedActor.creditsAtTable -= payment;
    updatedActor.roundBet = targetBet;
    updatedActor.totalBet += payment;
    updatedActor.status = updatedActor.creditsAtTable === 0 ? 'allIn' : 'active';
    game.pot += payment;
    game.currentBet = targetBet;
    game.actionsThisRound = { [actorUid]: true };
    game.openVotes = {};
    next.players[actorUid] = updatedActor;
    addLog(next, `${actor.nickname}님이 ${targetBet}까지 레이스했습니다.`, actorUid);
  }

  if (isBettingSettled(next)) {
    next.status = 'showdown';
    next.updatedAt = Date.now();
    next.game = {
      ...game,
      phase: 'showdown',
      currentTurnUid: null,
      endedAt: Date.now()
    };
    addLog(next, '베팅이 끝나 카드를 공개합니다.');
    return next;
  }

  moveTurn(next, actorUid);
  next.updatedAt = Date.now();
  return next;
}

export function reduceOpenVote(room: Room, actorUid: string): Room {
  const next = cloneRoom(room);
  const game = next.game;
  const actor = next.players?.[actorUid];

  if (!game || game.phase !== 'betting') {
    throw new Error('지금은 OPEN을 선택할 수 없습니다.');
  }

  if (!actor || (actor.status !== 'active' && actor.status !== 'allIn')) {
    throw new Error('게임에 남아 있는 플레이어만 OPEN을 선택할 수 있습니다.');
  }

  const livePlayers = getLivePlayers(next);
  game.openVotes = {
    ...(game.openVotes ?? {}),
    [actorUid]: true
  };

  addLog(next, `${actor.nickname}님이 OPEN에 동의했습니다.`, actorUid);

  if (livePlayers.length >= MIN_PLAYERS && livePlayers.every((player) => game.openVotes?.[player.uid])) {
    const now = Date.now();
    next.status = 'showdown';
    next.updatedAt = now;
    next.game = {
      ...game,
      phase: 'showdown',
      currentTurnUid: null,
      endedAt: now
    };
    addLog(next, '모든 플레이어가 OPEN에 동의해 카드를 공개합니다.');
  } else {
    next.updatedAt = Date.now();
  }

  return next;
}

export function settleShowdown(room: Room, cards: Record<string, Card>): Room {
  const next = cloneRoom(room);
  const game = next.game;

  if (!game || game.phase !== 'showdown' || game.settlementId) {
    return next;
  }

  const livePlayers = getLivePlayers(next);

  if (livePlayers.length === 0 || !next.players) {
    const message = '남은 플레이어가 없어 게임을 종료했습니다.';
    next.status = 'ended';
    next.updatedAt = Date.now();
    next.game = {
      ...game,
      phase: 'ended',
      currentTurnUid: null,
      showdownMessage: message,
      settlementId: makeId(),
      endedAt: Date.now()
    };
    addSystemChat(next, message);
    return next;
  }

  const scoredPlayers = livePlayers
    .map((player) => ({ player, card: cards[player.uid] }))
    .filter((entry): entry is { player: RoomPlayer; card: Card } => Boolean(entry.card));

  if (scoredPlayers.length === 0) {
    return next;
  }

  const highest = Math.max(...scoredPlayers.map((entry) => entry.card.value));
  const winners = scoredPlayers.filter((entry) => entry.card.value === highest).map((entry) => entry.player);
  const share = Math.floor(game.pot / winners.length);
  let remainder = game.pot % winners.length;
  const playersById = next.players;

  for (const winner of winners) {
    const bonus = share + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    playersById[winner.uid] = {
      ...playersById[winner.uid],
      creditsAtTable: playersById[winner.uid].creditsAtTable + bonus
    };
  }

  const winnerNames = winners.map((winner) => winner.nickname).join(', ');
  const message =
    winners.length === 1
      ? `${winnerNames}님이 가장 높은 카드로 ${game.pot} 크레딧을 가져갑니다.`
      : `${winnerNames}님이 같은 카드 점수로 ${game.pot} 크레딧을 나눕니다.`;
  const remainingPlayers = getPlayers(next).filter((player) => playersById[player.uid]?.creditsAtTable > 0);
  const isGameOver = remainingPlayers.length < MIN_PLAYERS;
  const showdownMessage = isGameOver ? `${message} 게임 종료 조건에 도달했습니다.` : message;

  next.status = isGameOver ? 'ended' : 'showdown';
  next.updatedAt = Date.now();
  next.game = {
    ...game,
    phase: isGameOver ? 'ended' : 'showdown',
    currentTurnUid: null,
    winnerUids: winners.map((winner) => winner.uid),
    settlementId: makeId(),
    showdownMessage,
    revealedCards: cards,
    endedAt: Date.now()
  };

  addLog(next, showdownMessage);
  addSystemChat(next, showdownMessage);
  return next;
}

export function resetRoomForNextRound(room: Room): Room {
  const next = cloneRoom(room);
  const remainingPlayers = getPlayers(next).filter((player) => player.creditsAtTable > 0);

  if (remainingPlayers.length < MIN_PLAYERS) {
    throw new Error('크레딧이 남은 플레이어가 2명 미만이라 다음 라운드를 시작할 수 없습니다.');
  }

  if (!next.players) {
    return next;
  }

  for (const player of getPlayers(next)) {
    next.players[player.uid] = {
      ...player,
      ready: false,
      roundBet: 0,
      totalBet: 0,
      status: player.creditsAtTable > 0 ? 'waiting' : 'out'
    };
  }

  next.status = 'waiting';
  next.updatedAt = Date.now();
  next.game = {
    phase: 'idle',
    pot: 0,
    currentBet: 0,
    minRaise: next.minRaise,
    currentTurnUid: null,
    turnOrder: [],
    actionsThisRound: {},
    openVotes: {}
  };
  addLog(next, '다음 라운드 준비 상태로 전환했습니다.');
  return next;
}

export function resetTableCredits(room: Room): Room {
  const next = cloneRoom(room);

  if (!next.players) {
    return next;
  }

  for (const player of getPlayers(next)) {
    next.players[player.uid] = {
      ...player,
      creditsAtTable: DEFAULT_CREDITS,
      ready: false,
      roundBet: 0,
      totalBet: 0,
      status: 'waiting'
    };
  }

  next.status = 'waiting';
  next.updatedAt = Date.now();
  next.round = 0;
  next.game = {
    phase: 'idle',
    pot: 0,
    currentBet: 0,
    minRaise: next.minRaise,
    currentTurnUid: null,
    turnOrder: [],
    actionsThisRound: {},
    openVotes: {}
  };
  addLog(next, '테이블 크레딧을 초기화했습니다.');
  return next;
}
