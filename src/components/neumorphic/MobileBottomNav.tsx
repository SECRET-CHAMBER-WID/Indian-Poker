import { Bell, Home, MessageCircle, Plus, User } from 'lucide-react';

type MobileTab = 'lobby' | 'chat' | 'alerts' | 'profile';

interface MobileBottomNavProps {
  active?: MobileTab;
  onLobby: () => void;
  onCreate: () => void;
  onChat: () => void;
  onAlerts: () => void;
  onProfile: () => void;
}

const items = [
  { key: 'lobby', label: '로비', icon: Home },
  { key: 'chat', label: '채팅', icon: MessageCircle },
  { key: 'alerts', label: '알림', icon: Bell },
  { key: 'profile', label: '프로필', icon: User }
] as const;

export function MobileBottomNav({ active = 'lobby', onLobby, onCreate, onChat, onAlerts, onProfile }: MobileBottomNavProps) {
  const handlers: Record<MobileTab, () => void> = {
    lobby: onLobby,
    chat: onChat,
    alerts: onAlerts,
    profile: onProfile
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-base/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(163,177,198,0.35)] backdrop-blur lg:hidden">
      <button
        aria-label="새 방 만들기"
        className="absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-mint text-white shadow-neu active:shadow-neu-inset"
        onClick={onCreate}
        type="button"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
      <div className="mx-auto grid max-w-sm grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;

          return (
            <button
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition active:shadow-neu-inset ${
                selected ? 'bg-base text-mint shadow-neu-sm' : 'text-muted'
              }`}
              key={item.key}
              onClick={handlers[item.key]}
              type="button"
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
