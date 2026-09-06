'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicMember, TeamProgress } from '@/lib/members';
import {
  ArrowUpRight,
  Braces,
  Database,
  Check,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  Flame,
  Target,
  Bell,
  ArrowRight,
  CircleCheck,
  NotebookPen,
  Download,
  X,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  topics,
  weekdays,
  dateAt,
  dateString,
  problemAt,
  weekStats,
  type Entry,
  type Kind,
} from '@/lib/study';
const labels = {
  self: '자력 해결',
  hint: '힌트 사용',
  solution: '해설 학습',
  unsolved: '미해결',
};
const kinds: Kind[] = ['python', 'sql'];
const initialStart = '2026-09-07';
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function StudyApp({ member }: { member: PublicMember }) {
  const [team, setTeam] = useState<TeamProgress[]>([]);
  const [teamBusy, setTeamBusy] = useState(false);
  const timerReady = useRef(false);
  const timerKey = `daily-pair-timer:${member.id}`;
  const [todayIso, setTodayIso] = useState(initialStart);
  const [tab, setTab] = useState('today'),
    [day, setDay] = useState(0),
    [entries, setEntries] = useState<Entry[]>([]),
    [start, setStart] = useState(initialStart),
    [reminder, setReminder] = useState('20:00'),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false),
    [edit, setEdit] = useState<Entry | null>(null),
    [settings, setSettings] = useState(false),
    [draftStart, setDraftStart] = useState(initialStart),
    [draftReminder, setDraftReminder] = useState('20:00'),
    [filter, setFilter] = useState('all'),
    [revealed, setRevealed] = useState<number[]>([]);
  const [timer, setTimer] = useState<{
      day: number;
      kind: Kind;
      elapsed: number;
      since: number | null;
    } | null>(null),
    [now, setNow] = useState(0);
  const todayIndex = Math.floor(
    (Date.parse(todayIso + 'T12:00:00') - Date.parse(start + 'T12:00:00')) /
      86400000,
  );
  const week = Math.floor(day / 7),
    dow = day % 7,
    date = dateAt(start, day),
    completed = entries.filter((e) => e.result !== 'unsolved'),
    dayEntries = entries.filter((e) => e.day === day),
    stats = weekStats(week, entries),
    isBlind = (dow === 6 || week >= 6) && !revealed.includes(day);
  const elapsed = timer
    ? timer.elapsed +
      (timer.since ? Math.max(0, Math.floor((now - timer.since) / 1000)) : 0)
    : 0;
  const limit = timer?.kind === 'sql' ? 25 * 60 : 45 * 60,
    remaining = Math.max(0, limit - elapsed);
  const reload = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/study', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.replace('/login');
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        entries: Entry[];
        settings: Record<string, string>;
        team: TeamProgress[];
      };
      setEntries(data.entries);
      setTeam(data.team);
      setTodayIso(dateString(new Date()));
      const s = data.settings.start || initialStart;
      setStart(s);
      setReminder(data.settings.reminder || '20:00');
      const i = Math.floor(
        (Date.parse(dateString(new Date()) + 'T12:00:00') -
          Date.parse(s + 'T12:00:00')) /
          86400000,
      );
      setDay(Math.max(0, Math.min(55, i)));
      setLoaded(true);
    } catch {
      setError(
        '기록을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
      );
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void reload();
      try {
        const t = JSON.parse(sessionStorage.getItem(timerKey) || 'null');
        if (
          t &&
          Number.isInteger(t.day) &&
          t.day >= 0 &&
          t.day < 56 &&
          kinds.includes(t.kind) &&
          Number.isFinite(t.elapsed) &&
          (t.since === null || Number.isFinite(t.since))
        ) {
          setTimer(t);
          setNow(Date.now());
        }
      } catch {}
      timerReady.current = true;
    });
    return () => {
      active = false;
    };
  }, [reload, timerKey]);
  useEffect(() => {
    try {
      if (timerReady.current)
        sessionStorage.setItem(timerKey, JSON.stringify(timer));
    } catch {
      /* Timer still works without session storage. */
    }
    if (!timer?.since) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer, timerKey]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  const saveEntry = useCallback(async (entry: Entry) => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      });
      if (r.status === 401) {
        window.location.replace('/login');
        return false;
      }
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      setEntries((old) => [
        ...old.filter((e) => !(e.day === entry.day && e.kind === entry.kind)),
        entry,
      ]);
      setNotice('풀이 기록을 저장했어요. 오늘도 한 걸음!');
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '저장하지 못했습니다. 다시 시도해 주세요.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: object;
              annotations: { readOnlyHint: boolean };
              execute: (
                input: unknown,
              ) => Promise<{ day: number; status: string }>;
            },
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'open_study_day',
          title: '학습일 열기',
          description:
            '1~56일 중 학습할 날짜를 표시합니다. 완료 기록은 변경하지 않습니다.',
          inputSchema: {
            type: 'object',
            properties: { day: { type: 'integer', minimum: 1, maximum: 56 } },
            required: ['day'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: unknown) => {
            const d = (input as { day: number })?.day;
            if (!Number.isInteger(d) || d < 1 || d > 56)
              throw new Error('day must be 1–56');
            setDay(d - 1);
            setTab('today');
            return { day: d, status: 'opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  async function refreshTeam() {
    setTeamBusy(true);
    try {
      const response = await fetch('/api/study', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.replace('/login');
        return;
      }
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { team: TeamProgress[] };
      setTeam(data.team);
    } catch {
      setNotice('함께한 현황을 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      setTeamBusy(false);
    }
  }
  async function logout() {
    if (saving) {
      setNotice('저장이 끝난 뒤 로그아웃해 주세요.');
      return;
    }
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      // Full navigation removes all private data and drafts from this document.
      window.location.replace('/login');
    } catch {
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.');
    }
  }
  function getProblem(kind: Kind) {
    const old = dayEntries.find((e) => e.kind === kind);
    return old
      ? {
          title: old.title,
          id: old.problemId,
          level: problemAt(day, kind, entries).level,
        }
      : problemAt(day, kind, entries);
  }
  function openRecord(kind: Kind) {
    const p = getProblem(kind),
      old = dayEntries.find((e) => e.kind === kind);
    setEdit(
      old || {
        day,
        kind,
        title: p.title,
        problemId: p.id,
        minutes:
          timer?.day === day && timer.kind === kind
            ? Math.max(1, Math.ceil(elapsed / 60))
            : 0,
        result: 'unsolved',
        reason: '',
        idea: '',
        caution: '',
      },
    );
    if (timer?.day === day && timer.kind === kind)
      setTimer({ ...timer, elapsed, since: null });
  }
  function handleBegin(kind: Kind, timestamp: number) {
    if (timer && timer.kind === kind && timer.day === day) {
      setNow(timestamp);
      setTimer({ ...timer, since: timer.since ? null : timestamp, elapsed });
    } else {
      if (timer?.since) {
        setNotice('진행 중인 타이머를 먼저 일시정지하거나 기록해 주세요.');
        return;
      }
      setNow(timestamp);
      setTimer({ day, kind, elapsed: 0, since: timestamp });
    }
  }
  function openSettings() {
    setDraftStart(start);
    setDraftReminder(reminder);
    setSettings(true);
  }
  async function saveSettings() {
    setSaving(true);
    try {
      const r = await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'settings',
          start: draftStart,
          reminder: draftReminder,
        }),
      });
      if (r.status === 401) {
        window.location.replace('/login');
        return false;
      }
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      setStart(draftStart);
      setReminder(draftReminder);
      setNotice('시작일과 알림 시간을 저장했어요.');
      setSettings(false);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function calendar() {
    if (new Date(draftStart + 'T12:00:00').getDay() !== 1) {
      setError('시작일은 월요일로 선택해 주세요.');
      return;
    }
    const dt =
      draftStart.replaceAll('-', '') +
      'T' +
      draftReminder.replace(':', '') +
      '00';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Daily Pair//Study//KO',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:daily-pair-' + member.id + '-' + draftStart + '@study',
      'DTSTAMP:' +
        new Date()
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, ''),
      'DTSTART;TZID=Asia/Seoul:' + dt,
      'DURATION:PT90M',
      'RRULE:FREQ=DAILY;COUNT=56',
      'SUMMARY:Python 1문제 + SQL 1문제 · daily pair',
      'DESCRIPTION:Python 35–45분 / MySQL 20–25분 / 풀이 정리 15–20분. ' +
        window.location.origin,
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:DISPLAY',
      'DESCRIPTION:오늘의 두 문제를 풀 시간이에요.',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    download(
      'daily-pair-8weeks.ics',
      lines.join('\r\n'),
      'text/calendar;charset=utf-8',
    );
    setNotice(
      '캘린더 파일을 받았어요. 캘린더 앱에서 열어 알림을 추가해 주세요.',
    );
  }
  function exportRecords() {
    const header = [
      '날짜',
      '문제',
      '언어',
      '소요 시간(분)',
      '결과',
      '막힌 이유',
      '핵심 아이디어',
      '복잡도·주의점',
      '구분',
    ];
    const rows = entries
      .slice()
      .sort((a, b) => a.day - b.day)
      .map((e) => [
        dateString(dateAt(start, e.day)),
        e.title,
        e.kind,
        e.minutes,
        labels[e.result],
        e.reason,
        e.idea,
        e.caution,
        e.day % 7 === 5 ? '재풀이' : '신규',
      ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(','),
      )
      .join('\r\n');
    download(
      'daily-pair-records.csv',
      '\uFEFF' + csv,
      'text/csv;charset=utf-8',
    );
  }
  let streak = 0;
  for (let d = Math.min(55, todayIndex); d >= 0; d--) {
    if (kinds.every((k) => completed.some((e) => e.day === d && e.kind === k)))
      streak++;
    else if (d !== todayIndex) break;
  }
  const review = entries.filter(
    (e) =>
      e.day % 7 !== 5 &&
      e.result !== 'self' &&
      !entries.some(
        (r) =>
          r.day > e.day &&
          r.day % 7 === 5 &&
          r.kind === e.kind &&
          r.problemId === e.problemId &&
          r.result === 'self',
      ),
  );
  return (
    <main className="app">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Braces size={24} />
          </span>
          daily<span className="brand-light">pair</span>
          <span className="brand-dot">.</span>
        </Link>
        <span className="top-caption">작은 루틴, 단단한 실력</span>
        <div className="top-right">
          <span className="course-badge">8 WEEK CHALLENGE</span>
          <span className="member-label">{member.name}</span>
          <span className="avatar" aria-hidden="true">
            {member.name.slice(0, 1)}
          </span>
          <button className="logout-button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>
      <div className="workspace">
        <div className="heading">
          <div>
            <div className="eyebrow">MY CODING ROUTINE</div>
            <h1>
              오늘도, 두 문제씩<span>.</span>
            </h1>
            <p>스스로 떠올리고, 직접 구현하는 8주를 시작해요.</p>
          </div>
          <button
            className="button light"
            onClick={openSettings}
            disabled={!loaded}
          >
            <CalendarDays size={17} />
            {start.replaceAll('-', '. ')} 시작
          </button>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList variant="line" className="study-tabs">
            {[
              ['today', '오늘의 학습'],
              ['roadmap', '8주 로드맵'],
              ['records', '풀이 기록'],
              ['report', '주간 리포트'],
            ].map(([v, t]) => (
              <TabsTrigger key={v} value={v}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {error && (
          <div role="alert" className="error-banner">
            {error} {!loaded && <button onClick={reload}>다시 불러오기</button>}
            <button aria-label="오류 닫기" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {!loaded && !error && (
          <output className="loading">학습 기록을 불러오고 있어요…</output>
        )}
        {notice && (
          <output className="toast">
            <CircleCheck size={18} />
            {notice}
          </output>
        )}
        <div className="main-grid">
          <section>
            {tab === 'today' && (
              <>
                <div className="section-title">
                  <h2>이번 주의 루틴</h2>
                  <div className="week-controls">
                    <button
                      aria-label="이전 주"
                      disabled={week === 0}
                      onClick={() => setDay(day - 7)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      {week + 1}주차 · {topics[week][2]}
                    </span>
                    <button
                      aria-label="다음 주"
                      disabled={week === 7}
                      onClick={() => setDay(day + 7)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="week-strip">
                  {weekdays.map((d, i) => {
                    const n = week * 7 + i;
                    return (
                      <button
                        aria-pressed={n === day}
                        className={n === day ? 'day selected' : 'day'}
                        onClick={() => setDay(n)}
                        key={d}
                      >
                        <span>{d}</span>
                        <b>{dateAt(start, n).getDate()}</b>
                        <div className="dots">
                          {kinds.map((k) => (
                            <i
                              key={k}
                              className={
                                completed.some(
                                  (e) => e.day === n && e.kind === k,
                                )
                                  ? 'done'
                                  : ''
                              }
                            />
                          ))}
                        </div>
                        <small>
                          {i === 5 ? '재풀이' : i === 6 ? '실전' : '새 문제'}
                        </small>
                      </button>
                    );
                  })}
                </div>
                <div className="section-title daily-title">
                  <div>
                    <h2>
                      {date.getMonth() + 1}월 {date.getDate()}일 {weekdays[dow]}
                      요일{' '}
                      {day === todayIndex && (
                        <span className="today-tag">TODAY</span>
                      )}
                    </h2>
                    <p>
                      {dow === 5
                        ? '해설 없이 다시 도전하는 두 문제'
                        : dow === 6
                          ? '유형을 가린 실전 두 문제'
                          : '새로운 문제 2개'}{' '}
                      · 약 80분
                    </p>
                  </div>
                  <span>
                    {dayEntries.filter((e) => e.result !== 'unsolved').length} /
                    2 완료
                  </span>
                </div>
                {dow === 5 && (
                  <div className="info-banner">
                    이번 주 도움받은 문제, 그다음 오래 걸린 문제를 추천해요.
                    풀이 기록에서 문제를 바꿀 수도 있어요.
                  </div>
                )}
                <div className="problem-grid">
                  {kinds.map((kind, i) => {
                    const p = getProblem(kind),
                      entry = dayEntries.find((e) => e.kind === kind),
                      active = timer?.day === day && timer.kind === kind;
                    return (
                      <article className={'problem-card ' + kind} key={kind}>
                        <div className="card-top">
                          <span className="language">
                            {i ? <Database size={18} /> : <Braces size={18} />}{' '}
                            {i ? 'SQL' : 'Python'}
                            <small>{i ? 'MySQL' : 'Python3'}</small>
                          </span>
                          <span
                            className={
                              'status ' +
                              (entry && entry.result !== 'unsolved'
                                ? 'complete'
                                : '')
                            }
                          >
                            {entry ? labels[entry.result] : '시작 전'}
                          </span>
                        </div>
                        <div className="problem-body">
                          <span className="level">
                            {isBlind ? 'BLIND TEST' : `Lv. ${p.level}`}
                          </span>
                          <h3>{p.title}</h3>
                          <p>
                            {isBlind
                              ? '유형을 직접 판단해 보세요'
                              : week === 0
                                ? i
                                  ? [
                                      '조건 · COUNT',
                                      '조회 · 정렬',
                                      'NULL',
                                      'MAX',
                                      'DISTINCT · COUNT',
                                      '재풀이',
                                      'GROUP BY',
                                    ][dow]
                                  : [
                                      '해시',
                                      '정렬 · 슬라이싱',
                                      '연속 중복 처리',
                                      '완전탐색',
                                      '집합',
                                      '재풀이',
                                      '그리디',
                                    ][dow]
                                : topics[week][i]}
                          </p>
                          <div className="time-label">
                            <Clock3 size={15} />
                            {i ? '20–25' : '35–45'}분 권장
                          </div>
                        </div>
                        <div className="card-footer">
                          <button
                            className="button primary"
                            disabled={!loaded}
                            onClick={() => handleBegin(kind, Date.now())}
                          >
                            {active && timer.since ? (
                              <Pause size={15} />
                            ) : (
                              <Play size={15} />
                            )}{' '}
                            {active
                              ? timer.since
                                ? '일시정지'
                                : '이어서 풀기'
                              : '풀이 시작'}
                          </button>
                          <a
                            className="icon-button"
                            aria-label={`${p.title} 프로그래머스에서 열기`}
                            href={`https://school.programmers.co.kr/learn/courses/30/lessons/${p.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ArrowUpRight size={20} />
                          </a>
                        </div>
                        <button
                          className="record-action"
                          disabled={!loaded}
                          onClick={() => openRecord(kind)}
                        >
                          <NotebookPen size={14} />
                          {entry ? '풀이 기록 수정' : '풀이 결과 기록'}
                          <ChevronRight size={14} />
                        </button>
                      </article>
                    );
                  })}
                </div>
                {timer && (
                  <div
                    className={
                      'timer-bar ' + (remaining === 0 ? 'time-up' : '')
                    }
                  >
                    <div>
                      <span>
                        {timer.kind === 'python' ? 'Python' : 'MySQL'} ·{' '}
                        {timer.day + 1}일차 집중 시간
                      </span>
                      <strong>
                        {String(Math.floor(remaining / 60)).padStart(2, '0')}
                        <i>:</i>
                        {String(remaining % 60).padStart(2, '0')}
                      </strong>
                    </div>
                    <div className="timer-actions">
                      <button
                        className="icon-button"
                        aria-label={
                          timer.since ? '타이머 일시정지' : '타이머 재개'
                        }
                        onClick={() => {
                          setNow(Date.now());
                          setTimer({
                            ...timer,
                            elapsed,
                            since: timer.since ? null : Date.now(),
                          });
                        }}
                      >
                        {timer.since ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button
                        className="button light"
                        onClick={() => {
                          setDay(timer.day);
                          setTab('today');
                          setTimer({ ...timer, elapsed, since: null });
                          setNotice(
                            '타이머를 멈췄어요. 해당 문제의 풀이 결과를 기록해 주세요.',
                          );
                        }}
                      >
                        기록하기
                      </button>
                    </div>
                    {remaining === 0 && (
                      <output>
                        제한 시간이 끝났어요. 막힌 지점을 먼저 적고, 힌트부터
                        확인해 보세요.
                      </output>
                    )}
                  </div>
                )}
                <div className="reflection">
                  <span className="reflection-icon">
                    <NotebookPen size={21} />
                  </span>
                  <div>
                    <h3>풀이의 마지막은, 나만의 언어로.</h3>
                    <p>
                      막힌 이유와 핵심 아이디어를 기록해요. 15–20분이면
                      충분해요.
                    </p>
                  </div>
                  <span className="reflection-count">
                    {
                      dayEntries.filter((e) => e.idea.trim() || e.reason.trim())
                        .length
                    }
                    /2
                  </span>
                </div>
                {isBlind && (
                  <button
                    className="text-button"
                    onClick={() => setRevealed([...revealed, day])}
                  >
                    풀이를 마쳤어요 · 유형 확인
                  </button>
                )}
              </>
            )}
            {tab === 'roadmap' && (
              <>
                <div className="section-title">
                  <h2>8주, 한눈에 보기</h2>
                  <span>신규 96문제 · 재풀이 16회</span>
                </div>
                <div className="roadmap-list">
                  {topics.map((t, w) => (
                    <button
                      key={w}
                      className={'roadmap-row ' + (week === w ? 'current' : '')}
                      onClick={() => {
                        setDay(w * 7);
                        setTab('today');
                      }}
                    >
                      <span className="week-number">
                        {String(w + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3>
                          {t[2]} <small>{w + 1}주차</small>
                        </h3>
                        <p>
                          <b>PY</b> {t[0]}
                        </p>
                        <p>
                          <b>SQL</b> {t[1]}
                        </p>
                        <small>{t[3]}</small>
                        <Progress
                          value={
                            (completed.filter(
                              (e) => Math.floor(e.day / 7) === w,
                            ).length /
                              14) *
                            100
                          }
                        />
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
                <div className="info-banner">
                  Lv.2 자력 해결이 우선이에요. Lv.3·SQL Lv.4가 부담스럽다면 풀이
                  기록의 ‘문제 변경’에서 취약 유형의 문제로 교체하세요. 6주차
                  SQL은 가능한 문제를 윈도 함수로도 풀어보세요.
                </div>
              </>
            )}
            {tab === 'records' && (
              <>
                <div className="section-title">
                  <h2>
                    나의 풀이 노트{' '}
                    <span className="count-badge">{entries.length}</span>
                  </h2>
                  <button
                    className="button light"
                    onClick={exportRecords}
                    disabled={!entries.length}
                  >
                    <Download size={15} />
                    내보내기
                  </button>
                </div>
                <Tabs
                  value={filter}
                  onValueChange={(v) => setFilter(String(v))}
                >
                  <TabsList className="record-filters">
                    <TabsTrigger value="all">전체</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="sql">SQL</TabsTrigger>
                    <TabsTrigger value="review">
                      재풀이 필요 {review.length}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="record-list">
                  {(filter === 'review'
                    ? review
                    : entries.filter(
                        (e) => filter === 'all' || e.kind === filter,
                      )
                  )
                    .slice()
                    .sort((a, b) => b.day - a.day)
                    .map((e) => (
                      <button
                        className="record-row"
                        key={`${e.day}-${e.kind}`}
                        onClick={() => setEdit({ ...e })}
                      >
                        <span className={'record-icon ' + e.kind}>
                          {e.kind === 'python' ? (
                            <Braces size={20} />
                          ) : (
                            <Database size={20} />
                          )}
                        </span>
                        <div>
                          <span className="record-meta">
                            {dateString(dateAt(start, e.day))} ·{' '}
                            {e.kind === 'python' ? 'Python3' : 'MySQL'}
                            {e.day % 7 === 5 ? ' · 재풀이' : ''}
                          </span>
                          <h3>{e.title}</h3>
                          <p>
                            {e.idea || e.reason || '아직 풀이 메모가 없어요.'}
                          </p>
                        </div>
                        <span className="record-result">
                          <b className={e.result === 'self' ? 'green' : ''}>
                            {labels[e.result]}
                          </b>
                          <small>{e.minutes}분</small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                </div>
                {(filter === 'review'
                  ? review
                  : entries.filter((e) => filter === 'all' || e.kind === filter)
                ).length === 0 && (
                  <div className="empty-state">
                    <NotebookPen size={36} />
                    <h3>
                      {filter === 'review'
                        ? '아직 재풀이할 문제가 없어요'
                        : '첫 번째 풀이를 기다리고 있어요'}
                    </h3>
                    <p>오늘의 문제를 풀고 접근 방법과 배운 점을 남겨보세요.</p>
                    <button
                      className="button primary"
                      onClick={() => setTab('today')}
                    >
                      오늘의 학습으로
                    </button>
                  </div>
                )}
              </>
            )}
            {tab === 'report' && (
              <>
                <div className="section-title">
                  <h2>{week + 1}주차 리포트</h2>
                  <div className="week-controls">
                    <button
                      aria-label="이전 주 리포트"
                      disabled={week === 0}
                      onClick={() => setDay(day - 7)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span>{dateString(dateAt(start, week * 7))}</span>
                    <button
                      aria-label="다음 주 리포트"
                      disabled={week === 7}
                      onClick={() => setDay(day + 7)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
                <div className="metrics">
                  <div>
                    <Target size={20} />
                    <span>신규 자력 정답률</span>
                    <strong>{stats.attempted ? stats.rate + '%' : '—'}</strong>
                    <small>시도한 신규 {stats.attempted} / 12문제</small>
                  </div>
                  <div>
                    <Clock3 size={20} />
                    <span>이번 주 풀이 시간</span>
                    <strong>
                      {stats.minutes}
                      <small> 분</small>
                    </strong>
                    <small>신규 문제 기록 기준</small>
                  </div>
                </div>
                <div className="report-panel">
                  <h3>시간 안에, 스스로 풀었나요?</h3>
                  {kinds.map((k) => {
                    const es = stats[k];
                    const avg = es.length
                      ? Math.round(
                          es.reduce((s, e) => s + e.minutes, 0) / es.length,
                        )
                      : 0;
                    return (
                      <div className="report-line" key={k}>
                        <b>{k === 'python' ? 'Python' : 'SQL'}</b>
                        <div>
                          <Progress
                            value={Math.min(
                              100,
                              (avg / (k === 'python' ? 45 : 25)) * 100,
                            )}
                          />
                        </div>
                        <span>{es.length ? avg + '분' : '기록 없음'}</span>
                      </div>
                    );
                  })}
                  <p>
                    자력 해결한 문제의 평균 시간 · 목표 Python 약 40분 / SQL
                    20–25분
                  </p>
                </div>
                <div className="report-panel recommendation">
                  <h3>다음 주, 이렇게 이어가요</h3>
                  <p>
                    {stats.attempted < 12
                      ? '아직 주간 학습이 진행 중이에요. 일요일까지 신규 12문제를 기록한 뒤 진도를 조정해요.'
                      : stats.rate < 50
                        ? '취약 유형을 한 번 더. 다음 주 신규 문제 일부를 막혔던 유형의 다른 문제로 바꿔보세요.'
                        : stats.rate >= 80 &&
                            stats.python.every((e) => e.minutes <= 40) &&
                            stats.sql.every((e) => e.minutes <= 25)
                          ? '한 단계 더 도전해도 좋아요. 자력 정답률과 풀이 시간이 안정적이니 어려운 문제를 하나 추가해 보세요.'
                          : '현재 속도를 유지해요. 계획대로 진행하며 시간이 오래 걸린 문제를 다시 풀어보세요.'}
                  </p>
                  <div className="report-thresholds">
                    <span>50% 미만 · 취약 유형 보강</span>
                    <span>50–80% · 계획 유지</span>
                    <span>80% 이상 + 시간 여유 · 난이도 ↑</span>
                  </div>
                </div>
              </>
            )}
          </section>
          <aside>
            <div className="journey">
              <span className="eyebrow">YOUR JOURNEY</span>
              <div className="journey-head">
                <h2>
                  하루의 작은 성취가
                  <br />
                  8주 뒤의 실력으로.
                </h2>
                <span>↗</span>
              </div>
              <div className="journey-numbers">
                <strong>
                  {String(week + 1).padStart(2, '0')}
                  <span> / 08 주</span>
                </strong>
                <b>{Math.round((completed.length / 112) * 100)}%</b>
              </div>
              <Progress value={(completed.length / 112) * 100} />
              <p>
                신규 {completed.filter((e) => e.day % 7 !== 5).length}/96문제 ·
                재풀이 {completed.filter((e) => e.day % 7 === 5).length}/16회
              </p>
              <div className="journey-stats">
                <div>
                  <Flame size={18} />
                  <b>{streak}일</b>
                  <small>연속 학습</small>
                </div>
                <div>
                  <CircleCheck size={18} />
                  <b>{completed.length}개</b>
                  <small>완료한 문제</small>
                </div>
              </div>
            </div>
            <div className="team-card">
              <div className="section-title">
                <h3>함께하는 8주</h3>
                <button
                  className="team-refresh"
                  aria-label="두 사람의 현황 새로고침"
                  disabled={teamBusy}
                  onClick={refreshTeam}
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              {team.map((person) => (
                <div className="team-person" key={person.id}>
                  <span className="avatar">{person.name.slice(0, 1)}</span>
                  <div>
                    <b>
                      {person.name}
                      {person.id === member.id && <small>나</small>}
                    </b>
                    <p>
                      완료{' '}
                      {person.id === member.id
                        ? completed.length
                        : person.completed}{' '}
                      / 112개
                    </p>
                  </div>
                  <span className="team-today">
                    오늘{' '}
                    {person.id === member.id
                      ? completed.filter((e) => e.day === todayIndex).length
                      : person.todayCompleted}
                    /2
                  </span>
                </div>
              ))}
              <p className="team-note">서로의 완료 현황만 공유해요.</p>
            </div>
            <div className="rule-card">
              <div className="section-title">
                <h3>
                  <Target size={18} />
                  오늘의 원칙
                </h3>
                <span>0{dow === 5 ? 3 : dow === 6 ? 2 : 1}</span>
              </div>
              <b>
                {dow === 5
                  ? '기억이 아닌, 이해로 다시 풀기.'
                  : dow === 6
                    ? '유형은 가리고, 시간은 지키고.'
                    : '정답보다, 스스로 생각한 시간.'}
              </b>
              <p>
                {dow === 5
                  ? '해설을 닫고 처음부터 구현해요. 재풀이에서도 힌트를 봤다면 솔직하게 기록해 주세요.'
                  : '제한 시간까지는 검색과 해설 없이 도전해요. 막혔다면 시도한 접근부터 적어보세요.'}
              </p>
              <div className="rule-bottom">
                도움받은 문제는 토요일에 다시 <RotateCcw size={15} />
              </div>
            </div>
            <button
              className="reminder"
              onClick={openSettings}
              disabled={!loaded}
            >
              <span className="bell-icon">
                <Bell size={19} />
              </span>
              <div>
                <b>매일 잊지 않도록</b>
                <p>{reminder} · 캘린더 알림 설정</p>
              </div>
              <ChevronRight size={18} />
            </button>
            <button
              className="text-button today-shortcut"
              onClick={() => {
                setDay(Math.max(0, Math.min(55, todayIndex)));
                setTab('today');
              }}
            >
              오늘 날짜로 돌아가기 <ArrowRight size={14} />
            </button>
          </aside>
        </div>
        <footer>
          <span>
            <span className="brand-dot">●</span> 매일 조금씩, 내 힘으로.
          </span>
          <span>
            <a
              href="https://school.programmers.co.kr/learn/challenges?tab=algorithm_practice_kit"
              target="_blank"
              rel="noreferrer"
            >
              Python3 Kit ↗
            </a>{' '}
            &{' '}
            <a
              href="https://school.programmers.co.kr/learn/challenges?tab=sql_practice_kit"
              target="_blank"
              rel="noreferrer"
            >
              MySQL Kit ↗
            </a>{' '}
            · 둘이 함께하는 스터디
          </span>
        </footer>
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v && !saving) setEdit(null);
        }}
      >
        <DialogContent className="study-dialog">
          <DialogTitle>풀이를 나의 것으로</DialogTitle>
          <DialogDescription>
            {edit?.kind === 'python' ? 'Python3' : 'MySQL'} ·{' '}
            {edit ? dateString(dateAt(start, edit.day)) : ''}
            {edit && edit.day % 7 === 5 ? ' · 재풀이 결과' : ''}
          </DialogDescription>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await saveEntry(edit)) {
                  setEdit(null);
                  if (timer?.day === edit.day && timer.kind === edit.kind)
                    setTimer(null);
                }
              }}
            >
              <h3>{edit.title}</h3>
              <details className="change-problem">
                <summary>
                  문제 변경 · 취약 유형으로 교체하거나 재풀이 선택
                </summary>
                <p>
                  프로그래머스 문제 URL의 마지막 숫자가 문제 ID예요. 신규 문제는
                  이미 푼 문제와 겹치지 않게 선택하세요.
                </p>
                <label>
                  문제 이름
                  <input
                    required
                    value={edit.title}
                    maxLength={150}
                    onChange={(e) =>
                      setEdit({ ...edit, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  프로그래머스 문제 ID
                  <input
                    type="number"
                    min="1"
                    required
                    value={edit.problemId}
                    onChange={(e) =>
                      setEdit({ ...edit, problemId: +e.target.value })
                    }
                  />
                </label>
              </details>
              <label>
                소요 시간 <span className="muted">분 · 정리 시간 제외</span>
                <input
                  type="number"
                  required
                  min="0"
                  max="600"
                  value={edit.minutes}
                  onChange={(e) =>
                    setEdit({ ...edit, minutes: +e.target.value })
                  }
                />
              </label>
              <fieldset>
                <legend>어떻게 풀었나요?</legend>
                <RadioGroup
                  value={edit.result}
                  onValueChange={(v) =>
                    setEdit({ ...edit, result: v as Entry['result'] })
                  }
                  className="result-options"
                >
                  {Object.entries(labels).map(([v, t]) => (
                    <label key={v}>
                      <RadioGroupItem value={v} />
                      {t}
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
              <p className="form-hint">
                힌트·해설·미해결 문제는 재풀이 목록에 남아요. 자력 정답률에는
                포함되지 않아요.
              </p>
              <label>
                막힌 이유 · 시도한 접근
                <textarea
                  placeholder="어떤 접근을 시도했고, 어디에서 막혔나요?"
                  value={edit.reason}
                  maxLength={10000}
                  onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
                />
              </label>
              <label>
                핵심 아이디어
                <textarea
                  placeholder="다음에 이 문제를 만나면 가장 먼저 떠올릴 것은?"
                  value={edit.idea}
                  maxLength={10000}
                  onChange={(e) => setEdit({ ...edit, idea: e.target.value })}
                />
              </label>
              <label>
                {edit.kind === 'python'
                  ? '자료구조 · 시간복잡도 · 반례'
                  : '집계 단위 · 조인 중복 · NULL'}
                <textarea
                  placeholder={
                    edit.kind === 'python'
                      ? '자료구조를 선택한 근거와 경계 조건을 적어요.'
                      : '한 행이 무엇을 뜻하는지, 중복과 NULL을 확인해요.'
                  }
                  value={edit.caution}
                  maxLength={10000}
                  onChange={(e) =>
                    setEdit({ ...edit, caution: e.target.value })
                  }
                />
              </label>
              <div className="dialog-actions">
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                <button className="button primary" disabled={saving}>
                  {saving ? '저장 중…' : '기록 저장'}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={settings}
        onOpenChange={(v) => {
          if (!saving) setSettings(v);
        }}
      >
        <DialogContent className="study-dialog settings-dialog">
          <DialogTitle>나의 스터디 루틴</DialogTitle>
          <DialogDescription>
            8주 일정과 매일 공부할 시간을 설정해요.
          </DialogDescription>
          <label>
            시작일
            <input
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              required
            />
          </label>
          <p className="form-hint">
            월요일을 선택하세요. 시작일을 바꾸면 기존 기록도 학습 일차에 맞춰
            이동해요.
          </p>
          <label>
            매일 알림 시간 · 한국 시간
            <input
              type="time"
              value={draftReminder}
              onChange={(e) => setDraftReminder(e.target.value)}
              required
            />
          </label>
          <div className="calendar-info">
            <Bell size={20} />
            <p>
              캘린더 파일을 열어 56일 알림을 등록하세요. 사이트를 닫아도
              캘린더에서 알려줘요. 알림을 수정했다면 기존 일정을 지운 뒤 다시
              등록하세요.
            </p>
          </div>
          <button className="button light" onClick={calendar}>
            <Download size={16} />
            8주 알림 캘린더 받기
          </button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            className="button primary"
            disabled={saving || !draftStart || !draftReminder}
            onClick={saveSettings}
          >
            {saving ? '저장 중…' : '설정 저장'}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
