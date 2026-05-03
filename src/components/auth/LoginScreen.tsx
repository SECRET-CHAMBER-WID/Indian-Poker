import { Crown, LogIn, Sparkles, UserPlus } from 'lucide-react';
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
  const [mode, setMode] = useState<'player' | 'master'>('player');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!validatePin(pin)) {
      onToast({ type: 'error', message: '비밀번호는 4자리 숫자로 입력해 주세요.' });
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'master') {
        await loginMaster(pin);
      } else {
        await loginOrRegister(nickname, pin);
      }

      onToast({ type: 'success', message: '접속했습니다.' });
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-base px-4 py-8 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-base px-4 py-2 text-sm font-bold text-mint shadow-neu-sm">
              <Sparkles size={18} />
              실시간 인디언 포커
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">카드는 보이지 않고, 판은 실시간으로 움직입니다.</h1>
              <p className="text-lg leading-8 text-muted">
                2명부터 8명까지 방을 만들고 준비 동의 후 누구나 게임을 시작할 수 있습니다. 본인 카드는 숨겨지고,
                상대 카드와 베팅 흐름만 보고 승부합니다.
              </p>
            </div>
            <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
              {['방 생성/입장', '턴 타이머', '크레딧 정산'].map((item) => (
                <div key={item} className="rounded-3xl bg-base p-5 text-center font-bold text-muted shadow-neu-sm">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <Panel className="w-full">
            <div className="mb-6 grid grid-cols-2 gap-3">
              <Button
                icon={<UserPlus size={18} />}
                onClick={() => setMode('player')}
                variant={mode === 'player' ? 'primary' : 'soft'}
              >
                플레이어
              </Button>
              <Button
                icon={<Crown size={18} />}
                onClick={() => {
                  setMode('master');
                  setNickname('위드');
                }}
                variant={mode === 'master' ? 'primary' : 'soft'}
              >
                마스터
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                disabled={mode === 'master'}
                label="이름"
                maxLength={16}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="닉네임"
                value={mode === 'master' ? '위드' : nickname}
              />
              <Input
                inputMode="numeric"
                label="4자리 비밀번호"
                maxLength={4}
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
                disabled={submitting || (mode === 'player' && !nickname.trim()) || pin.length !== 4}
                icon={<LogIn size={18} />}
                onClick={submit}
                size="lg"
                variant="primary"
              >
                {submitting ? '접속 중' : mode === 'master' ? '관리자 패널 입장' : '게임 접속'}
              </Button>
              <p className="rounded-2xl bg-base p-4 text-sm leading-6 text-muted shadow-neu-inset">
                마스터 계정은 이름 <strong className="text-ink">위드</strong>, 비밀번호{' '}
                <strong className="text-ink">4001</strong>입니다. 최초 배포 후 README의 마스터 시드 스크립트를 실행해야
                관리자 권한이 활성화됩니다.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
