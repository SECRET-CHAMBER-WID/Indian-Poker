import { DatabaseZap, LogOut, Minus, Plus, RefreshCcw, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeValue } from '../../hooks/useRealtimeValue';
import { adjustUserCredits, deleteRoom, deleteUserData, resetAllData, resetGameData } from '../../lib/adminService';
import { getPlayers } from '../../lib/gameEngine';
import type { Room, ToastState, UserProfile } from '../../types';
import { Badge } from '../neumorphic/Badge';
import { BrandMark } from '../neumorphic/BrandMark';
import { Button } from '../neumorphic/Button';
import { Input } from '../neumorphic/Input';
import { Panel } from '../neumorphic/Panel';

interface AdminPanelProps {
  onToast: (toast: ToastState) => void;
}

export function AdminPanel({ onToast }: AdminPanelProps) {
  const { profile, logout } = useAuth();
  const { value: users } = useRealtimeValue<Record<string, UserProfile>>('users');
  const { value: rooms } = useRealtimeValue<Record<string, Room>>('rooms');
  const [creditDelta, setCreditDelta] = useState(100);
  const [busy, setBusy] = useState(false);

  const userList = useMemo(() => {
    return Object.values(users ?? {}).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'));
  }, [users]);

  const roomList = useMemo(() => Object.values(rooms ?? {}).sort((a, b) => b.updatedAt - a.updatedAt), [rooms]);

  if (!profile) {
    return null;
  }

  const run = async (handler: () => Promise<void>, message: string) => {
    setBusy(true);

    try {
      await handler();
      onToast({ type: 'success', message });
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : '관리 작업에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-base px-4 py-6 text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandMark />
            <div className="mb-2 mt-3 flex items-center gap-2">
              <h1 className="text-3xl font-black">관리자 패널</h1>
              <Badge tone="plum">마스터</Badge>
            </div>
            <p className="text-sm font-semibold text-muted">위드 계정 전용 데이터 관리 화면입니다.</p>
          </div>
          <Button icon={<LogOut size={18} />} onClick={logout}>
            로그아웃
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Panel className="p-5">
            <Users className="mb-3 text-mint" size={28} />
            <strong className="block text-3xl">{userList.length}</strong>
            <span className="text-sm font-bold text-muted">전체 유저</span>
          </Panel>
          <Panel className="p-5">
            <DatabaseZap className="mb-3 text-amber" size={28} />
            <strong className="block text-3xl">{roomList.length}</strong>
            <span className="text-sm font-bold text-muted">전체 방</span>
          </Panel>
          <Panel className="p-5 md:col-span-2">
            <Input
              label="크레딧 조정 단위"
              min={1}
              onChange={(event) => setCreditDelta(Number(event.target.value))}
              type="number"
              value={creditDelta}
            />
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Panel className="overflow-hidden p-0">
            <div className="border-b border-white/70 p-5">
              <h2 className="text-xl font-black">유저 현황</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="px-5 py-3">닉네임</th>
                    <th className="px-5 py-3">권한</th>
                    <th className="px-5 py-3">크레딧</th>
                    <th className="px-5 py-3">전적</th>
                    <th className="px-5 py-3">접속</th>
                    <th className="px-5 py-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user) => (
                    <tr className="border-t border-white/70" key={user.uid}>
                      <td className="px-5 py-4 font-black text-ink">{user.nickname}</td>
                      <td className="px-5 py-4">
                        <Badge tone={user.role === 'master' ? 'plum' : 'mint'}>{user.role}</Badge>
                      </td>
                      <td className="px-5 py-4 font-bold">{user.credits.toLocaleString()}</td>
                      <td className="px-5 py-4 font-bold">
                        {user.wins}승 {user.losses}패 · {user.gamesPlayed}게임
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={user.online ? 'mint' : 'muted'}>{user.online ? '온라인' : '오프라인'}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={busy || user.role === 'master'}
                            icon={<Plus size={16} />}
                            onClick={() => run(() => adjustUserCredits(user.uid, creditDelta), '크레딧을 증가시켰습니다.')}
                            size="sm"
                          >
                            증가
                          </Button>
                          <Button
                            disabled={busy || user.role === 'master'}
                            icon={<Minus size={16} />}
                            onClick={() => run(() => adjustUserCredits(user.uid, -creditDelta), '크레딧을 감소시켰습니다.')}
                            size="sm"
                          >
                            감소
                          </Button>
                          <Button
                            disabled={busy || user.role === 'master'}
                            icon={<Trash2 size={16} />}
                            onClick={() => {
                              if (window.confirm(`${user.nickname}님의 유저 데이터를 삭제할까요?`)) {
                                void run(() => deleteUserData(user.uid), '유저 데이터를 삭제했습니다.');
                              }
                            }}
                            size="sm"
                            variant="danger"
                          >
                            삭제
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel className="space-y-4 p-5">
              <h2 className="text-xl font-black">전체 관리</h2>
              <Button
                className="w-full"
                disabled={busy}
                icon={<RefreshCcw size={18} />}
                onClick={() => {
                  if (window.confirm('모든 게임 방과 카드 데이터를 삭제할까요?')) {
                    void run(resetGameData, '게임 데이터를 초기화했습니다.');
                  }
                }}
                variant="primary"
              >
                게임 및 방 리셋
              </Button>
              <Button
                className="w-full"
                disabled={busy}
                icon={<Trash2 size={18} />}
                onClick={() => {
                  if (window.confirm('마스터 계정을 제외한 모든 데이터를 삭제할까요?')) {
                    void run(() => resetAllData(profile), '전체 데이터를 초기화했습니다.');
                  }
                }}
                variant="danger"
              >
                전체 초기화
              </Button>
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-4 text-xl font-black">방 현황</h2>
              <div className="space-y-3">
                {roomList.length === 0 ? (
                  <p className="text-sm font-semibold text-muted">생성된 방이 없습니다.</p>
                ) : (
                  roomList.map((room) => (
                    <div className="rounded-3xl bg-base p-4 shadow-neu-inset" key={room.id}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black">{room.name}</h3>
                          <p className="mt-1 text-xs font-bold text-muted">
                            {room.code} · {room.status} · {getPlayers(room).length}/{room.maxPlayers}
                          </p>
                        </div>
                        <Button
                          aria-label="방 삭제"
                          disabled={busy}
                          icon={<Trash2 size={16} />}
                          onClick={() => run(() => deleteRoom(room.id), '방을 삭제했습니다.')}
                          size="sm"
                          variant="danger"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}
