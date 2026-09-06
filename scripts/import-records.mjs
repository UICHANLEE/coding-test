import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { python, sql as sqlProblems } from '../lib/study.ts';
import { entryInput, settingsInput } from '../lib/server/validation.ts';
export function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('CSV의 따옴표가 닫히지 않았습니다.');
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}
export function recordsFromCsv(text, start, overrides = {}) {
  const [headers, ...rows] = parseCsv(text);
  const required = [
    '날짜',
    '문제',
    '언어',
    '소요 시간(분)',
    '결과',
    '막힌 이유',
    '핵심 아이디어',
    '복잡도·주의점',
  ];
  if (!headers || required.some((k) => !headers.includes(k)))
    throw new Error('daily pair에서 내보낸 CSV를 선택해 주세요.');
  const ids = new Map([...python, ...sqlProblems].map((p) => [p.title, p.id]));
  for (const [title, id] of Object.entries(overrides)) {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new Error('문제 ID 매핑을 확인해 주세요.');
    ids.set(title, id);
  }
  const results = {
    '자력 해결': 'self',
    '힌트 사용': 'hint',
    '해설 학습': 'solution',
    미해결: 'unsolved',
  };
  const unique = new Set();
  return rows.map((row) => {
    const r = Object.fromEntries(headers.map((key, i) => [key, row[i] ?? '']));
    const day =
      (Date.parse(r['날짜'] + 'T12:00:00Z') -
        Date.parse(start + 'T12:00:00Z')) /
      86400000;
    const kind = ['python', 'Python3'].includes(r['언어'])
      ? 'python'
      : ['sql', 'MySQL'].includes(r['언어'])
        ? 'sql'
        : 'invalid';
    const problemId = ids.get(r['문제']);
    if (!problemId)
      throw new Error(
        `문제 ID를 찾을 수 없습니다: ${r['문제']}. --problem-map으로 제목과 ID를 제공하세요.`,
      );
    const entry = entryInput({
      day,
      kind,
      problemId,
      title: r['문제'],
      minutes: Number(r['소요 시간(분)']),
      result: results[r['결과']],
      reason: r['막힌 이유'],
      idea: r['핵심 아이디어'],
      caution: r['복잡도·주의점'],
    });
    const key = `${day}-${kind}`;
    if (unique.has(key))
      throw new Error('CSV에 같은 날짜·언어가 중복되어 있습니다.');
    unique.add(key);
    return entry;
  });
}
async function main() {
  const args = process.argv.slice(2),
    value = (name) => {
      const i = args.indexOf(name);
      return i < 0 ? undefined : args[i + 1];
    };
  const file = value('--file'),
    member = value('--member'),
    start = value('--start'),
    reminder = value('--reminder') || '20:00';
  if (!file || !['member-1', 'member-2'].includes(member) || !start)
    throw new Error(
      '사용법: npm run db:import -- --file 기록.csv --member member-1 --start 2026-09-07 [--apply]',
    );
  settingsInput({ start, reminder });
  const overrides = value('--problem-map')
    ? JSON.parse(await readFile(value('--problem-map'), 'utf8'))
    : {};
  const entries = recordsFromCsv(
    await readFile(file, 'utf8'),
    start,
    overrides,
  );
  if (!args.includes('--apply')) {
    console.log(
      `${entries.length}개 기록 확인 완료. 대상: ${member}. 저장하려면 같은 명령에 --apply를 추가하세요.`,
    );
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL이 필요합니다.');
  const sql = neon(process.env.DATABASE_URL);
  const existing = await sql.query(
    'SELECT start_date::text AS start FROM study_settings WHERE member_id=$1',
    [member],
  );
  if (existing[0] && existing[0].start !== start)
    throw new Error(
      '대상 계정의 시작일이 다릅니다. 앱에서 시작일을 맞춘 뒤 다시 실행하세요.',
    );
  const result = await sql.transaction([
    sql.query(
      'INSERT INTO study_settings(member_id,start_date,reminder_time) VALUES($1,$2::date,$3) ON CONFLICT(member_id) DO NOTHING',
      [member, start, reminder],
    ),
    ...entries.map((e) =>
      sql.query(
        'INSERT INTO study_entries(member_id,day,kind,title,problem_id,minutes,result,reason,idea,caution) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(member_id,day,kind) DO NOTHING RETURNING day',
        [
          member,
          e.day,
          e.kind,
          e.title,
          e.problemId,
          e.minutes,
          e.result,
          e.reason,
          e.idea,
          e.caution,
        ],
      ),
    ),
  ]);
  const inserted = result.slice(1).reduce((sum, rows) => sum + rows.length, 0);
  console.log(
    `${member}: ${inserted}개 기록 저장. 기존 기록은 덮어쓰지 않았습니다.`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
