# Deployment

## Pipeline

On every push to `main` that touches `backend/**`, `.github/workflows/backend-ci.yml` runs, in order:

1. **`backend-test`** — lint + pytest. Blocks everything below on failure.
2. **`build-and-push-backend`** — builds the Docker image, pushes `mcp-gateway-backend:<short-sha>` and `:latest` to `rmgwregistry.azurecr.io`.
3. **`run-migrations`** — runs `alembic upgrade head` against the production database, using the exact image just built, via the one-shot Azure Container Apps Job `mcp-gateway-backend-migrate`. **Blocks deploy on failure or timeout** (5 minutes).
4. **`deploy-backend`** — points the `mcp-gateway-backend` Container App at the new image (`needs: [build-and-push-backend, run-migrations]`). Single revision mode, so the new revision takes 100% of traffic as soon as it passes its startup probe.

The frontend (`frontend-ci.yml`) has an analogous test → build → deploy pipeline with no migration step (no schema of its own).

### Why an explicit migration step instead of running it at app startup

Migrations used to run inside the FastAPI lifespan (`app/mcp/transport/lifespan.py`) on every container start. That had three problems:
- No gate: a bad migration could reach production the instant a new revision started receiving traffic, with no separate review/approval point.
- No separation between "migrate" and "deploy app" — a migration failure and an app startup failure looked identical.
- The failure was **silently swallowed** (`except Exception: logger.error(...)`, no re-raise) — the app kept serving requests against a partially-migrated schema instead of refusing to start.

`AUTO_MIGRATE_ON_STARTUP` (env var, default `false`) still exists purely as a local/dev convenience — set it to `true` in your local `.env` to get the old "just works" behavior when running the app directly. It must stay unset/`false` anywhere migrations are gated by CI (staging, production). When enabled, a migration failure now raises and stops app startup entirely, rather than being logged and ignored.

### The migration job

`mcp-gateway-backend-migrate` is a separate Azure Container Apps Job (not the main Container App) in the same environment (`rmgw-env`), created once out-of-band:

```bash
az containerapp job create \
  --name mcp-gateway-backend-migrate \
  --resource-group rg-remote-mcp-gateway-dev \
  --environment rmgw-env \
  --trigger-type Manual \
  --replica-timeout 300 --replica-retry-limit 0 \
  --parallelism 1 --replica-completion-count 1 \
  --image rmgwregistry.azurecr.io/mcp-gateway-backend:latest \
  --cpu 0.5 --memory 1Gi \
  --registry-server rmgwregistry.azurecr.io --registry-username rmgwregistry --registry-password <redacted> \
  --secrets db-password=<redacted> secret-key=<redacted> app-jwt-secret-key=<redacted> entra-client-secret=<redacted> \
  --env-vars ENTRA_TENANT_ID=... DB_HOST=... DB_PASSWORD=secretref:db-password ... \
  --command "alembic" "upgrade" "head"
```

It reuses the same DB credentials as the main app (copied as Container-App-Job-scoped secrets, not duplicated into GitHub Secrets) and does **not** need Key Vault or managed identity access — `alembic upgrade head` only touches the gateway's own database via plain `DB_*` settings, never the per-SQL-server Key Vault secret references used elsewhere in the app.

**Second CLI gotcha hit while building this**: the job's first few real executions failed with `ProcessExited, exit code: 1` even after the command-syntax issue above was fixed. The actual cause: `DB_PASSWORD`, `ENTRA_CLIENT_SECRET`, `SECRET_KEY`, and `APP_JWT_SECRET_KEY` were all silently bound to a single nonexistent secret ref (`cappjob-mcp-gateway-backend-migrate`) instead of their own correctly-named secrets (`db-password`, `entra-client-secret`, `secret-key`, `app-jwt-secret-key`) — an artifact of an earlier `job update` call, not something the `--env-vars` flag at creation time did wrong. Confirmed by running the identical `alembic upgrade head` command directly inside the main app's container (same image, same DB) via `az containerapp exec`, where it succeeded cleanly — proving the DB/credentials were fine and the job's own env var bindings were the actual problem. Fixed with:
```bash
az containerapp job update --name mcp-gateway-backend-migrate --resource-group rg-remote-mcp-gateway-dev \
  --set-env-vars \
    "DB_PASSWORD=secretref:db-password" \
    "ENTRA_CLIENT_SECRET=secretref:entra-client-secret" \
    "SECRET_KEY=secretref:secret-key" \
    "APP_JWT_SECRET_KEY=secretref:app-jwt-secret-key"
```
If a future migration job execution fails with `ProcessExited, exit code: 1` and no useful log output, check `az containerapp job show --name mcp-gateway-backend-migrate --resource-group rg-remote-mcp-gateway-dev --query "properties.template.containers[0].env"` for exactly this class of mismatch before assuming it's a code or DB-connectivity problem.

The CI step (`run-migrations`) updates the job's image to the current build (`az containerapp job update --image ...`), starts it (`az containerapp job start --image ...`), then polls `az containerapp job execution show` until the execution reaches `Succeeded` or `Failed`.

**CLI gotcha hit while building this**: `az containerapp job ... --command` takes each argv token as a *separate* quoted argument (`--command "alembic" "upgrade" "head"`), not one string. Passing a single string (`--command "alembic upgrade head"`) makes the container try to exec a binary literally named `alembic upgrade head`, which fails immediately with no output. Passing tokens starting with `-` (e.g. `"python" "-m" "alembic" ...`) also breaks — the Azure CLI's argument parser stops consuming the `--command` list as soon as it sees something that looks like another flag. Using the `alembic` console script directly (no `-m`) sidesteps both problems.

## Rollback

### Rolling back the application (no schema change involved)

Single revision mode means the previous image is still in ACR — just point the Container App back at it:

```bash
az containerapp update \
  --name mcp-gateway-backend \
  --resource-group rg-remote-mcp-gateway-dev \
  --image rmgwregistry.azurecr.io/mcp-gateway-backend:<previous-short-sha>
```

Find `<previous-short-sha>` from the commit history on `main`, or `az acr repository show-tags --name rmgwregistry --repository mcp-gateway-backend --orderby time_desc`. This is safe and fast (`Single` revision mode cuts traffic over as soon as the new/previous revision passes its startup probe) — but it does **not** revert any schema change that migration already applied. Only use this alone if the migration itself was fine and the problem is purely in the application code.

### Rolling back a migration

If a migration itself needs to be reverted post-deploy:

1. **Stop new deploys first.** Don't let another push to `main` land mid-rollback (revert or hold merges).
2. **Identify the target revision.** `backend/alembic/versions/` — each file's `down_revision` links to the one before it; `alembic history` (run from `backend/`, needs DB connectivity or `alembic.ini` configured) shows the chain in order.
3. **Run the downgrade using the same migration job**, pointed at the *previous* deployed image (so the downgrade script matches what's actually in the DB) and with the command overridden for this one run:
   ```bash
   az containerapp job start \
     --name mcp-gateway-backend-migrate \
     --resource-group rg-remote-mcp-gateway-dev \
     --image rmgwregistry.azurecr.io/mcp-gateway-backend:<previous-short-sha> \
     --command "alembic" "downgrade" "<target-revision>"
   ```
   Poll with `az containerapp job execution show --name mcp-gateway-backend-migrate --resource-group rg-remote-mcp-gateway-dev --job-execution-name <execution-name> --query properties.status`, same as the CI step does.
4. **Then roll back the app** to the matching previous image (see above), so app code and schema are consistent again.
5. Not every migration is safely reversible (e.g. a dropped column with data loss) — check the specific migration's `downgrade()` before relying on it. Some migrations in this repo (the early ones, before this doc existed) may have incomplete or untested `downgrade()` implementations; treat `alembic downgrade` on those as **needing a manual review of the generated SQL first**, not a blind trust action. When in doubt, restore from an Azure SQL point-in-time backup instead of trusting an untested downgrade script.

### Point-in-time restore (last resort)

Azure SQL Database (`rmgw-sql-takeshi` / `RemoteMCPGateway`) has automatic backups. For anything a migration `downgrade()` can't cleanly undo (data loss, non-reversible DDL), use:

```bash
az sql db restore \
  --resource-group rg-remote-mcp-gateway-dev \
  --server rmgw-sql-takeshi \
  --name RemoteMCPGateway \
  --dest-name RemoteMCPGateway-restored \
  --time "<ISO-8601 timestamp before the bad migration>"
```

This restores to a **new** database name — you then need to either repoint the app at it or swap data back in manually. This is disruptive and should be a deliberate, confirmed decision, not an automated step.

## Logs

- App logs: `az containerapp logs show --name mcp-gateway-backend --resource-group rg-remote-mcp-gateway-dev --tail 300`
- Migration job logs: `az containerapp job logs show --name mcp-gateway-backend-migrate --resource-group rg-remote-mcp-gateway-dev --execution <execution-name>` (console log ingestion for Jobs has been unreliable in practice — the job's own `properties.status` from `az containerapp job execution show`, `Succeeded`/`Failed`, is the authoritative signal; don't wait on logs to confirm success/failure).
