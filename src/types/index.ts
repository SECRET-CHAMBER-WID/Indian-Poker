export type Role = 'player' | 'master';
export type RoomStatus = 'waiting' | 'playing' | 'showdown' | 'ended';
export type GamePhase = 'idle' | 'dealing' | 'betting' | 'showdown' | 'ended';
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'allIn' | 'out' | 'spectator';
export type BetAction = 'call' | 'raise' | 'fold';
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface UserProfile {
  uid: string;
  nickname: string;
  role: Role;
  credits: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  online: boolean;
  currentRoom?: string | null;
  createdAt: number;
  lastSeen: number;
}

export interface RoomPlayer {
  uid: string;
  nickname: string;
  seat: number;
  ready: boolean;
  joinedAt: number;
  connected: boolean;
  status: PlayerStatus;
  creditsAtTable: number;
  roundBet: number;
  totalBet: number;
}

export interface RoomSpectator {
  uid: string;
  nickname: string;
  joinedAt: number;
}

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
  label: string;
}

export interface GameState {
  phase: GamePhase;
  pot: number;
  currentBet: number;
  minRaise: number;
  currentTurnUid?: string | null;
  turnOrder: string[];
  turnStartedAt?: number;
  turnEndsAt?: number;
  actionsThisRound: Record<string, boolean>;
  winnerUids?: string[];
  settlementId?: string;
  showdownMessage?: string;
  revealedCards?: Record<string, Card>;
  startedAt?: number;
  endedAt?: number;
}

export interface GameLog {
  id: string;
  createdAt: number;
  message: string;
  actorUid?: string;
}

export interface ChatMessage {
  id: string;
  uid: string;
  nickname: string;
  message: string;
  createdAt: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  createdBy: string;
  createdByName: string;
  maxPlayers: number;
  ante: number;
  minRaise: number;
  turnSeconds: number;
  round: number;
  players?: Record<string, RoomPlayer>;
  spectators?: Record<string, RoomSpectator>;
  game?: GameState;
  logs?: Record<string, GameLog>;
  chat?: Record<string, ChatMessage>;
  createdAt: number;
  updatedAt: number;
}

export interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}
