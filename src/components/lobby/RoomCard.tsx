import { DoorOpen, Eye, Users } from 'lucide-react';
import { getPlayers } from '../../lib/gameEngine';
import type { Room } from '../../types';
import { Badge } from '../neumorphic/Badge';
import { Button } from '../neumorphic/Button';
import { Panel } from '../neumorphic/Panel';

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: string) => void;
  joining: boolean;
}

export function RoomCard({ room, onJoin, joining }: RoomCardProps) {
  const players = getPlayers(room);
  const isWaiting = room.status === 'waiting';

  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-ink">{room.name}</h3>
            <Badge tone={isWaiting ? 'mint' : room.status === 'playing' ? 'amber' : 'plum'}>
              {isWaiting ? '대기' : room.status === 'playing' ? '진행 중' : '정산'}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-muted">코드 {room.code}</p>
        </div>
        <div className="rounded-2xl bg-base p-3 text-mint shadow-neu-inset">
          <Users size={20} />
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-base p-3 shadow-neu-inset">
          <strong className="block text-ink">{players.length}/{room.maxPlayers}</strong>
          <span className="text-muted">인원</span>
        </div>
        <div className="rounded-2xl bg-base p-3 shadow-neu-inset">
          <strong className="block text-ink">{room.ante}</strong>
          <span className="text-muted">앤티</span>
        </div>
        <div className="rounded-2xl bg-base p-3 shadow-neu-inset">
          <strong className="block text-ink">{room.round}</strong>
          <span className="text-muted">라운드</span>
        </div>
      </div>
      <Button
        className="w-full"
        disabled={joining}
        icon={isWaiting ? <DoorOpen size={18} /> : <Eye size={18} />}
        onClick={() => onJoin(room.id)}
        variant={isWaiting ? 'primary' : 'soft'}
      >
        {isWaiting ? '입장' : '관전'}
      </Button>
    </Panel>
  );
}
