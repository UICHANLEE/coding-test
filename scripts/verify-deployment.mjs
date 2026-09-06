import { neon } from '@neondatabase/serverless';

const origin = process.argv[2];
if (!origin || !origin.startsWith('https://')) {
  throw new Error(
    '사용법: node --env-file=.env.local scripts/verify-deployment.mjs https://배포주소',
  );
}
const codes = {
  'member-1': process.env.STUDY_MEMBER_1_CODE,
  'member-2': process.env.STUDY_MEMBER_2_CODE,
};
if (!codes['member-1'] || !codes['member-2'] || !process.env.DATABASE_URL) {
  throw new Error('로컬 환경 설정이 필요합니다.');
}

async function request(path, init = {}) {
  const response = await fetch(new URL(path, origin), {
    ...init,
    headers: { origin, ...init.headers },
    redirect: 'manual',
  });
  return response;
}

async function login(memberId) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memberId, code: codes[memberId] }),
  });
  if (response.status !== 200)
    throw new Error(`${memberId} 로그인 실패: ${response.status}`);
  return response.headers.get('set-cookie')?.split(';')[0];
}

const marker = `deployment-verification-${Date.now()}`;
const sql = neon(process.env.DATABASE_URL);
try {
  const page = await request('/login');
  if (page.status !== 200 || !(await page.text()).includes('함께 쌓는')) {
    throw new Error(`로그인 화면 확인 실패: ${page.status}`);
  }
  const firstCookie = await login('member-1');
  const secondCookie = await login('member-2');
  const save = await request('/api/study', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: firstCookie },
    body: JSON.stringify({
      entry: {
        day: 55,
        kind: 'sql',
        title: marker,
        problemId: 293261,
        minutes: 1,
        result: 'self',
        reason: marker,
        idea: marker,
        caution: marker,
      },
    }),
  });
  if (save.status !== 200) throw new Error(`저장 실패: ${save.status}`);
  const first = await (
    await request('/api/study', { headers: { cookie: firstCookie } })
  ).json();
  const second = await (
    await request('/api/study', { headers: { cookie: secondCookie } })
  ).json();
  if (!JSON.stringify(first.entries).includes(marker))
    throw new Error('본인 기록 조회 실패');
  if (JSON.stringify(second).includes(marker))
    throw new Error('상대방에게 개인 기록이 노출됨');
  if (first.team.length !== 2 || second.team.length !== 2)
    throw new Error('함께하는 현황 확인 실패');
  console.log(
    'PASS: production login, save/read, two-member isolation, and shared progress',
  );
} finally {
  await sql.query('DELETE FROM study_entries WHERE member_id=$1 AND title=$2', [
    'member-1',
    marker,
  ]);
}
