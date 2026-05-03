import { LogIn, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { loginMaster, loginOrRegister, validatePin } from '../../lib/authService';
import type { ToastState } from '../../types';
import { Button } from '../neumorphic/Button';
import { Input } from '../neumorphic/Input';
import { Panel } from '../neumorphic/Panel';

interface LoginScreenProps {
  onToast: (toast: ToastState) => void;
}

export function LoginScreen({ onToast }: LoginScreenProps) {
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const cleanNickname = nickname.trim();

    if (!cleanNickname) {
      onToast({ type: 'error', message: '이름을 입력해 주세요.' });
      return;
    }

    if (!validatePin(pin)) {
      onToast({ type: 'error', message: '비밀번호는 4자리 숫자로 입력해 주세요.' });
      return;
    }

    setSubmitting(true);

    try {
      if (cleanNickname === '위드') {
        await loginMaster(pin);
      } else {
        await loginOrRegister(cleanNickname, pin);
      }

      onToast({ type: 'success', message: '접속했습니다.' });
    } catch {
      onToast({
        type: 'error',
        message: '이름 또는 비밀번호를 확인해 주세요.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-base px-3 py-4 text-ink sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full bg-base px-5 py-3 shadow-neu-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-black text-white shadow-neu-inset">
                SC
              </span>
              <span className="text-sm font-black tracking-[0.18em] text-ink">SECRET CHAMBER</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-base px-4 py-2 text-sm font-bold text-mint shadow-neu-sm">
              <Sparkles size={18} />
              실시간 인디언 포커
            </div>
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <h1 className="text-3xl font-black leading-tight text-ink sm:text-5xl">카드는 보이지 않고, 판은 실시간으로 움직입니다.</h1>
              <p className="text-base leading-7 text-muted sm:text-lg sm:leading-8">
                2명부터 8명까지 방을 만들고 준비 동의 후 누구나 게임을 시작할 수 있습니다. 본인 카드는 숨겨지고,
                상대 카드와 베팅 흐름만 보고 승부합니다.
              </p>
            </div>
            <div className="grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
              {['방 생성/입장', '턴 타이머', '크레딧 정산'].map((item) => (
                <div key={item} className="rounded-2xl bg-base p-3 text-center text-xs font-bold text-muted shadow-neu-sm sm:rounded-3xl sm:p-5 sm:text-base">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <Panel className="w-full">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl bg-base text-lg font-black text-mint shadow-neu-inset">
                SC
              </div>
              <p className="text-xs font-black tracking-[0.22em] text-muted">SECRET CHAMBER</p>
              <h2 className="mt-3 text-2xl font-black text-ink">게임 접속</h2>
            </div>

            <div className="space-y-4">
              <Input
                label="이름"
                maxLength={16}
                data-testid="login-name"
                onChange={(event) => setNickname(event.target.value)}
                placeholder="닉네임"
                value={nickname}
              />
              <Input
                inputMode="numeric"
                label="4자리 비밀번호"
                maxLength={4}
                data-testid="login-pin"
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void submit();
                  }
                }}
                placeholder="0000"
                type="password"
                value={pin}
              />
              <Button
                className="w-full"
                data-testid="login-submit"
                disabled={submitting || !nickname.trim() || pin.length !== 4}
                icon={<LogIn size={18} />}
                onClick={submit}
                size="lg"
                variant="primary"
              >
                {submitting ? '접속 중' : '입장'}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
