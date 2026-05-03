import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { createRoom } from '../../lib/roomService';
import type { ToastState, UserProfile } from '../../types';
import { Button } from '../neumorphic/Button';
import { Input } from '../neumorphic/Input';
import { Modal } from '../neumorphic/Modal';

interface CreateRoomModalProps {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onCreated: (roomId: string) => void;
  onToast: (toast: ToastState) => void;
}

export function CreateRoomModal({ open, profile, onClose, onCreated, onToast }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ante, setAnte] = useState(10);
  const [minRaise, setMinRaise] = useState(10);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);

    try {
      const roomId = await createRoom(profile, {
        name,
        maxPlayers,
        ante,
        minRaise,
        turnSeconds: 60,
        isPrivate
      });
      onToast({ type: 'success', message: '방을 만들었습니다.' });
      onClose();
      onCreated(roomId);
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : '방 생성에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="새 방 만들기">
      <div className="space-y-4">
        <Input data-testid="room-name" label="방 이름" maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="인디언 포커 한 판" value={name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="최대 인원"
            max={8}
            min={2}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
            type="number"
            value={maxPlayers}
          />
          <Input label="기본 베팅" min={0} onChange={(event) => setAnte(Number(event.target.value))} type="number" value={ante} />
          <Input label="최소 레이스" min={1} onChange={(event) => setMinRaise(Number(event.target.value))} type="number" value={minRaise} />
        </div>
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-base p-4 shadow-neu-inset">
          <span className="flex items-center gap-3 text-sm font-black text-ink">
            <Lock className="text-plum" size={18} />
            비공개 방
          </span>
          <input
            checked={isPrivate}
            className="h-6 w-6 accent-mint"
            onChange={(event) => setIsPrivate(event.target.checked)}
            type="checkbox"
          />
        </label>
        <Button className="w-full" data-testid="create-room-submit" disabled={submitting} icon={<Plus size={18} />} onClick={submit} size="lg" variant="primary">
          {submitting ? '생성 중' : '방 생성'}
        </Button>
      </div>
    </Modal>
  );
}
