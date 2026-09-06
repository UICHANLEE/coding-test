import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const source = await readFile(
  new URL('../.env.local', import.meta.url),
  'utf8',
);
const values = Object.fromEntries(
  source
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => {
      let value = match[2];
      try {
        value = JSON.parse(value);
      } catch {}
      return [match[1], value];
    }),
);
const names = [
  'AUTH_SECRET',
  'STUDY_MEMBER_1_NAME',
  'STUDY_MEMBER_1_CODE',
  'STUDY_MEMBER_2_NAME',
  'STUDY_MEMBER_2_CODE',
];

for (const name of names) {
  const value = values[name];
  if (!value)
    throw new Error(`${name} 값이 없습니다. npm run setup을 먼저 실행하세요.`);
  for (const environment of ['production', 'preview', 'development']) {
    const result = spawnSync(
      'npx',
      [
        '--yes',
        'vercel@59.11.2',
        'env',
        'add',
        name,
        environment,
        '--force',
        '--value',
        value,
        '--yes',
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      console.error(
        result.stderr.trim() || `${name} (${environment}) 등록 실패`,
      );
      process.exit(1);
    }
  }
  console.log(`${name} 등록 완료`);
}
