# AGENTS.md

Instructions for AI coding agents working in this project.

Do not add AI attribution to commits or pull requests, including AI
`Co-Authored-By` trailers or generated-by signatures. Preserve genuine human
attribution.

## What this is

A secondhand clothing marketplace frontend (Vinted-style): browse, publish,
favorite, and buy used clothing items, with Stripe checkout. This is the
frontend only; the API lives in a separate backend repository.

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform
features, and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability:
  untrusted input, auth/session/ownership, shared persisted data, destructive
  operations, payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture,
  persisted data, interoperability, a real security boundary, or cost.
  Otherwise choose the simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss
  prevention, accessibility, explicit security requirements, configured tests,
  or project rules.

## Coding conventions

- React function components only, one per file, plain `useState`/`useEffect`
  for state and data fetching, no global state library.
- Components/pages: `src/components/Name/Name.jsx` or
  `src/pages/Name/Name.jsx`, each with a matching `.css` file in the same
  folder. Routes are declared in `src/App.jsx` with `react-router` v7.
- Plain CSS per component/page; no CSS framework or CSS-in-JS.
- `axios` for HTTP calls against `import.meta.env.VITE_API_URL`; the auth
  token is stored via `js-cookie` and sent as `Authorization: Bearer <token>`.
- Never hard-code a secret or API host in a component; use `.env`
  (`import.meta.env.*`), which is git-ignored.
- UI copy is French; keep new UI text French to match the existing app.
- No em dashes (U+2014) in generated content (docs, comments, commit
  messages). Use a hyphen for `term - description`, or rephrase with commas,
  parentheses, or a colon.
- Comment the why, not the what; delete comments that just restate the code.

## Commands

This is a Vite + React project (no test runner configured yet).

- Dev server: `yarn dev` (http://localhost:5173)
- Build: `yarn build`
- Preview production build: `yarn preview`
- Lint: `yarn lint`
- Verify: `yarn verify` (build; runs in GitHub Actions on pull requests and pushes to `master`)

Testing is opt-in and not yet set up in this project.
