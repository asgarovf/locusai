---
description: Operational policy for securing and disabling Swagger docs in the API service.
---

# Swagger Docs Access Policy

## Purpose
This document is the canonical runbook for operating Swagger/OpenAPI docs access in the API service.

## Verified Runtime Contract
Behavior below is verified by implementation and tests in:
- `apps/api/src/common/swagger/swagger.bootstrap.ts`
- `apps/api/src/common/swagger/docs-basic-auth.middleware.ts`
- `apps/api/src/common/swagger/__tests__/swagger.bootstrap.jest.ts`
- `apps/api/src/common/swagger/__tests__/docs-basic-auth.middleware.jest.ts`
- `apps/api/src/config/configuration.ts`
- `apps/api/src/config/__tests__/config.service.jest.ts`

### Routes (exact)
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json`

### Environment Variables (exact)
- `SWAGGER_DOCS_ENABLED`
- `SWAGGER_DOCS_USERNAME`
- `SWAGGER_DOCS_PASSWORD`

## Mode Semantics

### Disabled Mode
Configuration:
- `SWAGGER_DOCS_ENABLED=false` (default)

Behavior:
- `/api/docs` returns `404`.
- `/api/docs-json` returns `404`.
- Docs routes are not registered.

Credential requirements:
- `SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` are not required.

### Enabled Mode
Configuration:
- `SWAGGER_DOCS_ENABLED=true`
- `SWAGGER_DOCS_USERNAME` must be set and non-blank.
- `SWAGGER_DOCS_PASSWORD` must be set and non-blank.

Behavior:
- Both routes are protected with HTTP Basic auth.
- Valid credentials return `200`.

Credential validation notes:
- Username/password values are trimmed.
- Blank values are rejected by config validation when enabled.

### Unauthorized Response Contract (required)
When docs are enabled and auth is missing or invalid, both `/api/docs` and `/api/docs-json` must return:
- Status: `401`
- Header: `WWW-Authenticate: Basic realm="API Docs"`
- Body: `Unauthorized`

## Secret Ownership and Accountability

| Control Area | Primary Role Owner | Backup Role | Required Cadence | Evidence / Accountability |
|---|---|---|---|---|
| Secret provisioning (`SWAGGER_DOCS_USERNAME`, `SWAGGER_DOCS_PASSWORD`) | SRE (on-call) | Platform Engineer | On every new environment and every credential rotation event | Change ticket or deployment log must include who provisioned and when. |
| Secret storage | SRE (on-call) | Security Engineer | Continuous | Secrets must exist only in the deployment secret manager and CI secret store; never in code, git history, task text, or chat logs. |
| Rotation execution | Security Engineer | SRE (on-call) | Every 90 days minimum, and immediately after any suspected credential exposure | Rotation record must include timestamp, environment scope, and post-rotation verification outcome. |
| Rotation verification | QA Engineer | SRE (on-call) | Each rotation and each emergency disable/restore event | QA check results for `/api/docs`, `/api/docs-json`, and `/api/health` must be attached to the release/change record. |
| Audit accountability | Engineering Manager | Security Engineer | Monthly review | Monthly access-control review must confirm cadence compliance and that evidence exists for all production rotations. |

## Standard Verification Checks
Set target host:

```bash
export BASE_URL="https://<api-host>"
```

### Check unauthorized contract (enabled mode)

```bash
curl -i "$BASE_URL/api/docs"
curl -i "$BASE_URL/api/docs-json"
```

Expected:
- `HTTP/1.1 401`
- `WWW-Authenticate: Basic realm="API Docs"`

### Check authorized access (enabled mode)

```bash
export SWAGGER_DOCS_USERNAME="<username>"
export SWAGGER_DOCS_PASSWORD="<password>"
BASIC_AUTH=$(printf "%s:%s" "$SWAGGER_DOCS_USERNAME" "$SWAGGER_DOCS_PASSWORD" | base64)

curl -i -H "Authorization: Basic $BASIC_AUTH" "$BASE_URL/api/docs"
curl -i -H "Authorization: Basic $BASIC_AUTH" "$BASE_URL/api/docs-json"
```

Expected:
- Both routes return `200`.

## Emergency Disable Runbook
Use this procedure for incidents (credential leak, active probing, or emergency hardening).

### Step 1: Disable docs in target environment
Set:

```bash
SWAGGER_DOCS_ENABLED=false
```

Then redeploy/restart API pods or service instances so new config is active.

### Step 2: Verify docs are inaccessible

```bash
curl -i "$BASE_URL/api/docs"
curl -i "$BASE_URL/api/docs-json"
```

Expected:
- Both requests return `404`.
- No `WWW-Authenticate` challenge is required after disable because routes are removed.

### Step 3: Verify non-doc API health remains available

```bash
curl -i "$BASE_URL/api/health"
```

Expected:
- Status `200`.
- JSON response includes `status` and `services.database`.

### Step 4: Record incident action
Required record fields:
- Incident/change ID
- Environment(s) disabled
- Timestamp of `SWAGGER_DOCS_ENABLED=false` deployment
- QA/SRE verification outputs for steps 2 and 3
- Owner responsible for re-enable decision

## Re-enable Procedure (post-incident)
1. Rotate `SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` before re-enable.
2. Set `SWAGGER_DOCS_ENABLED=true`.
3. Redeploy/restart API service.
4. Run "Standard Verification Checks" and attach results to incident closure.

## References
- Architecture link: `docs/concepts/architecture.md`
- API discovery link: `docs/api/index.md`
