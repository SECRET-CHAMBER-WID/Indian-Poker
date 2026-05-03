import { ArrowLeft, Coins, Copy, Play, RotateCcw, ShieldCheck, TimerReset } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useRef, useState } from 'react';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import { useRoom } from '../../hooks/useRoom';
import { canStart, getActablePlayers, getLivePlayers, getPlayers } from '../../lib/gameEngine';
import {
  handleTurnTimeout,
  leaveRoom,
  nextRound,
  resetCreditsInRoom,
  settleRoomShowdown,
  startRoomGame,
  submitBetAction,
  syncOwnProfileFromRoom,
  toggleReady
} from '../../lib/roomService';
import type { Card, ToastState } from '../../types';
import { Badge } from '../neumorphic/Badge';
import { BrandMark } from '../neumorphic/BrandMark';
import { Button } from '../neumorphic/Button';
import { Panel } from '../neumorphic/Panel';
import { BettingControls } from './BettingControls';
import { ChatPanel } from './ChatPanel';
import { PlayerSeat } from './PlayerSeat';

interface GameRoomProps {
  roomId: string;
  onToast: (toast: ToastState) => void;
}

export function GameRoom({ roomId, onToast }: GameRoomProps) {
  const { profile } = useAuth();
  const { value: room, loading, error } = useRoom(roomId);
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [busy, setBusy] = useState(false);
  const timer = useCountdown(room?.game?.turnEndsAt);
  const timeoutKeyRef = useRef<string | null>(null);

  const players = useMemo(() => getPlayers(room), [room]);
  const myPlayer = profile && room?.players ? room.players[profile.uid] : undefined;
  const isSpectator = Boolean(profile && room?.spectators?.[profile.uid] && !myPlayer);
  const startState = useMemo(() => canStart(room), [room]);
  const phase = room?.game?.phase ?? 'idle';
  const isMyTurn = Boolean(profile && room?.game?.currentTurnUid === profile.uid);

  useEffect(() => {
    if (!room || !profile) {
      return;
    }

    const visibleIds = players
      .map((player) => player.uid)
      .filter((uid) => uid !== profile.uid || phase === 'showdown' || phase === 'ended');

    setCards({});

    const unsubscribes = visibleIds.map((uid) =>
      onValue(
        ref(database, `roomCards/${room.id}/${uid}`),
        (snapshot) => {
          setCards((current) => {
            const next = { ...current };
            const card = snapshot.val() as Card | null;

            if (card) {
              next[uid] = card;
            } else {
              delete next[uid];
            }

            return next;
          });
        },
        () => undefined
      )
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [phase, players, profile, room]);

  useEffect(() => {
    if (!room || room.game?.phase !== 'betting' || !room.game.turnEndsAt) {
      return;
    }

    const timeoutKey = `${room.id}-${room.game.currentTurnUid}-${room.game.turnEndsAt}`;

    if (Date.now() >= room.game.turnEndsAt && timeoutKeyRef.current !== timeoutKey) {
      timeoutKeyRef.current = timeoutKey;
      handleTurnTimeout(room).catch(() => undefined);
    }
  }, [room, timer]);

  useEffect(() => {
    if (!room || room.game?.phase !== 'showdown' || room.game.settlementId) {
      return;
    }

    const livePlayers = getLivePlayers(room);
    const hasAllCards = livePlayers.every((player) => cards[player.uid]);

    if (livePlayers.length > 1 && hasAllCards) {
      settleRoomShowdown(room, cards).catch((settleError) => {
        onToast({
          type: 'error',
          message: settleError instanceof Error ? settleError.message : '쇼다운 정산에 실패했습니다.'
        });
      });
    }
  }, [cards, onToast, room]);

  useEffect(() => {
    if (!room || !profile || !room.game?.settlementId) {
      return;
    }

    const key = `settled:${room.id}:${room.game.settlementId}:${profile.uid}`;

    if (localStorage.getItem(key)) {
      return;
    }

    localStorage.setItem(key, '1');
    syncOwnProfileFromRoom(room, profile).catch(() => undefined);
  }, [profile, room]);

  if (loading) {
    return <main className="min-h-screen bg-base p-6 text-center font-bold text-muted">방 정보를 불러오는 중입니다.</main>;
  }

  if (error || !room || !profile) {
    return <main className="min-h-screen bg-base p-6 text-center font-bold text-coral">방을 불러오지 못했습니다.</main>;
  }

  const run = async (handler: () => Promise<void>, successMessage?: string) => {
    setBusy(true);

    try {
      await handler();

      if (successMessage) {
        onToast({ type: 'success', message: successMessage });
      }
    } catch (runError) {
      onToast({ type: 'error', message: runError instanceof Error ? runError.message : '요청 처리에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    onToast({ type: 'success', message: '방 코드를 복사했습니다.' });
  };

  const logs = Object.values(room.logs ?? {})
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-base px-4 py-5 text-ink">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-[28px] bg-base p-4 shadow-neu md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3">
              <BrandMark />
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{room.name}</h1>
              <Badge tone={room.status === 'waiting' ? 'mint' : room.status === 'playing' ? 'amber' : 'plum'}>{room.status}</Badge>
              {isSpectator ? <Badge tone="coral">관전</Badge> : null}
            </div>
            <p className="text-sm font-semibold text-muted">
              코드 {room.code} · 라운드 {room.round} · 앤티 {room.ante} · 최소 레이즈 {room.minRaise}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Copy size={18} />} onClick={copyCode}>
              코드 복사
            </Button>
            <Button icon={<ArrowLeft size={18} />} onClick={() => run(() => leaveRoom(room.id, profile))}>
              나가기
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Panel className="grid gap-3 p-4 sm:grid-cols-4">
              <div className="rounded-3xl bg-base p-4 text-center shadow-neu-inset">
                <Coins className="mx-auto mb-2 text-amber" size={24} />
                <strong className="block text-2xl text-ink">{room.game?.pot ?? 0}</strong>
                <span className="text-sm font-bold text-muted">팟</span>
              </div>
              <div className="rounded-3xl bg-base p-4 text-center shadow-neu-inset">
                <ShieldCheck className="mx-auto mb-2 text-mint" size={24} />
                <strong className="block text-2xl text-ink">{room.game?.currentBet ?? 0}</strong>
                <span className="text-sm font-bold text-muted">현재 베팅</span>
              </div>
              <div className="rounded-3xl bg-base p-4 text-center shadow-neu-inset">
                <TimerReset className="mx-auto mb-2 text-plum" size={24} />
                <strong className="block text-2xl text-ink">{phase === 'betting' ? timer : '-'}</strong>
                <span className="text-sm font-bold text-muted">남은 시간</span>
              </div>
              <div className="rounded-3xl bg-base p-4 text-center shadow-neu-inset">
                <strong className="block truncate text-2xl text-ink">
                  {room.game?.currentTurnUid ? room.players?.[room.game.currentTurnUid]?.nickname ?? '-' : '-'}
                </strong>
                <span className="text-sm font-bold text-muted">현재 턴</span>
              </div>
            </Panel>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {players.map((player) => (
                <PlayerSeat
                  card={cards[player.uid] ?? room.game?.revealedCards?.[player.uid]}
                  isOwn={player.uid === profile.uid}
                  isTurn={room.game?.currentTurnUid === player.uid}
                  isWinner={Boolean(room.game?.winnerUids?.includes(player.uid))}
                  key={player.uid}
                  phase={phase}
                  player={player}
                />
              ))}
            </section>

            {room.status === 'waiting' ? (
              <Panel className="space-y-4 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black">시작 동의</h2>
                    <p className="mt-1 text-sm font-semibold text-muted">{startState.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {myPlayer ? (
                      <Button
                        disabled={busy}
                        onClick={() => run(() => toggleReady(room.id, profile.uid, !myPlayer.ready))}
                        variant={myPlayer.ready ? 'primary' : 'soft'}
                      >
                        {myPlayer.ready ? '동의 완료' : '준비 완료'}
                      </Button>
                    ) : null}
                    <Button
                      disabled={busy || !startState.ok || !myPlayer}
                      icon={<Play size={18} />}
                      onClick={() => run(() => startRoomGame(room, profile.uid), '게임을 시작했습니다.')}
                      variant="primary"
                    >
                      게임 시작
                    </Button>
                    <Button
                      disabled={busy || !myPlayer}
                      icon={<RotateCcw size={18} />}
                      onClick={() => run(() => resetCreditsInRoom(room.id), '방 크레딧을 초기화했습니다.')}
                    >
                      크레딧 리셋
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : null}

            {phase === 'betting' ? (
              <BettingControls
                disabled={!isMyTurn || !myPlayer || busy || isSpectator}
                onCall={() => submitBetAction(room.id, profile.uid, 'call')}
                onFold={() => submitBetAction(room.id, profile.uid, 'fold')}
                onRaise={(raiseTo) => submitBetAction(room.id, profile.uid, 'raise', raiseTo)}
                player={myPlayer}
                room={room}
              />
            ) : null}

            {phase === 'showdown' || phase === 'ended' ? (
              <Panel className="space-y-4 p-4">
                <h2 className="text-lg font-black">라운드 결과</h2>
                <p className="rounded-3xl bg-base p-4 text-sm font-bold leading-6 text-muted shadow-neu-inset">
                  {room.game?.showdownMessage ?? '결과를 정산하는 중입니다.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {phase !== 'ended' && myPlayer ? (
                    <Button disabled={busy} icon={<RotateCcw size={18} />} onClick={() => run(() => nextRound(room.id))} variant="primary">
                      다음 라운드 준비
                    </Button>
                  ) : null}
                  <Button icon={<ArrowLeft size={18} />} onClick={() => run(() => leaveRoom(room.id, profile))}>
                    로비로 나가기
                  </Button>
                </div>
              </Panel>
            ) : null}
          </div>

          <aside className="space-y-5">
            <ChatPanel onToast={onToast} profile={profile} room={room} />
            <Panel className="p-4">
              <h2 className="mb-3 text-lg font-black text-ink">게임 로그</h2>
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-sm font-semibold text-muted">로그가 없습니다.</p>
                ) : (
                  logs.map((log) => (
                    <p key={log.id} className="rounded-2xl bg-base p-3 text-sm font-semibold text-muted shadow-neu-inset">
                      {log.message}
                    </p>
                  ))
                )}
              </div>
              <p className="mt-4 text-xs font-semibold text-muted">
                행동 가능 플레이어 {getActablePlayers(room).length}명 · 생존 {getLivePlayers(room).length}명
              </p>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}
