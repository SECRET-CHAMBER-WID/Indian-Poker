import { useCallback, useEffect, useState } from 'react';
import { AdminPanel } from './components/admin/AdminPanel';
import { LoginScreen } from './components/auth/LoginScreen';
import { GameRoom } from './components/game/GameRoom';
import { Lobby } from './components/lobby/Lobby';
import { Toast } from './components/neumorphic/Toast';
import { useAuth } from './context/AuthContext';
import type { ToastState } from './types';

export default function App() {
  const { profile, loading } = useAuth();
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((nextToast: ToastState) => {
    setToast(nextToast);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base p-6 text-center text-lg font-black text-muted">
        접속 상태를 확인하는 중입니다.
      </main>
    );
  }

  return (
    <>
      {!profile ? <LoginScreen onToast={showToast} /> : null}
      {profile?.role === 'master' ? <AdminPanel onToast={showToast} /> : null}
      {profile?.role === 'player' && !profile.currentRoom ? <Lobby onToast={showToast} /> : null}
      {profile?.role === 'player' && profile.currentRoom ? <GameRoom onToast={showToast} roomId={profile.currentRoom} /> : null}
      <Toast toast={toast} />
    </>
  );
}
