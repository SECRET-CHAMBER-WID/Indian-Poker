import { ArrowLeft, Coins, Copy, Play, RotateCcw, ShieldCheck, Wifi } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../hooks/useRoom';
import { canStart, getActablePlayers, getLivePlayers, getPlayers } from '../../lib/gameEngine';
import {
  leaveRoom,
  nextRound,
  resetCreditsInRoom,
  settleRoomShowdown,
  startRoomGame,
  submitBetAction,
  submitOpenVote,
  syncOwnProfileFromRoom,
  toggleReady
} from '../../lib/roomService';
import type { Card, ToastState } from '../../types';
import { Badge } from '../neumorphic/Badge';
import { BrandMark } from '../neumorphic/BrandMark';
import { Button } from '../neumorphic/Button';
import { MobileBottomNav } from '../neumorphic/MobileBottomNav';
import { Panel } from '../neumorphic/Panel';
import { BettingControls } from './BettingControls';
import { ChatPanel } from './ChatPanel';
import { PlayerSeat } from './PlayerSeat';

interface GameRoomProps {
  roomId: string;
  onToast: (toast: ToastState) => void;
  onExit: () => void;
}

const statusLabel = {
  waiting: '대기',
  playing: '게임 중',
  showdown: '공개',
  ended: '종료'
};

export function GameRoom({ roomId, onToast, onExit }: GameRoomProps) {
  const { profile } = useAuth();
  const { value: room, loading, error } = useRoom(roomId);
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [busy, setBusy] = useState(false);

  const players = useMemo(() => getPlayers(room), [room]);
  const livePlayers = useMemo(() => (room ? getLivePlayers(room) : []), [room]);
  const myPlayer = profile && room?.players ? room.players[profile.uid] : undefined;
  const startState = useMemo(() => canStart(room), [room]);
  const phase = room?.game?.phase ?? 'idle';
  const isMyTurn = Boolean(profile && room?.game?.currentTurnUid === profile.uid);
  const isLiveGame = phase === 'betting' || room?.status === 'playing';
  const openVotes = room?.game?.openVotes ?? {};
  const openCount = livePlayers.filter((player) => openVotes[player.uid]).length;

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
    if (!room || room.game?.phase !== 'showdown' || room.game.settlementId) {
      return;
    }

    const showdownPlayers = getLivePlayers(room);
    const hasAllCards = showdownPlayers.every((player) => cards[player.uid]);

    if (showdownPlayers.length > 1 && hasAllCards) {
      settleRoomShowdown(room, cards).catch((settleError) => {
        onToast({
          type: 'error',
          message: settleError instanceof Error ? settleError.message : '공개 정산에 실패했습니다.'
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
    return (
      <main className="min-h-screen bg-base p-6 text-center font-bold text-coral">
        방을 불러오지 못했습니다.
        <div className="mt-4">
          <Button icon={<ArrowLeft size={18} />} onClick={onExit}>
            로비
          </Button>
        </div>
      </main>
    );
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

  const leaveAndExit = async () => {
    setBusy(true);

    try {
      await leaveRoom(room.id, profile);
      onExit();
    } catch (leaveError) {
      onToast({ type: 'error', message: leaveError instanceof Error ? leaveError.message : '로비로 나가지 못했습니다.' });
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
    .slice(0, 6);

  const openDisabled =
    busy || !myPlayer || phase !== 'betting' || (myPlayer.status !== 'active' && myPlayer.status !== 'allIn');

  return (
    <main className="min-h-screen bg-base px-3 pb-28 pt-3 text-ink sm:px-4 sm:py-5 lg:pb-5">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        <header className="sticky top-0 z-30 flex flex-col gap-4 rounded-[22px] bg-base/95 p-4 shadow-neu backdrop-blur md:flex-row md:items-center md:justify-between md:rounded-[28px] lg:static">
          <div>
            <div className="mb-3">
              <BrandMark />
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">{room.name}</h1>
              <Badge tone={room.status === 'waiting' ? 'mint' : room.status === 'playing' ? 'amber' : 'plum'}>{statusLabel[room.status]}</Badge>
              {room.isPrivate ? <Badge tone="plum">비공개</Badge> : null}
              {isLiveGame ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint/15 text-mint shadow-neu-inset">
                  <Wifi className="animate-pulse" size={17} />
                </span>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-muted">
              코드 {room.code} · 라운드 {room.round} · 기본 베팅 {room.ante} · 최소 레이스 {room.minRaise}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            <Button className="w-full md:w-auto" icon={<Copy size={18} />} onClick={copyCode}>
              코드 복사
            </Button>
            <Button className="w-full md:w-auto" disabled={busy} icon={<ArrowLeft size={18} />} onClick={leaveAndExit}>
              로비
            </Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Panel className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
              <div className="rounded-2xl bg-base p-3 text-center shadow-neu-inset sm:rounded-3xl sm:p-4">
                <Coins className="mx-auto mb-2 text-amber" size={24} />
                <strong className="block text-xl text-ink sm:text-2xl">{room.game?.pot ?? 0}</strong>
                <span className="text-sm font-bold text-muted">판돈</span>
              </div>
              <div className="rounded-2xl bg-base p-3 text-center shadow-neu-inset sm:rounded-3xl sm:p-4">
                <ShieldCheck className="mx-auto mb-2 text-mint" size={24} />
                <strong className="block text-xl text-ink sm:text-2xl">{room.game?.currentBet ?? 0}</strong>
                <span className="text-sm font-bold text-muted">현재 베팅</span>
              </div>
              <div className="rounded-2xl bg-base p-3 text-center shadow-neu-inset sm:rounded-3xl sm:p-4">
                <Wifi className={`mx-auto mb-2 text-plum ${isLiveGame ? 'animate-pulse' : ''}`} size={24} />
                <strong className="block text-xl text-ink sm:text-2xl">
                  {phase === 'betting' ? `${openCount}/${livePlayers.length}` : '-'}
                </strong>
                <span className="text-sm font-bold text-muted">OPEN</span>
              </div>
              <div className="rounded-2xl bg-base p-3 text-center shadow-neu-inset sm:rounded-3xl sm:p-4">
                <strong className="block truncate text-xl text-ink sm:text-2xl">
                  {room.game?.currentTurnUid ? room.players?.[room.game.currentTurnUid]?.nickname ?? '-' : '-'}
                </strong>
                <span className="text-sm font-bold text-muted">현재 차례</span>
              </div>
            </Panel>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {players.map((player) => (
                <PlayerSeat
                  card={cards[player.uid] ?? room.game?.revealedCards?.[player.uid]}
                  isLiveGame={isLiveGame}
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
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {myPlayer ? (
                      <Button
                        data-testid="toggle-ready"
                        disabled={busy}
                        onClick={() => run(() => toggleReady(room.id, profile.uid, !myPlayer.ready))}
                        variant={myPlayer.ready ? 'primary' : 'soft'}
                      >
                        {myPlayer.ready ? '동의 완료' : '준비 완료'}
                      </Button>
                    ) : null}
                    <Button
                      data-testid="start-game"
                      disabled={busy || !startState.ok || !myPlayer}
                      icon={<Play size={18} />}
                      onClick={() => run(() => startRoomGame(room, profile.uid), '게임을 시작했습니다.')}
                      variant="primary"
                    >
                      게임 시작
                    </Button>
                    <Button
                      className="col-span-2 sm:col-span-1"
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
                disabled={!isMyTurn || !myPlayer || busy}
                liveCount={livePlayers.length}
                onCall={() => run(() => submitBetAction(room.id, profile.uid, 'call'))}
                onFold={() => run(() => submitBetAction(room.id, profile.uid, 'fold'))}
                onOpen={() => run(() => submitOpenVote(room.id, profile.uid))}
                onRaise={(raiseTo) => run(() => submitBetAction(room.id, profile.uid, 'raise', raiseTo))}
                openCount={openCount}
                openDisabled={openDisabled}
                openVoted={Boolean(openVotes[profile.uid])}
                player={myPlayer}
                room={room}
              />
            ) : null}

            {phase === 'showdown' || phase === 'ended' ? (
              <Panel className="space-y-4 p-4">
                <div>
                  <h2 className="text-lg font-black">{phase === 'ended' ? '게임 종료' : '다음 진행'}</h2>
                  <p className="mt-1 text-sm font-semibold text-muted">결과는 채팅에 기록되었습니다.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {phase !== 'ended' && myPlayer ? (
                    <Button disabled={busy} icon={<RotateCcw size={18} />} onClick={() => run(() => nextRound(room.id))} variant="primary">
                      다음 판
                    </Button>
                  ) : null}
                  <Button disabled={busy} icon={<ArrowLeft size={18} />} onClick={leaveAndExit}>
                    로비
                  </Button>
                </div>
              </Panel>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div id="game-chat">
              <ChatPanel onToast={onToast} profile={profile} room={room} />
            </div>
            <Panel className="hidden p-4 lg:block">
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
                행동 가능 {getActablePlayers(room).length}명 · 진행 중 {livePlayers.length}명
              </p>
            </Panel>
          </aside>
        </section>
      </div>
      <MobileBottomNav
        active="chat"
        onAlerts={() => onToast({ type: 'info', message: '새 알림이 없습니다.' })}
        onChat={() => document.getElementById('game-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onCreate={() => onToast({ type: 'info', message: '새 방은 로비에서 만들 수 있습니다.' })}
        onLobby={leaveAndExit}
        onProfile={() => onToast({ type: 'info', message: `${profile.nickname} · ${myPlayer?.creditsAtTable ?? profile.credits} 크레딧` })}
      />
    </main>
  );
}
