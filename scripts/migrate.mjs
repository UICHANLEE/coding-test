import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
export async function migrate(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL을 설정한 뒤 다시 실행해 주세요.');
  const sql = neon(url);
  await sql.query(
    'CREATE TABLE IF NOT EXISTS study_schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const dir = new URL('../db/migrations/', import.meta.url);
  for (const name of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const source = await readFile(new URL(name, dir), 'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    const existing = await sql.query(
      'SELECT checksum FROM study_schema_migrations WHERE name=$1',
      [name],
    );
    if (existing.length) {
      if (existing[0].checksum !== checksum)
        throw new Error(`이미 적용된 마이그레이션이 변경되었습니다: ${name}`);
      continue;
    }
    const statements = source
      .split('-- statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    await sql.transaction([
      ...statements.map((statement) => sql.query(statement)),
      sql.query(
        'INSERT INTO study_schema_migrations(name,checksum) VALUES($1,$2)',
        [name, checksum],
      ),
    ]);
    console.log(`적용 완료: ${name}`);
  }
}
try {
  await migrate();
  console.log('데이터베이스가 준비되었습니다.');
} catch (error) {
  console.error(
    error.message.includes('DATABASE_URL')
      ? error.message
      : '마이그레이션 실패. 연결과 기존 스키마를 확인하세요. 적용된 파일은 수정하지 마세요.',
  );
  process.exitCode = 1;
}
