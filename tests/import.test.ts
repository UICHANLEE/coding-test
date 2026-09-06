import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, recordsFromCsv } from '../scripts/import-records.mjs';
const csv =
  '\uFEFF"날짜","문제","언어","소요 시간(분)","결과","막힌 이유","핵심 아이디어","복잡도·주의점"\r\n"2026-09-07","완주하지 못한 선수","python","40","힌트 사용","쉼표, 확인","두 줄\n메모와 ""인용""","O(n)"\r\n';
void test('legacy CSV retains quoted commas, newlines and result provenance', () => {
  assert.equal(parseCsv(csv).length, 2);
  const rows = recordsFromCsv(csv, '2026-09-07');
  assert.equal(rows[0].problemId, 42576);
  assert.equal(rows[0].result, 'hint');
  assert.equal(rows[0].reason, '쉼표, 확인');
  assert.equal(rows[0].idea, '두 줄\n메모와 "인용"');
});
void test('unknown problems and dates outside the course are not silently imported', () => {
  assert.throws(() =>
    recordsFromCsv(csv.replace('완주하지 못한 선수', 'custom'), '2026-09-07'),
  );
  assert.equal(
    recordsFromCsv(csv.replace('완주하지 못한 선수', 'custom'), '2026-09-07', {
      custom: 42576,
    })[0].problemId,
    42576,
  );
  assert.throws(() => recordsFromCsv(csv, '2026-09-14'));
  assert.throws(() => parseCsv('"unclosed'));
});
