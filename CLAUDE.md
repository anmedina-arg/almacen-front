## Agent skills

### Issue tracker

Issues live in GitHub Issues (github.com/anmedina-arg/almacen-front), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Schema changes

Any change to a Supabase function, policy, trigger, or table follows the 8-step verify-against-live-DB workflow. See `docs/agents/schema-changes.md` and `supabase/README.md`.

### Feature flags

Any capability gated by a `stores.feature_flags` key must stay independent of every other flag and of always-on features — flags exist to sell per-module subscriptions, so disabling one can never break another. See `docs/agents/feature-flags.md` and [ADR-0012](docs/adr/0012-feature-flags-mutual-independence.md).

### Admin-gated API routes

Any route under `[store]/api/` that requires Store admin or Platform admin access must use the shared `createApiRoute(requireAdmin)` guard, never reimplement the check inline. See `docs/agents/admin-routes.md`.

### Screaming architecture scope

The service layer (`features/<domain>/services/`) is 100% domain-organized — no exceptions. The client-side layer (hooks, components, `*ApiClient.ts`) intentionally stays surface-organized (`features/admin/`, `features/catalog/`) instead — not an incomplete migration, don't split it by domain without a new ADR. See [ADR-0013](docs/adr/0013-service-layer-domain-boundaries.md).

### PWA

Manifest is per-Store and dynamic (no `public/manifest.json`), Service Worker versioning, icon regeneration, and troubleshooting. See `docs/agents/pwa.md`.
