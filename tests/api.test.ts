import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createRepository } from '../db/repository';
import { authConfig, createSession, SESSION_COOKIE } from '../lib/server/auth';
import { createHandlers } from '../lib/server/handlers';
const pg = new PGlite();
const repo = createRepository(
  async (text, values) =>
    (await pg.query<Record<string, unknown>>(text, values)).rows,
);
const config = authConfig({
  AUTH_SECRET: 'test-secret-'.repeat(5),
  STUDY_MEMBER_1_CODE: 'test-first-code-'.repeat(3),
  STUDY_MEMBER_2_CODE: 'test-second-code-'.repeat(3),
});
const api = createHandlers({
  config: () => config,
  repository: () => repo,
  secureCookies: () => true,
});
const entry = {
  day: 0,
  kind: 'python',
  title: '완주하지 못한 선수',
  problemId: 42576,
  minutes: 40,
  result: 'self',
  reason: 'private first reason',
  idea: 'private first idea',
  caution: 'private first caution',
};
function req(
  member?: 'member-1' | 'member-2',
  data?: unknown,
  path = '/api/study',
  extra: Record<string, string> = {},
) {
  return new Request('https://study.example' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      origin: 'https://study.example',
      'content-type': 'application/json',
      ...(member
        ? { cookie: `${SESSION_COOKIE}=${createSession(member, config)}` }
        : {}),
      ...extra,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
before(async () => {
  await pg.exec(
    await readFile(
      new URL('../db/migrations/001_two_members.sql', import.meta.url),
      'utf8',
    ),
  );
});
after(async () => {
  await pg.close();
});
beforeEach(async () => {
  await pg.exec('TRUNCATE study_entries,study_settings,study_login_limits');
});
void test('all data access requires a signed login; caller IDs cannot authenticate', async () => {
  assert.equal((await api.getStudy(req())).status, 401);
  assert.equal(
    (await api.saveStudy(req(undefined, { entry, memberId: 'member-1' })))
      .status,
    401,
  );
  assert.equal(
    (
      await api.getStudy(
        req(undefined, undefined, '/api/study?memberId=member-1', {
          cookie: 'daily_pair_session=member-1',
        }),
      )
    ).status,
    401,
  );
});
void test('both members save the same slot independently; tampered owner is ignored', async () => {
  assert.equal((await api.saveStudy(req('member-1', { entry }))).status, 200);
  assert.equal(
    (
      await api.saveStudy(
        req('member-2', {
          memberId: 'member-1',
          entry: {
            ...entry,
            memberId: 'member-1',
            result: 'hint',
            idea: 'second private idea',
          },
        }),
      )
    ).status,
    200,
  );
  const first = await (await api.getStudy(req('member-1'))).json();
  const second = await (await api.getStudy(req('member-2'))).json();
  assert.equal(first.entries.length, 1);
  assert.equal(first.entries[0].idea, entry.idea);
  assert.equal(first.entries[0].result, 'self');
  assert.equal(second.entries.length, 1);
  assert.equal(second.entries[0].idea, 'second private idea');
  assert.equal(first.team.length, 2);
  assert.ok(first.team.every((p: { completed: number }) => p.completed === 1));
  assert.equal(JSON.stringify(second).includes(entry.idea), false);
  assert.deepEqual(Object.keys(second.team[0]).sort(), [
    'completed',
    'id',
    'name',
    'todayCompleted',
  ]);
  assert.equal(
    (await api.getStudy(req('member-1'))).headers.get('cache-control'),
    'private, no-store, max-age=0',
  );
});
void test('updates and settings affect only the current member', async () => {
  await api.saveStudy(req('member-1', { entry }));
  await api.saveStudy(
    req('member-2', { entry: { ...entry, idea: 'keep second' } }),
  );
  await api.saveStudy(
    req('member-1', { entry: { ...entry, idea: 'update first' } }),
  );
  await api.saveStudy(
    req('member-1', {
      type: 'settings',
      start: '2026-09-14',
      reminder: '21:30',
      memberId: 'member-2',
    }),
  );
  assert.equal((await repo.entries('member-1')).length, 1);
  assert.equal((await repo.entries('member-1'))[0].idea, 'update first');
  assert.equal((await repo.entries('member-2'))[0].idea, 'keep second');
  assert.deepEqual(await repo.settings('member-1'), {
    start: '2026-09-14',
    reminder: '21:30',
  });
  assert.deepEqual(await repo.settings('member-2'), {
    start: '2026-09-07',
    reminder: '20:00',
  });
});
void test('invalid fields, JSON, dates, and foreign origins are rejected without writes', async () => {
  for (const invalid of [
    { ...entry, day: 56 },
    { ...entry, minutes: -1 },
    { ...entry, result: 'invalid' },
    { ...entry, idea: 42 },
    { ...entry, problemId: NaN },
  ])
    assert.equal(
      (await api.saveStudy(req('member-1', { entry: invalid }))).status,
      400,
    );
  for (const start of ['2026-09-08', '2026-02-30', 'not-a-date'])
    assert.equal(
      (
        await api.saveStudy(
          req('member-1', { type: 'settings', start, reminder: '20:00' }),
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await api.saveStudy(
        req('member-1', { entry }, '/api/study', {
          origin: 'https://attacker.example',
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api.saveStudy(
        req('member-1', { entry }, '/api/study', {
          'content-type': 'text/plain',
        }),
      )
    ).status,
    400,
  );
  assert.equal((await repo.entries('member-1')).length, 0);
});
void test('login issues HttpOnly cookie, wrong member code fails, and persisted limit works', async () => {
  const login = await api.login(
    req(
      undefined,
      { memberId: 'member-1', code: config.members[0].code },
      '/api/auth/login',
    ),
  );
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie') || '', /HttpOnly/);
  const validCookie = (login.headers.get('set-cookie') || '').split(';')[0];
  assert.equal(
    (
      await api.getStudy(
        req(undefined, undefined, '/api/study', { cookie: validCookie }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api.login(
        req(undefined, { memberId: 'member-2', code: config.members[0].code }),
      )
    ).status,
    401,
  );
  for (let i = 0; i < 8; i++)
    await api.login(req(undefined, { memberId: 'member-1', code: 'wrong' }));
  assert.equal(
    (
      await api.login(
        req(undefined, { memberId: 'member-1', code: config.members[0].code }),
      )
    ).status,
    429,
  );
  await pg.exec(
    "UPDATE study_login_limits SET expires_at=now()-interval '1 second'",
  );
  assert.equal(
    (
      await api.login(
        req(undefined, { memberId: 'member-1', code: config.members[0].code }),
      )
    ).status,
    200,
  );
});
void test('logout clears cookie; cross-origin logout blocked', async () => {
  const response = await api.logout(req('member-1', {}, '/api/auth/logout'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') || '', /Max-Age=0/);
  assert.equal(
    (
      await api.logout(
        req('member-1', {}, '/api/auth/logout', {
          origin: 'https://attacker.example',
        }),
      )
    ).status,
    403,
  );
});
