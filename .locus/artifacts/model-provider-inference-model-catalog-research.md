# Model Provider Inference and Supported Model Catalog Research
Date: 2026-02-24

## Executive summary
We should treat model as the source of truth and infer provider from it, because both Codex and Claude now expose enough model-id signal (`codex` vs `claude-*`/short aliases) to route automatically. Claude Code has a clear official supported-model list as of February 2026. Codex support is split across product announcements (latest Codex-native models) and OpenAI pricing/docs pages (current codex API model IDs), so we should maintain a union of currently active Codex model IDs.

## Detailed findings

### Claude Code (official supported models)
Anthropic's Claude Code support page (updated February 20, 2026) lists these currently supported models:
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `claude-opus-4-5-20251101`
- `claude-haiku-4-5-20251001`
- `claude-sonnet-4-5-20250929`

Source:
- https://support.anthropic.com/en/articles/11145838-claude-code-models

### Codex latest releases and availability
OpenAI announcements in February 2026 confirm the latest Codex-focused models and availability in Codex CLI:
- GPT-5.3-Codex is available in Codex CLI and Codex app.
- Codex-Spark is also available in Codex CLI and Codex app.

Sources:
- https://openai.com/index/introducing-gpt-5-3-codex/
- https://openai.com/index/introducing-codex-spark/

### Codex API model IDs currently exposed
OpenAI pricing/docs pages list the currently available codex API model family IDs (useful as canonical IDs for validation/config):
- `gpt-5.2-codex`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex`
- `gpt-5.1-codex-mini`
- `gpt-5-codex`
- `codex-mini-latest`

Source:
- https://openai.com/api/pricing/

## Actionable recommendations
1. Infer provider from model ID first (`claude-*`/Claude aliases -> `claude`, `*codex*` -> `codex`), then fall back to explicit provider only when no model is provided.
2. Keep a shared model catalog with strict known IDs plus a safe inference heuristic for forward compatibility.
3. In user-facing config/REPL flows, setting model should auto-update provider to prevent stale provider/model mismatches.
