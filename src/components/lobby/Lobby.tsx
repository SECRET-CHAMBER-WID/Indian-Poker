import { DoorOpen, LogOut, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPlayers } from '../../lib/gameEngine';
import { joinRoom, joinRoomByCode } from '../../lib/roomService';
import { useRealtimeValue } from '../../hooks/useRealtimeValue';
import type { Room, ToastState } from '../../types';
import { BrandMark } from '../neumorphic/BrandMark';
import { Button } from '../neumorphic/Button';
import { Input } from '../neumorphic/Input';
import { MobileBottomNav } from '../neumorphic/MobileBottomNav';
import { Panel } from '../neumorphic/Panel';
import { CreateRoomModal } from './CreateRoomModal';
import { RoomCard } from './RoomCard';

interface LobbyProps {
  onToast: (toast: ToastState) => void;
  onEnterRoom: (roomId: string) => void;
}

export function Lobby({ onToast, onEnterRoom }: LobbyProps) {
  const { profile, logout } = useAuth();
  const { value: rooms } = useRealtimeValue<Record<string, Room>>('rooms');
  const [createOpen, setCreateOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);

  const roomList = useMemo(() => {
    return Object.values(rooms ?? {})
      .filter((room) => !room.isPrivate && room.status === 'waiting')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [rooms]);

  if (!profile) {
    return null;
  }

  const joinById = async (roomId: string) => {
    setJoining(true);

    try {
      const joinedRoomId = await joinRoom(roomId, profile);
      onToast({ type: 'success', message: '방에 입장했습니다.' });
      onEnterRoom(joinedRoomId);
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : '방 입장에 실패했습니다.' });
    } finally {
      setJoining(false);
    }
  };

  const joinByCode = async () => {
    setJoining(true);

    try {
      const joinedRoomId = await joinRoomByCode(roomCode, profile);
      onToast({ type: 'success', message: '방 코드로 입장했습니다.' });
      onEnterRoom(joinedRoomId);
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : '방 코드를 확인해 주세요.' });
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-base px-3 pb-28 pt-3 text-ink sm:px-4 sm:py-6 lg:pb-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <header className="sticky top-0 z-30 rounded-[22px] bg-base/95 p-4 shadow-neu backdrop-blur sm:rounded-[28px] sm:p-5 md:flex md:items-center md:justify-between lg:static">
          <div>
            <BrandMark />
            <h1 className="mt-3 text-3xl font-black">로비</h1>
            <p className="mt-2 text-sm font-semibold text-muted">
              {profile.nickname} · {profile.credits.toLocaleString()} 크레딧 · {profile.wins}승 {profile.losses}패
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:mt-0 md:flex md:flex-wrap md:gap-3">
            <Button className="w-full md:w-auto" data-testid="open-create-room" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)} variant="primary">
              방 만들기
            </Button>
            <Button className="w-full md:w-auto" icon={<LogOut size={18} />} onClick={logout}>
              로그아웃
            </Button>
          </div>
        </header>

        <Panel className="grid gap-3 p-4 sm:gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Input
            label="방 코드 입장"
            maxLength={5}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && roomCode.trim()) {
                void joinByCode();
              }
            }}
            placeholder="ABCDE"
            value={roomCode}
          />
          <Button
            className="w-full lg:w-auto"
            data-testid="join-code-submit"
            disabled={joining || !roomCode.trim()}
            icon={<Search size={18} />}
            onClick={joinByCode}
            variant="primary"
          >
            코드로 입장
          </Button>
        </Panel>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roomList.length === 0 ? (
            <Panel className="md:col-span-2 xl:col-span-3">
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <DoorOpen className="text-mint" size={42} />
                <div>
                  <h2 className="text-xl font-black">공개 방이 없습니다.</h2>
                  <p className="mt-2 text-sm font-semibold text-muted">가운데 + 버튼으로 테이블을 만들 수 있습니다.</p>
                </div>
              </div>
            </Panel>
          ) : (
            roomList.map((room) => (
              <RoomCard
                joining={joining}
                key={room.id}
                onJoin={joinById}
                room={{
                  ...room,
                  players: room.players ?? {},
                  maxPlayers: room.maxPlayers || Math.max(8, getPlayers(room).length)
                }}
              />
            ))
          )}
        </section>
      </div>

      <CreateRoomModal
        onClose={() => setCreateOpen(false)}
        onCreated={onEnterRoom}
        onToast={onToast}
        open={createOpen}
        profile={profile}
      />
      <MobileBottomNav
        active="lobby"
        onAlerts={() => onToast({ type: 'info', message: '새 알림이 없습니다.' })}
        onChat={() => onToast({ type: 'info', message: '방에 들어가면 채팅을 사용할 수 있습니다.' })}
        onCreate={() => setCreateOpen(true)}
        onLobby={() => undefined}
        onProfile={() => onToast({ type: 'info', message: `${profile.nickname} · ${profile.credits.toLocaleString()} 크레딧` })}
      />
    </main>
  );
}
