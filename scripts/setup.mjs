import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../.env.local', import.meta.url);
const defaults = {
  AUTH_SECRET: randomBytes(48).toString('base64url'),
  STUDY_MEMBER_1_NAME: '스터디원 1',
  STUDY_MEMBER_1_CODE: randomBytes(32).toString('base64url'),
  STUDY_MEMBER_2_NAME: '스터디원 2',
  STUDY_MEMBER_2_CODE: randomBytes(32).toString('base64url'),
};

try {
  let content = '';
  try {
    content = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    content =
      '# Private: do not commit or share this entire file.\nDATABASE_URL=\n';
  }
  const currentNames = new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter(Boolean),
  );
  const additions = Object.entries(defaults)
    .filter(([name]) => !currentNames.has(name))
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`);
  if (additions.length) {
    content = `${content.trimEnd()}\n${additions.join('\n')}\n`;
    await writeFile(file, content, { mode: 0o600 });
  }
  const values = Object.fromEntries(
    content
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
  await writeFile(
    new URL('../STUDY_ACCESS_CODES.txt', import.meta.url),
    `daily pair 개인 로그인 코드\n\n${values.STUDY_MEMBER_1_NAME}: ${values.STUDY_MEMBER_1_CODE}\n${values.STUDY_MEMBER_2_NAME}: ${values.STUDY_MEMBER_2_CODE}\n\n각 사람에게 자신의 코드만 전달하세요. 이 파일은 Git에 포함되지 않습니다.\n`,
    { mode: 0o600 },
  );
  console.log(
    '누락된 인증 설정을 채우고 STUDY_ACCESS_CODES.txt를 만들었습니다.',
  );
} catch {
  console.error(
    '설정 파일을 준비하지 못했습니다. 기존 파일은 덮어쓰지 않았습니다.',
  );
  process.exitCode = 1;
}
