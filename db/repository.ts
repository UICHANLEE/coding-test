import type { MemberId } from '../lib/members';
import type { Entry } from '../lib/study';
export type Sql = (
  text: string,
  values?: unknown[],
) => Promise<Record<string, unknown>[]>;
export function createRepository(sql: Sql) {
  return {
    async entries(memberId: MemberId): Promise<Entry[]> {
      const rows = await sql(
        'SELECT day,kind,title,problem_id,minutes,result,reason,idea,caution FROM study_entries WHERE member_id = $1 ORDER BY day,kind',
        [memberId],
      );
      return rows.map((r) => ({
        day: Number(r.day),
        kind: r.kind as Entry['kind'],
        title: String(r.title),
        problemId: Number(r.problem_id),
        minutes: Number(r.minutes),
        result: r.result as Entry['result'],
        reason: String(r.reason),
        idea: String(r.idea),
        caution: String(r.caution),
      }));
    },
    async settings(memberId: MemberId) {
      const rows = await sql(
        'SELECT start_date::text AS start,reminder_time AS reminder FROM study_settings WHERE member_id = $1',
        [memberId],
      );
      return rows[0]
        ? { start: String(rows[0].start), reminder: String(rows[0].reminder) }
        : { start: '2026-09-07', reminder: '20:00' };
    },
    async saveEntry(memberId: MemberId, e: Entry) {
      await sql(
        `INSERT INTO study_entries(member_id,day,kind,title,problem_id,minutes,result,reason,idea,caution) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(member_id,day,kind) DO UPDATE SET title=EXCLUDED.title,problem_id=EXCLUDED.problem_id,minutes=EXCLUDED.minutes,result=EXCLUDED.result,reason=EXCLUDED.reason,idea=EXCLUDED.idea,caution=EXCLUDED.caution,updated_at=now()`,
        [
          memberId,
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
      );
    },
    async saveSettings(
      memberId: MemberId,
      settings: { start: string; reminder: string },
    ) {
      await sql(
        `INSERT INTO study_settings(member_id,start_date,reminder_time) VALUES ($1,$2::date,$3)
      ON CONFLICT(member_id) DO UPDATE SET start_date=EXCLUDED.start_date,reminder_time=EXCLUDED.reminder_time`,
        [memberId, settings.start, settings.reminder],
      );
    },
    async progress() {
      const rows =
        await sql(`SELECT e.member_id,COUNT(*) FILTER(WHERE e.result <> 'unsolved')::integer AS completed,
        COUNT(*) FILTER(WHERE e.result <> 'unsolved' AND e.day = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date - COALESCE(s.start_date,'2026-09-07'::date))::integer AS today_completed
        FROM study_entries e LEFT JOIN study_settings s ON e.member_id=s.member_id GROUP BY e.member_id,s.start_date`);
      return rows.map((r) => ({
        memberId: r.member_id as MemberId,
        completed: Number(r.completed),
        todayCompleted: Number(r.today_completed),
      }));
    },
    async allowLogin(bucket: string) {
      const rows = await sql(
        `INSERT INTO study_login_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '15 minutes')
      ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN study_login_limits.expires_at<=now() THEN 1 ELSE study_login_limits.hits+1 END,
      expires_at=CASE WHEN study_login_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE study_login_limits.expires_at END
      RETURNING hits`,
        [bucket],
      );
      await sql('DELETE FROM study_login_limits WHERE expires_at < now()');
      return Number(rows[0].hits) <= 10;
    },
  };
}
export type Repository = ReturnType<typeof createRepository>;
