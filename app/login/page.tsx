import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/login-form';
import {
  authConfig,
  publicMembers,
  SESSION_COOKIE,
  sessionMember,
} from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  const jar = await cookies();
  let config = null;
  try {
    config = authConfig();
  } catch {
    /* Do not expose missing secrets to visitors. */
  }
  if (config && sessionMember(jar.get(SESSION_COOKIE)?.value, config))
    redirect('/');
  return (
    <LoginForm
      members={config ? publicMembers(config) : []}
      ready={!!config && !!process.env.DATABASE_URL}
    />
  );
}
