# VanTien Study — Engineering Rules

- React + TypeScript strict, Tailwind CSS v4, Firebase Auth/Firestore/Hosting. Windows Node v24.12+ recommended.
- Keep a single task/event/focus source of truth in `src/stores/data-store.ts`, backed by service/repository methods. Never introduce separate hardcoded datasets as user history.
- A Task is different from a ScheduledSession and a FocusSession. Rescheduling never marks complete or overwrites original deadline.
- New accounts start empty. Optional study templates and 36-week roadmap must not pretend user completed anything.
- Always save linked task/event mutations atomically with Firestore batches/transactions where supported; protect demo local-only semantics.
- Focus clock uses elapsed timestamps; rendering interval is display-only. Never write to Firestore each second. Stable focus session ID prevents retries counting twice.
- Use `Asia/Ho_Chi_Minh` civil dates with `src/lib/schedule.ts`; avoid `.toISOString().slice(0,10)` for local day.
- Do not store passwords in localStorage/Firestore or invent Firebase project IDs. Username/password backed by Firebase Auth requires clear account-recovery caveats.
- Web Push and guaranteed locked-screen alarms are NOT implemented and MUST NOT be claimed unless server/mobile device tests demonstrate it.
- Before calling a feature finished, run TypeScript, build, tests, check both mobile and desktop; distinguish code written from deployment verified.
- No external paid service/billing/production deploy without explicit user permission.
