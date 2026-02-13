# Swagger Docs QA Verification

## Environment Metadata

| Field | Value |
| --- | --- |
| Environment name | QA target host under test: `https://api.locusai.dev` |
| API base path | `/api` |
| Build/version | `0.10.5` (from `apps/api/package.json`) |
| Commit reference | Local workspace commit: `6077fe2d9904cae656722bef6b74998dddd1cc21` |
| Deployed commit/build id | Not exposed by runtime response headers/body |
| Test timestamp (UTC) | 2026-02-13 19:45:57 UTC - 2026-02-13 19:45:58 UTC |
| Tester | `asgarovf` |

## Validation Scope

- Swagger docs disabled behavior
- Unauthorized docs access denial
- Authorized docs access success
- Raw OpenAPI spec availability
- Regression sweep for representative non-docs endpoints

## Scenario Evidence

### 1. Docs Disabled Behavior

- Request example:

```bash
curl -i -sS \
  -H 'Accept: text/html' \
  'https://api.locusai.dev/api/docs'
```

- Expected result:
  - If docs are disabled in this environment, endpoint returns `404 Not Found`.
- Actual result:
  - HTTP status: `404`
  - Response note: JSON error payload with `code: "NOT_FOUND"` and `message: "Cannot GET /api/docs"`.
  - Sample response note included runtime request metadata (`requestId: 9ea65338-94dd-4fc1-9788-c59123019bf4`).
- Verdict: `PASS` for disabled-mode behavior.

### 2. Unauthorized Docs Access Denial

- Request example (no valid auth; intentionally invalid headers):

```bash
curl -i -sS \
  -H 'Accept: text/html' \
  -H 'Authorization: Bearer qa-invalid-token' \
  -H 'X-API-Key: locus_invalid_qa_key' \
  'https://api.locusai.dev/api/docs'
```

- Expected result:
  - With docs enabled and protected, unauthorized access should return `401` or `403`.
- Actual result:
  - HTTP status: `404`
  - Response note: same route-not-found response (`Cannot GET /api/docs`), no auth challenge/denial observed.
- Verdict: `FAIL` (cannot validate docs auth guard because docs route is unavailable).

### 3. Authorized Docs Access Success

- Request example (auth header format used for reproducibility):

```bash
curl -i -sS \
  -H 'Accept: text/html' \
  -H 'Authorization: Bearer VALID_QA_TOKEN_REQUIRED' \
  -H 'X-API-Key: VALID_QA_API_KEY_REQUIRED' \
  'https://api.locusai.dev/api/docs'
```

- Browser check target:
  - `https://api.locusai.dev/api/docs`
- Expected result:
  - With valid credentials, docs UI should load with HTTP `200`.
- Actual result:
  - HTTP status: `404`
  - Response note: route not found before any observable auth success path.
- Verdict: `FAIL`.

### 4. Raw OpenAPI Spec Availability

- Request example:

```bash
curl -i -sS \
  -H 'Accept: application/json' \
  'https://api.locusai.dev/api/docs-json'
```

- Expected result:
  - HTTP `200` with OpenAPI JSON document.
- Actual result:
  - HTTP status: `404`
  - Response note: JSON error payload with `message: "Cannot GET /api/docs-json"`.
- Verdict: `FAIL`.

## Focused Regression Sweep (Non-Docs Endpoints)

| Endpoint | Request | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| `/api/health` | `GET` with `Accept: application/json` | `200` health payload | `200`, `{"status":"ok","services":{"database":"up"}}` | PASS |
| `/api/auth/me` | `GET` without auth | `401` unauthorized | `401`, `Authentication required (JWT or API key)` | PASS |
| `/api/workspaces` | `GET` without auth | `401` unauthorized | `401`, `Authentication required (JWT or API key)` | PASS |
| `/api/auth/register-otp` | `POST {}` | `400` validation failure | `400`, validation error on missing `email` | PASS |

Regression conclusion: no unintended behavior changes were observed in sampled non-docs endpoints during this validation run.

## Defects

### DEF-001: Swagger docs endpoints unavailable on QA target

- Severity: `High`
- Affected endpoints:
  - `GET /api/docs`
  - `GET /api/docs-json`
  - Additional probes (all `404`): `/docs`, `/swagger`, `/openapi.json`, `/api/openapi.json`, `/api/swagger-ui/index.html`
- Reproduction steps:
  1. Run: `curl -i -sS 'https://api.locusai.dev/api/docs'`
  2. Run: `curl -i -sS 'https://api.locusai.dev/api/docs-json'`
  3. Observe `404 Not Found` with `Cannot GET ...` message.
- Expected:
  - Docs endpoint should be reachable in protected mode (unauthorized request denied with `401/403`; authorized request succeeds with `200`).
  - Spec endpoint should be reachable as configured by Swagger bootstrap.
- Actual:
  - Endpoints are not registered/reachable (`404`) and auth behavior for docs cannot be validated.

No additional defects were found in the non-docs regression sweep.
