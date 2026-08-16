# Backend – Remote MCP Gateway

FastAPI application that acts as a remote MCP (Model Context Protocol) gateway,
exposing server-sent events (SSE) endpoints that proxy tool calls to registered
MCP servers on behalf of authenticated clients.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | FastAPI + Uvicorn |
| Auth | Microsoft Entra ID (MSAL / OIDC) |
| Database | Azure SQL via SQLAlchemy + Alembic |
| MCP SDK | `mcp` 1.x (stdio + SSE transports) |
| Runtime | Python 3.12 |

## Local development

```bash
# 1. Create and activate a virtual environment
python -m venv .venv && source .venv/bin/activate

# 2. Install all dependencies
pip install -r requirements.txt -r requirements-dev.txt

# 3. Copy the example env file and fill in real values
cp .env.example .env

# 4. Run database migrations
alembic upgrade head

# 5. Start the development server
uvicorn app.main:app --reload --port 8000
```

## Running tests

```bash
pytest
```

Linting is enforced with [ruff](https://docs.astral.sh/ruff/) (`ruff check .`).

## Deployment

The backend is deployed to **Azure App Service** (`mcp-gateway-backend`) via the
GitHub Actions workflow at `.github/workflows/deploy-backend.yml`.

### How the deployment works

1. **Trigger** – any push to `main` that touches a file under `backend/`
   activates the workflow. Changes to `frontend/` alone do not trigger it.
2. **Auth** – the workflow authenticates to Azure using **OIDC federated
   identity** (`azure/login@v2`). No client secret or publish profile is stored
   in the repository; the three values required (`AZURE_CLIENT_ID`,
   `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) are kept as GitHub repository
   secrets.
3. **Single-job, zero-artifact build** – dependencies are installed directly
   into `backend/.python_packages/lib/site-packages` on the runner (the path
   Azure App Service auto-detects), then `azure/webapps-deploy@v3` zips the
   `backend/` folder and ships it. No `upload-artifact` / `download-artifact`
   steps are used, so the workflow consumes no GitHub artifact storage quota.
4. **Concurrency control** – if a second push lands while a deploy is in
   progress on the same branch, the older run is cancelled rather than queued,
   preventing stale deploys from piling up.

### GitHub secrets required

| Secret name | Description |
|---|---|
| `AZURE_CLIENT_ID` | App Registration client ID for the federated credential |
| `AZURE_TENANT_ID` | Entra ID tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

Add these under **GitHub repo → Settings → Secrets and variables → Actions**.
