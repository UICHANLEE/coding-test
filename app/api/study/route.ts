import type { Entry } from '@/lib/study';
import { database } from '@/db/raw';
export async function GET() {
  try {
    const db = database();
    const [entries, settings] = await Promise.all([
      db
        .prepare(
          'SELECT day,kind,title,problem_id AS problemId,minutes,result,reason,idea,caution FROM study_entries ORDER BY day,kind',
        )
        .all(),
      db.prepare('SELECT key,value FROM study_settings').all(),
    ]);
    return Response.json({
      entries: entries.results,
      settings: Object.fromEntries(
        settings.results.map((s: any) => [s.key, s.value]),
      ),
    });
  } catch (error) {
    console.error('Study storage operation failed', error);
    return Response.json(
      { error: '기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return Response.json(
        { error: '허용되지 않은 요청입니다.' },
        { status: 403 },
      );
    const data = (await request.json()) as {
      type?: string;
      start: string;
      reminder: string;
      entry?: Entry;
    };
    const db = database();
    if (data.type === 'settings') {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(data.start) ||
        !Number.isFinite(Date.parse(data.start)) ||
        new Date(data.start).toISOString().slice(0, 10) !== data.start ||
        new Date(data.start + 'T12:00:00').getDay() !== 1 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminder)
      )
        return Response.json(
          { error: '시작일은 월요일, 알림은 올바른 시간을 선택해 주세요.' },
          { status: 400 },
        );
      await db.batch([
        db
          .prepare(
            'INSERT INTO study_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          )
          .bind('start', data.start),
        db
          .prepare(
            'INSERT INTO study_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          )
          .bind('reminder', data.reminder),
      ]);
      return Response.json({ ok: true });
    }
    const e = data.entry;
    if (
      !e ||
      !Number.isInteger(e.day) ||
      e.day < 0 ||
      e.day > 55 ||
      !['python', 'sql'].includes(e.kind) ||
      !Number.isInteger(e.minutes) ||
      e.minutes < 0 ||
      e.minutes > 600 ||
      !['self', 'hint', 'solution', 'unsolved'].includes(e.result) ||
      !Number.isInteger(e.problemId) ||
      e.problemId < 1 ||
      ['title', 'reason', 'idea', 'caution'].some(
        (k) =>
          typeof e[k as keyof Entry] !== 'string' ||
          e[k as keyof Entry].toString().length > 10000,
      ) ||
      !e.title.trim()
    )
      return Response.json(
        { error: '풀이 기록의 입력값을 확인해 주세요.' },
        { status: 400 },
      );
    await db
      .prepare(
        'INSERT INTO study_entries (key,day,kind,title,problem_id,minutes,result,reason,idea,caution) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title,problem_id=excluded.problem_id,minutes=excluded.minutes,result=excluded.result,reason=excluded.reason,idea=excluded.idea,caution=excluded.caution',
      )
      .bind(
        `${e.day}-${e.kind}`,
        e.day,
        e.kind,
        e.title,
        e.problemId,
        e.minutes,
        e.result,
        e.reason,
        e.idea,
        e.caution,
      )
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Study storage operation failed', error);
    return Response.json(
      {
        error:
          '저장하지 못했습니다. 입력 내용을 유지했으니 다시 시도해 주세요.',
      },
      { status: 503 },
    );
  }
}
