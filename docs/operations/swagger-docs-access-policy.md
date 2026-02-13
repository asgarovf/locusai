# Swagger Docs Access Policy

## Purpose
This document is the operational contract for controlling access to Swagger documentation in the API service using:

- `SWAGGER_DOCS_ENABLED`
- `SWAGGER_DOCS_USERNAME`
- `SWAGGER_DOCS_PASSWORD`

It defines ownership, secret storage, rotation, audit expectations, release/rollback checklists, and emergency disable procedures.

## Scope
This policy applies to all API environments:

- `dev`
- `qa`
- `stage`
- `prod`

Contracted protected endpoints:

- Swagger UI: `/api/docs`
- OpenAPI spec: `/api/docs-json`

## Secret Ownership
Primary owner(s):

- API Tech Lead
- API Primary On-Call Engineer

Backup owner:

- Engineering Manager (Platform/API)

Owner responsibilities:

- Approve and execute secret creation and rotation.
- Ensure `SWAGGER_DOCS_ENABLED` is set correctly per release intent.
- Verify post-change runtime behavior in each affected environment.
- Maintain access-change audit records.

## Secret Storage By Environment
`SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` must be stored only in environment secret stores. Never commit values to git, docs, tickets, or chat.

| Environment | Storage Location | Record Path | Write Access | Read Access |
|---|---|---|---|---|
| `dev` | Local developer env file (ignored by git) | `apps/api/.env` on local machine | API engineers | Local developer running API |
| `qa` | Railway Variables | Railway project -> API service -> `qa` variables | API Tech Lead, API on-call | Runtime only + permitted release/on-call staff |
| `stage` | Railway Variables | Railway project -> API service -> `stage` variables | API Tech Lead, API on-call | Runtime only + permitted release/on-call staff |
| `prod` | Railway Variables | Railway project -> API service -> `prod` variables | API Tech Lead, API on-call | Runtime only + permitted on-call staff |

## Secret Rotation Policy
Rotation cadence:

- Rotate both `SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` every 90 days.
- Rotate immediately after any suspected exposure, team-member offboarding, or incident.

Rotation requirements:

- Password must be randomly generated and at least 32 characters.
- Username must be service-specific and not reused from other systems.
- Rotate username and password together (single change window).

### Rotation Procedure
1. Create a change record (ticket/incident) with environment(s), operator, and planned time.
2. Generate new credentials using an approved password generator.
3. Update `SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` in the target environment secret store.
4. Redeploy/restart API in the target environment so runtime picks up updated values.
5. Validate access behavior:
   - old credentials return `401`
   - new credentials return `200` on `/api/docs` and `/api/docs-json`
6. Record completion timestamp, operator, and verification evidence in the change record.

## Audit And Logging Expectations
For every access-related change (enable/disable/rotation), capture:

- Change reason and ticket/incident ID
- Environment(s) affected
- Operator identity
- Timestamp (UTC)
- Before/after state of `SWAGGER_DOCS_ENABLED` (do not log secret values)
- Verification results for UI and spec endpoints

Evidence sources:

- Deployment platform audit log (who changed env vars)
- Release pipeline/deployment logs (when rollout occurred)
- API/request logs showing expected status codes after change

Retention expectation:

- Keep audit evidence for at least 12 months.

## `SWAGGER_DOCS_ENABLED` Operational Flow
### Planned Enable Flow (Release)
1. Confirm `SWAGGER_DOCS_USERNAME` and `SWAGGER_DOCS_PASSWORD` are present in the target environment.
2. Set `SWAGGER_DOCS_ENABLED=true` in the target environment.
3. Deploy/restart API.
4. Execute post-change validation (see Validation section).
5. Record results in release notes/change record.

### Planned Disable Flow
1. Set `SWAGGER_DOCS_ENABLED=false` in the target environment.
2. Deploy/restart API.
3. Execute post-change validation for disabled behavior.
4. Record results in release notes/change record.

## Release Checklist (Enable)
- [ ] Change record opened with scope and owner.
- [ ] `SWAGGER_DOCS_USERNAME` present in target environment secret store.
- [ ] `SWAGGER_DOCS_PASSWORD` present in target environment secret store.
- [ ] `SWAGGER_DOCS_ENABLED=true` set in target environment.
- [ ] API deploy/restart completed successfully.
- [ ] Unauthorized checks return `401` on `/api/docs` and `/api/docs-json`.
- [ ] Authorized checks return `200` on `/api/docs` and `/api/docs-json`.
- [ ] Audit evidence attached to change record.

## Rollback Checklist
Use this if enablement creates risk or unexpected behavior.

- [ ] Set `SWAGGER_DOCS_ENABLED=false` in affected environment.
- [ ] Deploy/restart API.
- [ ] Verify `/api/docs` is unavailable (expected non-`200`, target `404`).
- [ ] Verify `/api/docs-json` is unavailable (expected non-`200`, target `404`).
- [ ] Confirm no new successful docs access events after rollback time.
- [ ] Update incident/change record with rollback timestamp and operator.

## Emergency Disable Runbook (On-Call)
Objective: remove external Swagger docs access in under 5 minutes without code changes.

1. Identify impacted environment(s): `qa`, `stage`, and/or `prod`.
2. In deployment secret/config UI, set `SWAGGER_DOCS_ENABLED=false` for impacted environment(s).
3. Trigger immediate API restart/redeploy for impacted environment(s).
4. Verify disable result from a network location that can reach the environment:
   - `GET /api/docs` returns non-`200` (target `404`)
   - `GET /api/docs-json` returns non-`200` (target `404`)
5. Log completion in incident channel/ticket with UTC time and verifier name.
6. If any endpoint still returns `200`, escalate to incident commander and apply traffic controls (WAF/edge block on `/api/docs*`) until service config is corrected.

## Validation Targets And Post-Change Steps
Run these validations after any enable, disable, or credential rotation.

### A. Disabled Behavior (`SWAGGER_DOCS_ENABLED=false`)
Expected outcome:

- `/api/docs` is unavailable (target `404`, must not be `200`)
- `/api/docs-json` is unavailable (target `404`, must not be `200`)

Example checks:

```bash
curl -i https://<api-host>/api/docs
curl -i https://<api-host>/api/docs-json
```

### B. Enabled + Unauthorized (`SWAGGER_DOCS_ENABLED=true`, no credentials)
Expected outcome:

- `/api/docs` returns `401`
- `/api/docs-json` returns `401`

Example checks:

```bash
curl -i https://<api-host>/api/docs
curl -i https://<api-host>/api/docs-json
```

### C. Enabled + Authorized (`SWAGGER_DOCS_ENABLED=true`, valid credentials)
Expected outcome:

- `/api/docs` returns `200`
- `/api/docs-json` returns `200`

Example checks:

```bash
curl -i -u "$SWAGGER_DOCS_USERNAME:$SWAGGER_DOCS_PASSWORD" https://<api-host>/api/docs
curl -i -u "$SWAGGER_DOCS_USERNAME:$SWAGGER_DOCS_PASSWORD" https://<api-host>/api/docs-json
```

## Non-Negotiable Controls
- Do not expose Swagger docs in `prod` unless an approved release/change record exists.
- Do not share credentials in plaintext over chat or tickets.
- Do not merge code changes to perform emergency disable; use runtime config only.
