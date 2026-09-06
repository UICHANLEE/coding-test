import { isMemberId } from '../members';
import type { Repository } from '../../db/repository';
import {
  type AuthConfig,
  createSession,
  publicMembers,
  rateLimitKey,
  requestMember,
  sessionCookie,
  validCode,
} from './auth';
import { entryInput, settingsInput, record, InputError } from './validation';
export type Dependencies = {
  config: () => AuthConfig;
  repository: () => Repository;
  secureCookies: () => boolean;
};
function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', ...headers },
  });
}
function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new InputError('JSON 형식으로 요청해 주세요.');
  const text = await request.text();
  if (text.length > 40000) throw new InputError('입력 내용이 너무 깁니다.');
  try {
    return record(JSON.parse(text));
  } catch (e) {
    if (e instanceof InputError) throw e;
    throw new InputError('입력 내용을 확인해 주세요.');
  }
}
function failure(error: unknown) {
  if (error instanceof InputError) return json({ error: error.message }, 400);
  // Never log credentials, connection strings or private notes.
  console.error(
    'Study request failed:',
    error instanceof Error ? error.name : 'UnknownError',
  );
  return json(
    { error: '스터디 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' },
    503,
  );
}
export function createHandlers(deps: Dependencies) {
  return {
    async getStudy(request: Request) {
      try {
        const config = deps.config(),
          member = requestMember(request, config);
        if (!member) return json({ error: '로그인이 필요해요.' }, 401);
        const db = deps.repository();
        const [entries, settings, progress] = await Promise.all([
          db.entries(member.id),
          db.settings(member.id),
          db.progress(),
        ]);
        const team = publicMembers(config).map((m) => {
          const p = progress.find((p) => p.memberId === m.id);
          return {
            ...m,
            completed: p?.completed || 0,
            todayCompleted: p?.todayCompleted || 0,
          };
        });
        return json({ member, entries, settings, team });
      } catch (e) {
        return failure(e);
      }
    },
    async saveStudy(request: Request) {
      try {
        if (!sameOrigin(request))
          return json({ error: '허용되지 않은 요청이에요.' }, 403);
        const config = deps.config(),
          member = requestMember(request, config);
        if (!member) return json({ error: '로그인이 필요해요.' }, 401);
        const data = await body(request),
          db = deps.repository();
        if (data.type === 'settings')
          await db.saveSettings(member.id, settingsInput(data));
        else if (data.type === undefined || data.type === 'entry')
          await db.saveEntry(member.id, entryInput(data.entry));
        else throw new InputError('지원하지 않는 요청이에요.');
        return json({ ok: true });
      } catch (e) {
        return failure(e);
      }
    },
    async login(request: Request) {
      try {
        if (!sameOrigin(request))
          return json({ error: '허용되지 않은 요청이에요.' }, 403);
        const data = await body(request);
        if (
          !isMemberId(data.memberId) ||
          typeof data.code !== 'string' ||
          data.code.length > 256
        )
          throw new InputError('이름과 로그인 코드를 확인해 주세요.');
        const config = deps.config(),
          db = deps.repository();
        if (!(await db.allowLogin(rateLimitKey(request, config))))
          return json(
            { error: '로그인 시도가 많아요. 15분 후 다시 시도해 주세요.' },
            429,
            { 'Retry-After': '900' },
          );
        if (!validCode(data.memberId, data.code, config))
          return json({ error: '이름 또는 로그인 코드가 맞지 않아요.' }, 401);
        const member = publicMembers(config).find(
          (m) => m.id === data.memberId,
        );
        return json({ member }, 200, {
          'Set-Cookie': sessionCookie(
            createSession(data.memberId, config),
            deps.secureCookies(),
          ),
        });
      } catch (e) {
        return failure(e);
      }
    },
    async logout(request: Request) {
      if (!sameOrigin(request))
        return json({ error: '허용되지 않은 요청이에요.' }, 403);
      return json({ ok: true }, 200, {
        'Set-Cookie': sessionCookie('', deps.secureCookies()),
      });
    },
  };
}
