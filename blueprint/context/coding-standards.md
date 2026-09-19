# Coding Standards

> Rewritten by `/adopt` from the real project code (React + Vite, no
> TypeScript, no CSS framework, no backend in this repo). Edit as conventions
> evolve.

## React

- Functional components only (no class components), one component per file.
- Local state via `useState`; side effects (data fetching) via `useEffect`.
- No global state library; auth/session state currently lives in `App.jsx`
  and is threaded down via props (`handleToken`, `search`/`setSearch`).
- Keep components focused - one job per component.

## File Organization

- Components: `src/components/ComponentName/ComponentName.jsx` +
  `ComponentName.css` in the same folder.
- Pages: `src/pages/PageName/PageName.jsx` + `PageName.css` in the same folder.
- Images and static assets: `src/assets/images/`.
- Routes are declared in `src/App.jsx` with `react-router` v7
  (`<Routes>`/`<Route>`), not file-based routing.

## Naming

- Components and their folders: PascalCase (`Header/Header.jsx`).
- Functions and variables: camelCase.
- UI copy is French; keep new UI text French to match the existing app.

## Styling

- Plain CSS per component/page, imported directly (`import './Home.css'`).
- No CSS framework or CSS-in-JS; no inline `style` props in existing code.
- A shared `container` class wraps page content; reuse it rather than adding
  a new wrapper convention.

## Data Fetching

- `axios` for all HTTP calls, base URL from `import.meta.env.VITE_API_URL`.
- Auth token stored in a cookie via `js-cookie` and sent as
  `Authorization: Bearer <token>` on authenticated requests.
- No request/response interceptor exists yet; each call handles its own
  try/catch. (Build-plan item 11 introduces a shared refresh interceptor -
  once built, prefer it over ad hoc try/catch for authenticated calls.)
- Never call a hard-coded external API URL in a page/component; always go
  through `VITE_API_URL` (see build-plan item 8, which fixes the one existing
  exception in `CheckoutForm.jsx`).

## Error Handling

- Current pattern: `try/catch` around the axios call, logging
  `error.message` / `error.response.data`, and setting a local `error` state
  string shown in the form. This breaks when `error.response` is undefined -
  guard with `error.response?.data?.message` until the shared error component
  (build-plan item 8) replaces this per-form duplication.
- Prefer the shared error-display component once it exists, instead of a new
  bespoke `error` state per form.

## Environment

- Secrets and environment-specific values (API base URL, Stripe publishable
  key) belong in `.env` (already git-ignored), read via `import.meta.env.*`.
  Never hard-code a key or API host directly in a component.

## Testing

The blueprint installs no test runner; testing is opt-in at the project level,
because the overlay can't know your stack. Adding unit testing is an explicit
setup task the AI can do through the normal workflow, either as a build-plan item
or with `/tests`. The setup should choose the stack-native runner, wire the
scripts or commands, add a small example test, and update the Commands section
of `AGENTS.md`.

When `AGENTS.md` declares a `Verify` command, treat it as the umbrella automated
gate. It combines only the checks this project actually has, in this order when
available: typecheck, tests, then build. The command does not enable an absent
test runner or replace focused evidence. It gives local work and optional CI one
exact command to run. `/ci` owns Verify and CI setup. `/tests` adds the real test
command to Verify when it already exists, but never creates CI only because
testing was configured.

**The opt-in switch is one signal: a `test` command in the Commands section of
`AGENTS.md`.** Declare one and **tests become a gate for logic-bearing steps**,
not an optional extra; leave it out and the loop verifies logic with the evidence
it already uses (run it, a screenshot, the build). Adding the runner is itself a
deliberate step, never a silent mid-step install. This is the single definition
of the switch; the skills and `ai-interaction.md` only point back here.

- **What to test (the scope rule):** pure logic where a wrong answer is possible -
  parsers, formatters, validators, id/slug builders, server actions. These have
  assertable inputs and outputs and real edge cases (empty, missing, malformed).
- **What not to test:** UI components and integration-level surfaces (render or
  export routes, anything driving a real browser or external service). Verify those
  with a screenshot and the build, not brittle unit tests.
- **The gate (when a runner is configured):** a build step that adds in-scope logic
  must ship a passing test in the same reviewable diff. The project's test command
  must be green before the step is approved, before any checkpoint commit, and
  before `/complete` merges. UI and integration-only steps are exempt and ride on
  screenshot plus build evidence.
- **When it's named:** the `/feature` spec's Testing section predicts the coverage,
  `/implement` writes the test with the step, and if a step surfaces logic the spec
  didn't foresee, add a focused test then.
- An empty suite should fail, not pass, so "no tests ran" never looks like "passed".
- Test files live next to source files (for example `feature.test.ts`).
- Run them via the project's test command (see Commands in `AGENTS.md`), not a
  hardcoded tool name.

Stack binding (swap for yours): a TypeScript app uses Vitest, `vi.mock()` for
external dependencies (Prisma, Clerk, etc.), and `vi.useFakeTimers()` for
time-dependent logic; a Python app would use pytest; a Go app `go test`.

## Browser Verification

For UI and integration behavior, prefer real browser evidence over reading the
code and assuming it works.

- Browser automation is separately opt-in through `/tests browser`. That setup
  reuses a compatible runner or prefers Playwright for supported projects, then
  documents the exact command as `Browser tests` in `AGENTS.md`.
- When `Browser tests` is declared, add focused coverage for stable behavioral
  done-whens when it is proportionate, and run the documented command during
  `/check`. Do not assume it proves visual fidelity, real authenticated-profile
  behavior, browser chrome, or another claim the test does not observe.
- If no Browser tests command is declared, do not add a runner silently in the
  middle of an unrelated feature. Use the available dev server, browser
  screenshots, build output, API output, or manual evidence instead.
- Browser tests are not part of the default Verify command or CI unless the user
  separately chooses that slower gate.
- Browser evidence is especially important for flows that click, type, submit,
  navigate, download files, render complex layouts, or depend on client-side
  state.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
