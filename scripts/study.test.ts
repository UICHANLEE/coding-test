import assert from 'node:assert/strict';
import {
  python,
  sql,
  problemAt,
  weekStats,
  dateAt,
  dateString,
  type Entry,
} from '../lib/study.ts';
for (const kind of ['python', 'sql'] as const) {
  const pool = kind === 'python' ? python : sql;
  assert.equal(pool.length, 48);
  assert.equal(new Set(pool.map((p) => p.id)).size, 48);
  let count = 0;
  for (let day = 0; day < 56; day++) {
    assert.ok(problemAt(day, kind, []).id);
    if (day % 7 !== 5) count++;
  }
  assert.equal(count, 48);
}
const row = (day: number, result: Entry['result'], minutes: number): Entry => ({
  day,
  kind: 'python',
  title: 'test ' + day,
  problemId: python[day].id,
  minutes,
  result,
  reason: '',
  idea: '',
  caution: '',
});
const es = [
  row(0, 'self', 45),
  row(1, 'hint', 30),
  row(2, 'unsolved', 40),
  row(5, 'self', 20),
];
assert.equal(problemAt(5, 'python', es).id, es[2].problemId);
assert.equal(weekStats(0, es).attempted, 3);
assert.equal(weekStats(0, es).rate, 33);
assert.equal(weekStats(0, es).minutes, 115);
assert.equal(weekStats(1, es).attempted, 0);
assert.equal(weekStats(1, es).rate, 0);
assert.equal(dateString(dateAt('2026-09-07', 55)), '2026-11-01');
assert.equal(problemAt(6, 'python', []).title, '체육복');
assert.equal(problemAt(7, 'python', []).title, '전화번호 목록');
console.log(
  'PASS: 96 unique new problems, 16 review slots, review priority, Sunday schedule, weekly rates and dates',
);
