import base64
import html
import secrets
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.retry import retry_on_operational_error
from app.db.database import get_db
from app.models.oauth_client import OAuthClient
from app.models.user import User
from app.services.oauth_service import OAuthService

router = APIRouter(prefix="/oauth", tags=["OAuth"])


def _redirect_error(
    redirect_uri: str,
    error_code: str,
    error_desc: str,
    state: str | None,
) -> RedirectResponse:
    """Send an OAuth error back to the client via its redirect_uri."""
    params = {"error": error_code, "error_description": error_desc}
    if state:
        params["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(params)}")


def _render_consent_page(
    client_name: str,
    user_email: str,
    scopes: list[str],
    consent_token: str,
) -> HTMLResponse:
    """
    Render the interstitial Allow/Deny page.

    Every interpolated value is passed through html.escape: client_name is
    admin-supplied and user_email comes from Entra, so neither is treated as
    trusted markup.

    The form deliberately posts ONLY the consent token. The authorization
    parameters stay in the session, so there is nothing for the browser (or a
    hostile page) to tamper with between this page and the code being issued.
    """
    safe_client = html.escape(client_name)
    safe_email = html.escape(user_email)
    scope_items = "".join(
        f"<li>{html.escape(scope)}</li>" for scope in scopes
    )

    return HTMLResponse(
        f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize {safe_client}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    margin: 0; min-height: 100vh; display: flex;
    align-items: center; justify-content: center;
    background: #f4f4f5; color: #18181b;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  }}
  .card {{
    background: #fff; padding: 2rem; border-radius: 12px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12); max-width: 26rem; width: 100%;
  }}
  h1 {{ font-size: 1.25rem; margin: 0 0 0.75rem; }}
  p {{ margin: 0 0 1rem; color: #52525b; }}
  ul {{ margin: 0 0 1.5rem; padding-left: 1.25rem; color: #52525b; }}
  .row {{ display: flex; gap: 0.75rem; }}
  button {{
    flex: 1; padding: 0.625rem 1rem; border-radius: 8px; cursor: pointer;
    font: inherit; font-weight: 500; border: 1px solid transparent;
  }}
  .allow {{ background: #18181b; color: #fafafa; }}
  .deny {{ background: transparent; color: #18181b; border-color: #d4d4d8; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #09090b; color: #fafafa; }}
    .card {{ background: #18181b; box-shadow: none; }}
    p, ul {{ color: #a1a1aa; }}
    .allow {{ background: #fafafa; color: #18181b; }}
    .deny {{ color: #fafafa; border-color: #3f3f46; }}
  }}
</style>
</head>
<body>
  <div class="card">
    <h1>Allow {safe_client} to access your MCP Gateway data?</h1>
    <p>Signed in as {safe_email}. This will let {safe_client} query the SQL
       Server resources you have been granted permission to use.</p>
    <ul>{scope_items}</ul>
    <form method="post" action="/oauth/authorize/consent" class="row">
      <input type="hidden" name="consent_token" value="{html.escape(consent_token)}">
      <button type="submit" name="decision" value="deny" class="deny">Deny</button>
      <button type="submit" name="decision" value="allow" class="allow">Allow</button>
    </form>
  </div>
</body>
</html>"""
    )


@router.get("/authorize")
def authorize(
    request: Request,
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    response_type: str = Query(...),
    code_challenge: str = Query(...),
    code_challenge_method: str = Query(...),
    scope: str = Query("mcp"),
    state: str | None = Query(None),
    db: Session = Depends(get_db),
):
    # 1. Validate client_id first (no redirect if invalid)
    client = retry_on_operational_error(
        lambda: db.query(OAuthClient)
        .filter(OAuthClient.client_id == client_id)
        .first()
    )
    if not client or not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_id",
        )

    # 2. Validate redirect_uri first (no redirect if invalid)
    if redirect_uri not in client.redirect_uris:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect_uri",
        )

    # 3. Check session authentication
    entra_object_id = request.session.get("entra_object_id")
    current_user = None
    if entra_object_id:
        current_user = (
            db.query(User).filter(User.entra_object_id == entra_object_id).first()
        )

    if not current_user:
        pending_params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": response_type,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "scope": scope,
        }
        if state is not None:
            pending_params["state"] = state
        request.session["pending_oauth_request"] = pending_params
        return RedirectResponse("/auth/login")

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # 4. Validate response_type
    if response_type != "code":
        return _redirect_error(
            redirect_uri,
            "unsupported_response_type",
            "Response type must be code",
            state,
        )

    # 5. Validate PKCE parameters
    if code_challenge_method != "S256":
        return _redirect_error(
            redirect_uri,
            "invalid_request",
            "Code challenge method must be S256",
            state,
        )

    if not code_challenge:
        return _redirect_error(
            redirect_uri, "invalid_request", "Code challenge is required", state
        )

    # 6. Validate scopes requested
    requested_scopes = [s.strip() for s in scope.split(" ") if s.strip()]
    for s in requested_scopes:
        if s not in client.allowed_scopes:
            return _redirect_error(
                redirect_uri,
                "invalid_scope",
                f"Scope '{s}' is not allowed for this client",
                state,
            )

    # 7. Ask the user to consent before issuing anything.
    #
    # Previously a code was minted here the instant a session was found, which
    # meant any page able to trigger a top-level navigation to this endpoint
    # with an allowlisted redirect_uri got an authorization code for the logged
    # in user, with no visible step. The redirect_uri allowlist was the only
    # thing standing in the way.
    #
    # The fully validated request is parked in the session and a one-time CSRF
    # token is issued. POST /oauth/authorize/consent is the only thing that can
    # turn it into a code, and it reads the parameters back from the session
    # rather than from the form, so nothing in between can alter them.
    consent_token = secrets.token_urlsafe(32)
    request.session["pending_consent"] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
        "scopes": requested_scopes,
        "state": state,
        "consent_token": consent_token,
        "user_id": current_user.id,
    }

    return _render_consent_page(
        client_name=client.client_name,
        user_email=current_user.email,
        scopes=requested_scopes,
        consent_token=consent_token,
    )


@router.post("/authorize/consent")
def authorize_consent(
    request: Request,
    consent_token: str = Form(...),
    decision: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Finalize an authorization request the user has just been shown.

    Everything of consequence is read from the session, never from the form:
    the form supplies only the CSRF token and the Allow/Deny decision. A caller
    who forges this POST without the victim's session cookie has no pending
    request to act on, and one who has the cookie but not the token is stopped
    by the compare_digest check.
    """
    pending = request.session.get("pending_consent")
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending authorization request",
        )

    # Single use: consume it before acting, so a replay of this POST cannot
    # mint a second code no matter how the rest of the call turns out.
    request.session.pop("pending_consent", None)

    if not secrets.compare_digest(consent_token, pending["consent_token"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid consent token",
        )

    # The session must still belong to the same signed-in user who was shown
    # the page — a re-login as somebody else in another tab must not silently
    # authorize this request.
    entra_object_id = request.session.get("entra_object_id")
    current_user = None
    if entra_object_id:
        current_user = (
            db.query(User).filter(User.entra_object_id == entra_object_id).first()
        )

    if not current_user or current_user.id != pending["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer valid for this authorization request",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    redirect_uri = pending["redirect_uri"]
    state = pending["state"]

    if decision != "allow":
        return _redirect_error(
            redirect_uri,
            "access_denied",
            "The user denied the authorization request",
            state,
        )

    # Re-validate the client at decision time; it may have been deactivated or
    # had its redirect_uris edited while the consent page was on screen.
    client = retry_on_operational_error(
        lambda: db.query(OAuthClient)
        .filter(OAuthClient.client_id == pending["client_id"])
        .first()
    )
    if not client or not client.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client_id",
        )

    if redirect_uri not in client.redirect_uris:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect_uri",
        )

    oauth_service = OAuthService(db)
    try:
        code = oauth_service.create_authorization_code(
            client_id=pending["client_id"],
            user_id=current_user.id,
            redirect_uri=redirect_uri,
            code_challenge=pending["code_challenge"],
            code_challenge_method=pending["code_challenge_method"],
            scopes=pending["scopes"],
        )
    except HTTPException as exc:
        return _redirect_error(
            redirect_uri, "invalid_request", str(exc.detail), state
        )

    params = {"code": code}
    if state:
        params["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(params)}")


@router.post("/token")
async def token(
    request: Request,
    db: Session = Depends(get_db),
):
    # Support both application/json and application/x-www-form-urlencoded
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON body",
            )
    else:
        form = await request.form()
        body = dict(form)

    grant_type = body.get("grant_type")
    code = body.get("code")
    redirect_uri = body.get("redirect_uri")
    client_id = body.get("client_id")
    code_verifier = body.get("code_verifier")
    client_secret = body.get("client_secret")

    # Support Basic Authentication header for client_id/client_secret
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Basic "):
        try:
            encoded = auth_header.split(" ", 1)[1]
            decoded = base64.b64decode(encoded).decode("utf-8")
            parts = decoded.split(":", 1)
            if len(parts) == 2:
                client_id = parts[0]
                client_secret = parts[1]
        except Exception:
            pass

    # Basic parameter checks
    if grant_type != "authorization_code":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "unsupported_grant_type",
                "error_description": "Grant type must be authorization_code",
            },
        )

    if not code or not isinstance(code, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_request",
                "error_description": "Authorization code is required and must be a string",
            },
        )

    if not client_id or not isinstance(client_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_request",
                "error_description": "Client ID is required and must be a string",
            },
        )

    if not redirect_uri or not isinstance(redirect_uri, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_request",
                "error_description": "Redirect URI is required and must be a string",
            },
        )

    if not code_verifier or not isinstance(code_verifier, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_request",
                "error_description": "Code verifier is required and must be a string",
            },
        )

    if client_secret is not None and not isinstance(client_secret, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "invalid_request",
                "error_description": "Client secret must be a string",
            },
        )

    oauth_service = OAuthService(db)
    result = oauth_service.exchange_code(
        code=code,
        code_verifier=code_verifier,
        client_id=client_id,
        redirect_uri=redirect_uri,
        client_secret=client_secret,
    )
    return result
