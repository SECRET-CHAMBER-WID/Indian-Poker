import { Eye, Flag, MoveUpRight, PhoneCall } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Room, RoomPlayer } from '../../types';
import { Button } from '../neumorphic/Button';
import { Input } from '../neumorphic/Input';
import { Panel } from '../neumorphic/Panel';

interface BettingControlsProps {
  room: Room;
  player?: RoomPlayer;
  disabled: boolean;
  openDisabled: boolean;
  openVoted: boolean;
  openCount: number;
  liveCount: number;
  onCall: () => Promise<void>;
  onFold: () => Promise<void>;
  onRaise: (raiseTo: number) => Promise<void>;
  onOpen: () => Promise<void>;
}

export function BettingControls({
  room,
  player,
  disabled,
  openDisabled,
  openVoted,
  openCount,
  liveCount,
  onCall,
  onFold,
  onRaise,
  onOpen
}: BettingControlsProps) {
  const game = room.game;
  const toCall = Math.max(0, (game?.currentBet ?? 0) - (player?.roundBet ?? 0));
  const minRaiseTo = (game?.currentBet ?? 0) + (game?.minRaise ?? room.minRaise);
  const maxRaiseTo = (player?.roundBet ?? 0) + (player?.creditsAtTable ?? 0);
  const [raiseTo, setRaiseTo] = useState(minRaiseTo);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRaiseTo(minRaiseTo);
  }, [minRaiseTo]);

  const canRaise = useMemo(() => {
    return !disabled && Boolean(player) && maxRaiseTo >= minRaiseTo && (player?.status ?? '') === 'active';
  }, [disabled, maxRaiseTo, minRaiseTo, player]);

  const run = async (handler: () => Promise<void>) => {
    setBusy(true);

    try {
      await handler();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="sticky bottom-24 z-30 space-y-3 p-3 sm:space-y-4 sm:p-4 lg:static" data-testid="betting-controls">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Button data-testid="call-action" disabled={disabled || busy} icon={<PhoneCall size={18} />} onClick={() => run(onCall)} variant="primary">
          {toCall === 0 ? '콜' : `콜 ${Math.min(toCall, player?.creditsAtTable ?? 0)}`}
        </Button>
        <Button data-testid="fold-action" disabled={disabled || busy} icon={<Flag size={18} />} onClick={() => run(onFold)} variant="danger">
          드랍
        </Button>
        <Button data-testid="raise-action" disabled={!canRaise || busy} icon={<MoveUpRight size={18} />} onClick={() => run(() => onRaise(raiseTo))}>
          레이스
        </Button>
        <Button
          data-testid="open-action"
          disabled={openDisabled || openVoted || busy}
          icon={<Eye size={18} />}
          onClick={() => run(onOpen)}
          variant={openVoted ? 'soft' : 'primary'}
        >
          {openVoted ? 'OPEN 완료' : 'OPEN'}
        </Button>
      </div>

      <Input
        disabled={!canRaise || busy}
        label={`레이스 금액 (${minRaiseTo}~${maxRaiseTo})`}
        max={maxRaiseTo}
        min={minRaiseTo}
        onChange={(event) => setRaiseTo(Number(event.target.value))}
        type="number"
        value={raiseTo}
      />
      <p className="text-center text-xs font-black text-muted">
        OPEN 동의 {openCount}/{liveCount}
      </p>
    </Panel>
  );
}
