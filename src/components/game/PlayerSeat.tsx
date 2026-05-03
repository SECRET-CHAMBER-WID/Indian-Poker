import { EyeOff, Wifi, WifiOff } from 'lucide-react';
import { isRedSuit, suitSymbol } from '../../lib/cards';
import type { Card, GamePhase, PlayerStatus, RoomPlayer } from '../../types';
import { Badge } from '../neumorphic/Badge';

interface PlayerSeatProps {
  player: RoomPlayer;
  card?: Card;
  isOwn: boolean;
  phase?: GamePhase;
  isTurn: boolean;
  isWinner: boolean;
  isLiveGame: boolean;
}

const statusLabels: Record<PlayerStatus, string> = {
  waiting: '대기',
  active: '진행',
  folded: '드랍',
  allIn: '올인',
  out: '제외',
  spectator: '대기'
};

function PlayingCard({ card, hidden, isOwn }: { card?: Card; hidden: boolean; isOwn: boolean }) {
  const red = card && isRedSuit(card.suit);
  const suit = card ? suitSymbol(card.suit) : '';
  const colorClass = red ? 'text-coral' : 'text-ink';

  if (hidden || !card) {
    return (
      <div className="card-slide-in relative aspect-[3/4] h-32 overflow-hidden rounded-[18px] border border-white bg-gradient-to-br from-[#f7fafc] to-[#dfe7ef] p-2 shadow-[0_10px_20px_rgba(36,49,66,0.15)] sm:h-36">
        <div className="grid h-full place-items-center rounded-[14px] border-2 border-dashed border-mint/35 bg-base text-muted shadow-neu-inset">
          <div className="text-center">
            <EyeOff className="mx-auto mb-2" size={24} />
            <span className="text-[11px] font-black">{isOwn ? '내 카드' : '대기'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-slide-in relative aspect-[3/4] h-32 rounded-[18px] border border-white bg-white p-2 shadow-[0_12px_22px_rgba(36,49,66,0.18)] sm:h-36">
      <div className={`absolute left-2 top-2 text-center text-sm font-black leading-none ${colorClass}`}>
        <span className="block">{card.rank}</span>
        <span className="block text-base">{suit}</span>
      </div>
      <div className={`grid h-full place-items-center text-center ${colorClass}`}>
        <div>
          <span className="block text-4xl font-black sm:text-5xl">{suit}</span>
          <span className="mt-1 block text-2xl font-black sm:text-3xl">{card.rank}</span>
        </div>
      </div>
      <div className={`absolute bottom-2 right-2 rotate-180 text-center text-sm font-black leading-none ${colorClass}`}>
        <span className="block">{card.rank}</span>
        <span className="block text-base">{suit}</span>
      </div>
    </div>
  );
}

export function PlayerSeat({ player, card, isOwn, phase, isTurn, isWinner, isLiveGame }: PlayerSeatProps) {
  const revealed = phase === 'showdown' || phase === 'ended';
  const showCard = Boolean(card) && (!isOwn || revealed);
  const muted = player.status === 'folded' || player.status === 'out';
  const wifiClass = isLiveGame && player.connected ? 'animate-pulse text-mint' : player.connected ? 'text-muted' : 'text-coral';

  return (
    <article
      className={`rounded-[20px] bg-base p-3 shadow-neu-sm transition sm:rounded-[28px] sm:p-4 ${
        muted ? 'opacity-60' : ''
      } ${isTurn ? 'ring-2 ring-mint' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-ink sm:text-base">{player.nickname}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
            {player.connected ? <Wifi className={wifiClass} size={13} /> : <WifiOff className={wifiClass} size={13} />}
            테이블 {player.seat}
          </p>
        </div>
        <Badge tone={isWinner ? 'mint' : player.ready ? 'plum' : player.status === 'folded' ? 'coral' : 'muted'}>
          {isWinner ? '승리' : player.ready ? '준비' : statusLabels[player.status]}
        </Badge>
      </div>

      <div className="mb-4 flex justify-center">
        <PlayingCard card={card} hidden={!showCard} isOwn={isOwn} />
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] sm:gap-2 sm:text-xs">
        <div className="rounded-2xl bg-base p-2 shadow-neu-inset">
          <strong className="block text-sm text-ink">{player.creditsAtTable}</strong>
          <span className="text-muted">보유</span>
        </div>
        <div className="rounded-2xl bg-base p-2 shadow-neu-inset">
          <strong className="block text-sm text-ink">{player.roundBet}</strong>
          <span className="text-muted">베팅</span>
        </div>
        <div className="rounded-2xl bg-base p-2 shadow-neu-inset">
          <strong className="block text-sm text-ink">{player.totalBet}</strong>
          <span className="text-muted">누적</span>
        </div>
      </div>
    </article>
  );
}
