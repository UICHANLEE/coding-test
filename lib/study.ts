export type Kind = 'python' | 'sql';
export type Problem = { title: string; id: number; level: number };
export type Entry = {
  day: number;
  kind: Kind;
  title: string;
  problemId: number;
  minutes: number;
  result: 'self' | 'hint' | 'solution' | 'unsolved';
  reason: string;
  idea: string;
  caution: string;
};
export const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
export const topics = [
  [
    '문자열 · 리스트 · 정렬 · 해시 기초',
    'SELECT · WHERE · ORDER BY · NULL',
    '기초 다지기',
    'Lv.1 중심으로 현재 실력 확인',
  ],
  [
    '해시 · 집합 · 완전탐색',
    '집계함수 · GROUP BY · HAVING',
    '빠짐없이, 정확하게',
    '반복문과 집계 조건을 정확하게 구현',
  ],
  [
    '스택 · 큐 · 힙',
    'INNER / LEFT JOIN',
    '자료구조의 힘',
    '자료구조 선택과 조인 중복 이해',
  ],
  [
    'DFS · BFS',
    '서브쿼리 · EXISTS',
    '탐색의 시작',
    '탐색과 조건 분해에 익숙해지기',
  ],
  [
    '그리디 · 이분탐색',
    'CASE · 날짜 · 문자열 함수',
    '선택의 근거',
    '풀이 근거와 경계 조건 설명',
  ],
  [
    'DP · 누적합 · 투포인터',
    '윈도 함수 · 순위 · 그룹별 최댓값',
    '반복을 줄이는 방법',
    '반복 계산 줄이기와 복합 쿼리',
  ],
  [
    'Lv.2 혼합 · 취약 유형 · Lv.3 입문',
    'JOIN + 집계 + 서브쿼리',
    '내 힘으로 유형 찾기',
    '유형 표시 없이 풀이 선택',
  ],
  [
    '실전형 혼합 문제',
    '실전형 혼합 문제',
    '실전처럼, 마지막 한 주',
    '시간 관리와 실수 줄이기',
  ],
];
const parse = (s: string): Problem[] =>
  s
    .split('\n')
    .filter(Boolean)
    .map((row) => {
      const [title, id, level] = row.split('|');
      return { title, id: +id, level: +level };
    });
export const python = parse(`완주하지 못한 선수|42576|1
K번째수|42748|1
같은 숫자는 싫어|12906|1
모의고사|42840|1
폰켓몬|1845|1
체육복|42862|1
전화번호 목록|42577|2
의상|42578|2
최소직사각형|86491|1
소수 찾기|42839|2
카펫|42842|2
피로도|87946|2
기능개발|42586|2
올바른 괄호|12909|2
프로세스|42587|2
다리를 지나는 트럭|42583|2
더 맵게|42626|2
주식가격|42584|2
타겟 넘버|43165|2
게임 맵 최단거리|1844|2
네트워크|43162|3
전력망을 둘로 나누기|86971|2
단어 변환|43163|3
미로 탈출|159993|2
구명보트|42885|2
큰 수 만들기|42883|2
조이스틱|42860|2
입국심사|43238|3
예산|12982|1
호텔 대실|155651|2
멀리 뛰기|12914|2
땅따먹기|12913|2
정수 삼각형|43105|3
연속된 부분 수열의 합|178870|2
숫자의 표현|12924|2
보석 쇼핑|67258|3
가장 큰 수|42746|2
H-Index|42747|2
튜플|64065|2
뉴스 클러스터링|17677|2
베스트앨범|42579|3
오픈채팅방|42888|2
주차 요금 계산|92341|2
택배상자|131704|2
롤케이크 자르기|132265|2
뒤에 있는 큰 수 찾기|154539|2
시소 짝꿍|152996|2
두 큐 합 같게 만들기|118667|2`);
export const sql = parse(`조건에 맞는 회원수 구하기|131535|1
동물의 아이디와 이름|59403|1
이름이 없는 동물의 아이디|59039|1
최댓값 구하기|59415|1
중복 제거하기|59408|2
동명 동물 수 찾기|59041|2
동물 수 구하기|59406|2
고양이와 개는 몇 마리 있을까|59040|2
입양 시각 구하기(1)|59412|2
진료과별 총 예약 횟수 출력하기|132202|2
가격대 별 상품 개수 구하기|131530|2
자동차 종류 별 특정 옵션이 포함된 자동차 수 구하기|151137|2
없어진 기록 찾기|59042|3
있었는데요 없었습니다|59043|3
오랜 기간 보호한 동물(1)|59044|3
보호소에서 중성화한 동물|59045|4
상품 별 오프라인 매출 구하기|131533|2
조건에 맞는 도서와 저자 리스트 출력하기|144854|2
오랜 기간 보호한 동물(2)|59411|3
즐겨찾기가 가장 많은 식당 정보 출력하기|131123|3
조건에 맞는 사용자와 총 거래금액 조회하기|164668|3
대여 기록이 존재하는 자동차 리스트 구하기|157341|3
5월 식품들의 총매출 조회하기|131117|4
취소되지 않은 진료 예약 조회하기|132204|4
이름에 el이 들어가는 동물 찾기|59047|2
NULL 처리하기|59410|2
중성화 여부 파악하기|59409|2
DATETIME에서 DATE로 형 변환|59414|2
자동차 대여 기록에서 장기/단기 대여 구분하기|151138|1
조건에 부합하는 중고거래 상태 조회하기|164672|2
카테고리 별 도서 판매량 집계하기|144855|3
식품분류별 가장 비싼 식품의 정보 조회하기|131116|4
조건별로 분류하여 주문상태 출력하기|131113|3
그룹별 조건에 맞는 식당 목록 출력하기|131124|4
조회수가 가장 많은 중고거래 게시판의 첨부파일 조회하기|164671|3
연도별 대장균 크기의 편차 구하기|299310|2
저자 별 카테고리 별 매출액 집계하기|144856|4
조건에 맞는 사용자 정보 조회하기|164670|3
대여 횟수가 많은 자동차들의 월별 대여 횟수 구하기|151139|3
서울에 위치한 식당 목록 출력하기|131118|4
특정 기간동안 대여 가능한 자동차들의 대여비용 구하기|157339|4
년, 월, 성별 별 상품 구매 회원 수 구하기|131532|4
조건에 맞는 도서 리스트 출력하기|144853|1
성분으로 구분한 아이스크림 총 주문량|133026|2
재구매가 일어난 상품과 회원 리스트 구하기|131536|2
헤비 유저가 소유한 장소|77487|3
대장균들의 자식의 수 구하기|299305|3
물고기 종류 별 대어 찾기|293261|3`);
export function dateAt(start: string, day: number) {
  const d = new Date(start + 'T12:00:00');
  d.setDate(d.getDate() + day);
  return d;
}
export function dateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function problemAt(day: number, kind: Kind, entries: Entry[]): Problem {
  const week = Math.floor(day / 7),
    dow = day % 7,
    pool = kind === 'python' ? python : sql;
  if (dow === 5) {
    const candidates = entries
      .filter(
        (e) => e.kind === kind && e.day >= week * 7 && e.day < week * 7 + 5,
      )
      .sort(
        (a, b) =>
          Number(a.result === 'self') - Number(b.result === 'self') ||
          b.minutes - a.minutes,
      );
    if (candidates[0])
      return {
        title: candidates[0].title,
        id: candidates[0].problemId,
        level: pool.find((p) => p.id === candidates[0].problemId)?.level || 2,
      };
    return pool[week * 6];
  }
  return pool[week * 6 + (dow === 6 ? 5 : dow)];
}
export function weekStats(week: number, entries: Entry[]) {
  const rows = entries.filter(
    (e) => Math.floor(e.day / 7) === week && e.day % 7 !== 5,
  );
  const self = rows.filter((e) => e.result === 'self');
  return {
    attempted: rows.length,
    rate: rows.length ? Math.round((self.length / rows.length) * 100) : 0,
    minutes: rows.reduce((n, e) => n + e.minutes, 0),
    python: self.filter((e) => e.kind === 'python'),
    sql: self.filter((e) => e.kind === 'sql'),
  };
}
