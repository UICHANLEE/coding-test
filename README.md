# daily pair

A private eight-week Korean Python3 + MySQL study workspace. Starts Monday, 2026-09-07; the start date can be changed in settings.

- 48 unique new problems per language, verified against the official Programmers page titles.
- 56 daily slots; Saturday reviews prioritize assisted/unsolved work and then time spent.
- Sunday and weeks 7–8 hide topics and levels until revealed.
- Timestamp-based 45-minute Python and 25-minute SQL timer with session recovery.
- D1-backed records and settings. Results distinguish self, hint, solution and unsolved. CSV export included.
- Weekly self-solve rates exclude Saturday and include all attempted new problems in the denominator. Empty weeks have no displayed rate.
- Calendar export contains 56 daily 90-minute events with an on-time alarm, in Asia/Seoul. Users must import the ICS into a calendar. Saving the time does not itself enable background push notifications.
- A platform owner-only deployment is the access boundary: this is a single-person workspace, not a multiuser service. Do not broaden site access without adding per-user data isolation.

## Development

`npm install`, `npm run dev`, `npm run build`.

Schema: `db/schema.ts`; generate migrations with `npm run db:generate`. Local D1 migration can be applied using Wrangler with the generated `dist/server/wrangler.json` and `--persist-to` pointing to the project `.wrangler/state` directory. Production migrations ship through Sites.

## Verification

- `npx tsc --noEmit`
- `node --experimental-strip-types scripts/study.test.ts`
- `python3 scripts/check-links.py` verifies all 96 official problem titles (network required).
- `python3 scripts/check-api.py` tests a disposable day-56 SQL row on localhost:3000; run only against a local test database and remove its `__verification__` row after testing.
- Build validated through Vinext. Browser visual/click QA was not requested and was not performed.
- Optional WebMCP `open_study_day` is feature detected. No supported WebMCP execution context was available, so its browser registration contract has not been verified.
