import { Plus } from 'lucide-react';
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
  onToast: (toast: ToastState) => void;
}

export function CreateRoomModal({ open, profile, onClose, onToast }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ante, setAnte] = useState(10);
  const [minRaise, setMinRaise] = useState(10);
  const [turnSeconds, setTurnSeconds] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);

    try {
      await createRoom(profile, {
        name,
        maxPlayers,
        ante,
        minRaise,
        turnSeconds
      });
      onToast({ type: 'success', message: '방을 만들었습니다.' });
      onClose();
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
          <Input label="앤티" min={0} onChange={(event) => setAnte(Number(event.target.value))} type="number" value={ante} />
          <Input label="최소 레이즈" min={1} onChange={(event) => setMinRaise(Number(event.target.value))} type="number" value={minRaise} />
          <Input
            label="턴 제한(초)"
            max={120}
            min={15}
            onChange={(event) => setTurnSeconds(Number(event.target.value))}
            type="number"
            value={turnSeconds}
          />
        </div>
        <Button className="w-full" data-testid="create-room-submit" disabled={submitting} icon={<Plus size={18} />} onClick={submit} size="lg" variant="primary">
          {submitting ? '생성 중' : '방 생성'}
        </Button>
      </div>
    </Modal>
  );
}
