import type { Entry } from '../study';
export class InputError extends Error {}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('입력 내용을 확인해 주세요.');
  return value as Record<string, unknown>;
}
export function entryInput(value: unknown): Entry {
  const e = record(value);
  if (
    !Number.isInteger(e.day) ||
    Number(e.day) < 0 ||
    Number(e.day) > 55 ||
    !['python', 'sql'].includes(String(e.kind)) ||
    !Number.isInteger(e.minutes) ||
    Number(e.minutes) < 0 ||
    Number(e.minutes) > 600 ||
    !['self', 'hint', 'solution', 'unsolved'].includes(String(e.result)) ||
    !Number.isSafeInteger(e.problemId) ||
    Number(e.problemId) < 1 ||
    ['title', 'reason', 'idea', 'caution'].some(
      (k) => typeof e[k] !== 'string' || String(e[k]).length > 10000,
    ) ||
    !String(e.title).trim() ||
    String(e.title).length > 150
  )
    throw new InputError('풀이 기록의 입력값을 확인해 주세요.');
  // Whitelist fields. A supplied memberId/userId cannot affect record ownership.
  return {
    day: e.day as number,
    kind: e.kind as Entry['kind'],
    title: String(e.title).trim(),
    problemId: e.problemId as number,
    minutes: e.minutes as number,
    result: e.result as Entry['result'],
    reason: String(e.reason),
    idea: String(e.idea),
    caution: String(e.caution),
  };
}
export function settingsInput(value: unknown) {
  const e = record(value),
    start = e.start,
    reminder = e.reminder;
  if (
    typeof start !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !Number.isFinite(Date.parse(start)) ||
    new Date(start).toISOString().slice(0, 10) !== start ||
    new Date(start + 'T12:00:00Z').getUTCDay() !== 1 ||
    typeof reminder !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder)
  )
    throw new InputError(
      '시작일은 월요일, 알림은 올바른 시간을 선택해 주세요.',
    );
  return { start, reminder };
}
