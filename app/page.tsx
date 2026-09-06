import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import StudyApp from '@/components/study-app';
import { authConfig, SESSION_COOKIE, sessionMember } from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const jar = await cookies();
  let member = null;
  try {
    member = sessionMember(jar.get(SESSION_COOKIE)?.value, authConfig());
  } catch {
    /* Login page explains an unconfigured study. */
  }
  if (!member) redirect('/login');
  return <StudyApp member={member} />;
}
