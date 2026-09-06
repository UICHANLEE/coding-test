import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authConfig,
  createSession,
  sessionMember,
  sessionCookie,
  validCode,
  publicMembers,
  SESSION_SECONDS,
} from '../lib/server/auth';
const env = {
  AUTH_SECRET: 'test-secret-'.repeat(5),
  STUDY_MEMBER_1_CODE: 'test-first-code-'.repeat(3),
  STUDY_MEMBER_2_CODE: 'test-second-code-'.repeat(3),
};
const config = authConfig(env);
void test('two distinct credentials; no secrets in public identities', () => {
  assert.equal(validCode('member-1', env.STUDY_MEMBER_1_CODE, config), true);
  assert.equal(validCode('member-2', env.STUDY_MEMBER_1_CODE, config), false);
  assert.deepEqual(
    publicMembers(config).map((m) => Object.keys(m)),
    [
      ['id', 'name'],
      ['id', 'name'],
    ],
  );
  assert.throws(() => authConfig({}));
  assert.throws(() =>
    authConfig({ ...env, STUDY_MEMBER_2_CODE: env.STUDY_MEMBER_1_CODE }),
  );
});
void test('signed sessions resist member tampering, expiry, key and credential rotation', () => {
  const now = Date.now();
  const token = createSession('member-1', config, now);
  assert.equal(sessionMember(token, config, now)?.id, 'member-1');
  assert.equal(
    sessionMember(token, config, now + SESSION_SECONDS * 1000),
    null,
  );
  const [payload, signature] = token.split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  data.id = 'member-2';
  assert.equal(
    sessionMember(
      Buffer.from(JSON.stringify(data)).toString('base64url') + '.' + signature,
      config,
      now,
    ),
    null,
  );
  assert.equal(
    sessionMember(token, { ...config, secret: config.secret + 'changed' }, now),
    null,
  );
  assert.equal(
    sessionMember(
      token,
      authConfig({
        ...env,
        STUDY_MEMBER_1_CODE: env.STUDY_MEMBER_1_CODE + 'changed',
      }),
      now,
    ),
    null,
  );
  assert.equal(sessionMember('not.a.session', config), null);
});
void test('session cookies are secure and clearable', () => {
  assert.match(sessionCookie('token', true), /HttpOnly; SameSite=Lax; Path=\//);
  assert.match(sessionCookie('token', true), /; Secure$/);
  assert.match(sessionCookie('', true), /Max-Age=0/);
  assert.doesNotMatch(sessionCookie('token', false), /Secure/);
});
