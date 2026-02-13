# OpenAPI Metadata Deferred Endpoints

This rollout prioritized high-usage customer-facing endpoints used by dashboard clients, SDK consumers, and API key workflows.

## Deferred For Follow-up

- `GET /health`
  - Internal service healthcheck; low discoverability impact for external integrations.
- `POST /ci/report/:workspaceId`
  - Specialized CI reporting flow with lower general API usage.
- `POST /workspaces/:workspaceId/docs`
- `GET /workspaces/:workspaceId/docs`
- `GET /workspaces/:workspaceId/docs/:docId`
- `PUT /workspaces/:workspaceId/docs/:docId`
- `DELETE /workspaces/:workspaceId/docs/:docId`
  - Workspace docs CRUD is lower priority than auth/org/workspace/task/sprint core API flows.
- `GET /workspaces/:workspaceId/doc-groups`
- `POST /workspaces/:workspaceId/doc-groups`
- `PATCH /workspaces/:workspaceId/doc-groups/:id`
- `DELETE /workspaces/:workspaceId/doc-groups/:id`
  - Doc group management is useful but non-blocking for this metadata sprint.

## Scope Notes

- No endpoint runtime behavior, auth flow, or persistence logic was modified.
- Deferred endpoints remain functional and can be covered in a dedicated follow-up pass.
