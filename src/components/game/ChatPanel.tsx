import { Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sendChatMessage } from '../../lib/roomService';
import type { ChatMessage, Room, ToastState, UserProfile } from '../../types';
import { Button } from '../neumorphic/Button';
import { Panel } from '../neumorphic/Panel';

interface ChatPanelProps {
  room: Room;
  profile: UserProfile;
  onToast: (toast: ToastState) => void;
}

export function ChatPanel({ room, profile, onToast }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messages = useMemo(() => {
    return Object.values(room.chat ?? {})
      .sort((a: ChatMessage, b: ChatMessage) => a.createdAt - b.createdAt)
      .slice(-40);
  }, [room.chat]);

  const submit = async () => {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    setMessage('');

    try {
      await sendChatMessage(room.id, profile, cleanMessage);
    } catch (error) {
      onToast({ type: 'error', message: error instanceof Error ? error.message : '채팅 전송에 실패했습니다.' });
    }
  };

  return (
    <Panel className="flex h-full min-h-[260px] flex-col p-4 lg:min-h-[360px]">
      <h2 className="mb-3 text-lg font-black text-ink">채팅</h2>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-3xl bg-base p-3 shadow-neu-inset">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-muted">아직 메시지가 없습니다.</p>
        ) : (
          messages.map((chat) => (
            <div key={chat.id} className={chat.uid === profile.uid ? 'text-right' : ''}>
              <p className="mb-1 text-xs font-bold text-muted">{chat.nickname}</p>
              <p className="inline-block max-w-[85%] rounded-2xl bg-white/50 px-3 py-2 text-sm font-semibold text-ink shadow-neu-sm">
                {chat.message}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-2xl border border-white/60 bg-base px-4 text-sm font-semibold text-ink shadow-neu-inset outline-none focus:border-mint"
          maxLength={300}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void submit();
            }
          }}
          placeholder="메시지"
          value={message}
        />
        <Button aria-label="전송" icon={<Send size={18} />} onClick={submit} variant="primary" />
      </div>
    </Panel>
  );
}
