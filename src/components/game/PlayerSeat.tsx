import { EyeOff, Wifi, WifiOff } from 'lucide-react';
import { isRedSuit, suitSymbol } from '../../lib/cards';
import type { Card, GamePhase, RoomPlayer } from '../../types';
import { Badge } from '../neumorphic/Badge';

interface PlayerSeatProps {
  player: RoomPlayer;
  card?: Card;
  isOwn: boolean;
  phase?: GamePhase;
  isTurn: boolean;
  isWinner: boolean;
}

export function PlayerSeat({ player, card, isOwn, phase, isTurn, isWinner }: PlayerSeatProps) {
  const revealed = phase === 'showdown' || phase === 'ended';
  const showCard = Boolean(card) && (!isOwn || revealed);
  const cardTone = card && isRedSuit(card.suit) ? 'text-coral' : 'text-ink';

  return (
    <article
      className={`rounded-[20px] bg-base p-3 shadow-neu-sm transition sm:rounded-[28px] sm:p-4 ${
        player.status === 'folded' || player.status === 'out' ? 'opacity-60' : ''
      } ${isTurn ? 'ring-2 ring-mint' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-ink sm:text-base">{player.nickname}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
            {player.connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            좌석 {player.seat}
          </p>
        </div>
        <Badge tone={isWinner ? 'mint' : player.ready ? 'plum' : player.status === 'folded' ? 'coral' : 'muted'}>
          {isWinner ? '승리' : player.ready ? '준비' : player.status}
        </Badge>
      </div>

      <div className="mb-4 flex justify-center">
        <div
          className={`flex aspect-[3/4] h-24 flex-col items-center justify-center rounded-2xl border border-white/70 bg-base shadow-neu-inset sm:h-28 sm:rounded-3xl ${
            showCard ? cardTone : 'text-muted'
          }`}
        >
          {showCard && card ? (
            <>
              <span className="text-2xl font-black sm:text-3xl">{card.rank}</span>
              <span className="text-xl sm:text-2xl">{suitSymbol(card.suit)}</span>
            </>
          ) : (
            <>
              <EyeOff size={26} />
              <span className="mt-2 text-xs font-black">{isOwn ? '내 카드' : '비공개'}</span>
            </>
          )}
        </div>
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
