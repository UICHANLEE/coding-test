import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const file = new URL('../.env.local', import.meta.url);
const content = `# Private: do not commit or share this entire file.\nDATABASE_URL=\nAUTH_SECRET=${randomBytes(48).toString('base64url')}\nSTUDY_MEMBER_1_NAME="스터디원 1"\nSTUDY_MEMBER_1_CODE=${randomBytes(32).toString('base64url')}\nSTUDY_MEMBER_2_NAME="스터디원 2"\nSTUDY_MEMBER_2_CODE=${randomBytes(32).toString('base64url')}\n`;
try {
  await writeFile(file, content, { flag: 'wx', mode: 0o600 });
  console.log(
    '.env.local을 만들었습니다. DATABASE_URL과 두 사람의 이름을 채워 주세요. 코드는 각자 자신의 것만 전달하세요.',
  );
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error(
      '.env.local이 이미 있어 덮어쓰지 않았습니다. 기존 설정을 유지합니다.',
    );
  } else console.error('설정 파일을 만들지 못했습니다.');
  process.exitCode = 1;
}
