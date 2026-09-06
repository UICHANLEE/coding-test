'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Braces, ArrowRight, LockKeyhole } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { MemberId, PublicMember } from '@/lib/members';
export default function LoginForm({
  members,
  ready,
}: {
  members: PublicMember[];
  ready: boolean;
}) {
  const [memberId, setMemberId] = useState<MemberId>('member-1'),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false);
  async function login(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, code }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error || '로그인하지 못했어요. 다시 시도해 주세요.',
        );
      window.location.assign('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결을 확인해 주세요.');
      setPending(false);
    }
  }
  return (
    <main className="login-surface">
      <Link className="brand" href="/">
        <span className="brand-icon">
          <Braces size={24} />
        </span>
        daily<span className="brand-light">pair</span>
        <span className="brand-dot">.</span>
      </Link>
      <section className="login-card">
        <span className="eyebrow">TWO PEOPLE, ONE ROUTINE</span>
        <h1>
          함께 쌓는, 하루 두 문제<span>.</span>
        </h1>
        <p className="login-description">
          각자의 속도로 풀고, 매일의 성취는 함께 나눠요.
        </p>
        {ready ? (
          <form onSubmit={login}>
            <fieldset>
              <legend>누구의 스터디인가요?</legend>
              <RadioGroup
                value={memberId}
                onValueChange={(v) => setMemberId(v as MemberId)}
                className="login-members"
              >
                {members.map((m) => (
                  <label key={m.id}>
                    <RadioGroupItem value={m.id} />
                    <span className="avatar">{m.name.slice(0, 1)}</span>
                    <b>{m.name}</b>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            <label className="login-code">
              나의 로그인 코드
              <input
                type="password"
                autoComplete="current-password"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={256}
                placeholder="전달받은 개인 코드를 입력해 주세요"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={pending || !code.trim()}
            >
              {pending ? '로그인 중…' : '내 스터디 열기'}
              <ArrowRight size={17} />
            </button>
            <p className="login-privacy">
              <LockKeyhole size={14} />
              풀이 메모는 나만, 완료 현황은 둘이 함께 볼 수 있어요.
            </p>
          </form>
        ) : (
          <output className="setup-message">
            <LockKeyhole size={25} />
            <h2>스터디를 준비하고 있어요</h2>
            <p>
              관리자가 두 사람의 계정과 저장소 설정을 마치면 로그인할 수 있어요.
            </p>
          </output>
        )}
      </section>
      <span className="login-footer">
        Python3 + MySQL · 8주, 96개의 새로운 도전
      </span>
    </main>
  );
}
