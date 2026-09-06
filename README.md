# daily pair — 두 사람의 8주 코딩 스터디

Python3 1문제 + MySQL 1문제를 매일 체크하는 **Next.js + Neon Postgres** 앱입니다. GitHub `main` 브랜치와 Vercel이 연결되어 있으며, 현재 배포 주소는 **<https://coding-test-gules.vercel.app>**입니다.

## 두 사람이 사용하는 방법

- 각자 자신의 이름을 선택하고 **개인 로그인 코드**로 접속합니다. 공개 회원가입은 없습니다.
- 풀이 기록, 주간 통계, 시작일, 알림 시간, CSV 내보내기, 타이머는 계정별로 분리됩니다.
- `함께하는 8주`에는 두 사람의 전체 완료 수와 오늘 완료 수만 표시합니다. 상대의 메모·아이디어·답안은 API에서도 내려주지 않습니다. 새로고침 버튼으로 상대 진도를 갱신합니다.
- 브라우저를 같이 쓰면 로그아웃하고 다른 사람의 코드로 접속하세요. 로그인은 기본 7일간 유지됩니다.
- 코드 변경 후 재배포하면 해당 사람의 기존 로그인도 무효가 됩니다. 두 사람의 `member-1` / `member-2` ID는 데이터 소유자이므로 이름을 바꿔도 순서를 바꾸지 마세요.
- 로그인 코드는 회원별로 하나씩만 전달합니다. 전체 `.env.local` 파일을 공유하지 마세요.

## Vercel 배포

### 1. 설정 파일 만들기

Node.js **22.13 이상인 22.x LTS**를 사용합니다. Vercel에서는 `package.json`의 Node.js 22.x 설정을 사용합니다.

```bash
npm ci
npm run setup
```

`.env.local`이 생성됩니다. 이미 있으면 덮어쓰지 않습니다. 파일에서 두 사람의 이름을 변경하세요. `AUTH_SECRET`과 서로 다른 로그인 코드는 안전한 난수로 생성되어 있습니다. 생성 파일은 Git에서 제외됩니다.

### 2. Neon 데이터베이스 연결

Vercel 프로젝트를 만들고 Storage / Marketplace에서 **Neon**을 연결하거나, 기존 Neon 프로젝트의 Postgres 연결 문자열을 사용합니다. 프로젝트 연결 시 생성되는 `DATABASE_URL`을 `.env.local`에도 넣으세요.

Vercel 환경 변수에는 다음 6개 변수를 등록합니다.

| 환경 변수 | 값 |
| --- | --- |
| `DATABASE_URL` | Neon의 `postgresql://...` 연결 문자열 |
| `AUTH_SECRET` | `npm run setup`이 생성한 서명용 비밀값 |
| `STUDY_MEMBER_1_NAME` | 첫 번째 사람의 표시 이름 |
| `STUDY_MEMBER_1_CODE` | 첫 번째 사람의 개인 로그인 코드 |
| `STUDY_MEMBER_2_NAME` | 두 번째 사람의 표시 이름 |
| `STUDY_MEMBER_2_CODE` | 두 번째 사람의 개인 로그인 코드 |

위 표의 **6개 변수**를 그대로 등록합니다. `NEXT_PUBLIC_` 접두사를 붙이지 마세요. Preview에도 로그인하려면 해당 환경에 별도로 설정하며, 테스트용 DB와 코드를 분리하는 편이 좋습니다.

### 3. 데이터베이스 준비

`.env.local`에 배포할 DB의 `DATABASE_URL`이 들어 있는지 확인한 뒤 한 번 실행합니다.

```bash
npm run db:migrate
```

명령은 `db/migrations/*.sql`을 순서대로 트랜잭션에 적용하고 적용 이력과 체크섬을 기록합니다. 재실행해도 이미 적용한 파일은 건너뜁니다. 적용된 파일은 수정하지 말고 새 마이그레이션을 추가하세요. 마이그레이션은 Vercel 빌드 중 자동 실행하지 않습니다.

### 4. 배포

이 저장소를 GitHub에 올리고 Vercel에서 Import합니다.

- Framework Preset: **Next.js**
- Root Directory: 저장소 루트
- Build Command: `npm run build`
- Install Command: `npm ci`
- Output Directory: Next.js 기본값 (별도 입력 없음)
- Node.js: **22.x**

이 저장소는 `git@github.com:UICHANLEE/coding-test.git`과 SSH로 연결되어 있습니다. Vercel CLI로 다시 설정하거나 배포하려면:

```bash
npm run vercel:configure
npm run db:migrate
npx vercel --prod
```

두 사람이 배포 URL을 열어 각자 로그인하면 됩니다. Vercel의 Deployment Protection으로 사이트가 팀원 전용이라면 상대도 접속할 수 있도록 접근 설정을 조정하거나 프로덕션 도메인을 공유하세요. 앱 자체 로그인은 계속 적용됩니다.

Vercel 프로젝트와 Neon 데이터베이스 연결, 환경 변수 등록, 원격 마이그레이션, 프로덕션 배포까지 완료했습니다. 로컬의 `STUDY_ACCESS_CODES.txt`에 두 사람에게 각각 전달할 로그인 코드가 저장되어 있으며 Git에는 포함되지 않습니다.

## 로컬 실행과 검증

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Lint는 앱 소스를 검사하며 수정하지 않은 UI 라이브러리 원본과 그 보조 훅은 제외합니다.

테스트는 실제 PostgreSQL 엔진을 사용하는 PGlite에서 두 계정의 같은 슬롯 저장, 사용자 ID 위조 방지, 개인 설정 분리, 상대 메모 비노출, 서명 쿠키, 만료, 로그인 시도 제한, CSV 이전을 검증합니다. 테스트 DB는 메모리에 생성되며 원격 DB를 변경하지 않습니다.

`npm run dev`에서 실제 로그인·저장을 사용하려면 `.env.local`에 Neon 연결과 계정 설정을 채우고 마이그레이션을 실행해야 합니다. 연결 정보가 없으면 설정 안내 화면을 보여주며 임시 브라우저 저장소에 기록을 저장하지 않습니다.

## 기존 Sites 기록 가져오기

기존 사이트의 **풀이 기록 → 내보내기**에서 CSV를 받습니다. 원래 코스 시작일과 가져올 계정을 명시합니다.

```bash
# 먼저 파일을 검증합니다. DB에 쓰지 않습니다.
npm run db:import -- --file /path/daily-pair-records.csv --member member-1 --start 2026-09-07
# 확인한 기록을 해당 계정에 저장합니다.
npm run db:import -- --file /path/daily-pair-records.csv --member member-1 --start 2026-09-07 --apply
```

기존 슬롯은 덮어쓰지 않습니다. 원래 기록의 날짜·소요 시간·자력/힌트/해설 구분·메모를 유지합니다. 기본 문제 목록에 없는 교체 문제는 `--problem-map /path/problems.json`으로 `{ "문제 이름": 12345 }` 형태의 ID 매핑을 제공하세요. 시작일이 대상 계정 설정과 다르면 중단합니다. 알림 시간은 `--reminder 21:00`으로 지정할 수 있습니다.

이전 Cloudflare 설정과 마이그레이션은 `docs/legacy-sites/`에 참고용으로 보존했습니다. 현재 Next.js 빌드에서 사용하지 않으며 기존 Sites 데이터베이스를 수정하지 않습니다.

## 학습 기능

- 신규 96문제 + 토요일 재풀이 16회, 56일 일정
- Python 45분 / SQL 25분 타이머; 새로고침 시 같은 계정의 타이머 복원
- 일요일 및 7–8주차 유형 숨기기
- 신규 시도 문제만 기준으로 주간 자력 정답률 계산
- 도움받은 문제·미해결 문제의 재풀이 관리
- 56일 캘린더 알림: `.ics`를 캘린더에 가져와야 알림이 활성화됩니다. 사이트 자체의 백그라운드 푸시는 아닙니다.

## 구조

- `app/`: Next.js 서버 페이지와 API 라우트
- `components/study-app.tsx`: 학습 화면, `components/login-form.tsx`: 두 계정 로그인
- `lib/server/auth.ts`: 서명 세션·개인 코드 검증, `handlers.ts`: 인증을 적용한 API
- `db/repository.ts`: 모든 개인 조회·저장에 `member_id` 조건 적용
- `db/migrations/`: PostgreSQL 스키마, `scripts/`: 설정·이전 도구

폰트는 기존 화면에서 사용한 Geist / Geist Mono를 로컬로 포함해 빌드 시 외부 폰트 다운로드가 필요하지 않습니다. 라이선스는 `app/fonts/`에 있습니다.

참고: [Vercel의 Next.js 배포](https://vercel.com/docs/frameworks/full-stack/nextjs), [Neon 서버리스 드라이버](https://neon.com/docs/serverless/serverless-driver).
