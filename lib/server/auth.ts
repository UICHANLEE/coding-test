import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isMemberId, type MemberId, type PublicMember } from '../members';
export const SESSION_COOKIE = 'daily_pair_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type AuthConfig = {
  secret: string;
  members: [PublicMember & { code: string }, PublicMember & { code: string }];
};
export function authConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig {
  const secret = env.AUTH_SECRET || '';
  const code1 = env.STUDY_MEMBER_1_CODE || '';
  const code2 = env.STUDY_MEMBER_2_CODE || '';
  if (
    secret.length < 32 ||
    code1.length < 24 ||
    code2.length < 24 ||
    code1 === code2 ||
    [secret, code1, code2].some((v) => v.startsWith('replace-'))
  ) {
    throw new Error('Study authentication is not configured');
  }
  return {
    secret,
    members: [
      {
        id: 'member-1',
        name: (env.STUDY_MEMBER_1_NAME || '스터디원 1').slice(0, 30),
        code: code1,
      },
      {
        id: 'member-2',
        name: (env.STUDY_MEMBER_2_NAME || '스터디원 2').slice(0, 30),
        code: code2,
      },
    ],
  };
}
export function publicMembers(config: AuthConfig): PublicMember[] {
  return config.members.map(({ id, name }) => ({ id, name }));
}
function digest(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
function same(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function validCode(
  memberId: MemberId,
  code: string,
  config: AuthConfig,
) {
  const member = config.members.find((m) => m.id === memberId);
  return (
    !!member &&
    same(digest(code, config.secret), digest(member.code, config.secret))
  );
}
export function createSession(
  memberId: MemberId,
  config: AuthConfig,
  now = Date.now(),
) {
  const member = config.members.find((m) => m.id === memberId);
  if (!member) throw new Error('Unknown member');
  const payload = Buffer.from(
    JSON.stringify({
      id: memberId,
      exp: Math.floor(now / 1000) + SESSION_SECONDS,
      version: digest(member.code, config.secret),
      nonce: randomBytes(12).toString('base64url'),
    }),
  ).toString('base64url');
  return `${payload}.${digest(payload, config.secret)}`;
}
export function sessionMember(
  token: string | undefined,
  config: AuthConfig,
  now = Date.now(),
): PublicMember | null {
  if (!token || token.length > 1024) return null;
  try {
    const [payload, signature, ...extra] = token.split('.');
    if (
      extra.length ||
      !signature ||
      !same(signature, digest(payload, config.secret))
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      id: unknown;
      exp: unknown;
      version: unknown;
    };
    if (
      !isMemberId(data.id) ||
      typeof data.exp !== 'number' ||
      !Number.isInteger(data.exp) ||
      data.exp <= Math.floor(now / 1000) ||
      data.exp > Math.floor(now / 1000) + SESSION_SECONDS
    )
      return null;
    const m = config.members.find((member) => member.id === data.id);
    if (
      !m ||
      typeof data.version !== 'string' ||
      !same(data.version, digest(m.code, config.secret))
    )
      return null;
    return { id: m.id, name: m.name };
  } catch {
    return null;
  }
}
export function requestMember(request: Request, config: AuthConfig) {
  const cookie = (request.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(SESSION_COOKIE + '='));
  return sessionMember(cookie?.slice(SESSION_COOKIE.length + 1), config);
}
export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token ? SESSION_SECONDS : 0}${secure ? '; Secure' : ''}`;
}
export function rateLimitKey(request: Request, config: AuthConfig) {
  // Vercel owns this header; elsewhere all callers share a conservative bucket.
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for') || 'unknown'
      : 'local';
  return digest('login:' + ip, config.secret);
}
