import base64
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.oauth_client import OAuthClient
from app.models.user import User
from app.services.oauth_service import OAuthService

router = APIRouter(prefix="/oauth", tags=["OAuth"])


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
    client = (
        db.query(OAuthClient).filter(OAuthClient.client_id == client_id).first()
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

    # Helper function to redirect errors back to the client
    def redirect_error(error_code: str, error_desc: str):
        params = {"error": error_code, "error_description": error_desc}
        if state:
            params["state"] = state
        return RedirectResponse(f"{redirect_uri}?{urlencode(params)}")

    # 4. Validate response_type
    if response_type != "code":
        return redirect_error(
            "unsupported_response_type", "Response type must be code"
        )

    # 5. Validate PKCE parameters
    if code_challenge_method != "S256":
        return redirect_error(
            "invalid_request", "Code challenge method must be S256"
        )

    if not code_challenge:
        return redirect_error("invalid_request", "Code challenge is required")

    # 6. Validate scopes requested
    requested_scopes = [s.strip() for s in scope.split(" ") if s.strip()]
    for s in requested_scopes:
        if s not in client.allowed_scopes:
            return redirect_error(
                "invalid_scope",
                f"Scope '{s}' is not allowed for this client",
            )

    # 7. Issue authorization code
    oauth_service = OAuthService(db)
    try:
        code = oauth_service.create_authorization_code(
            client_id=client_id,
            user_id=current_user.id,
            redirect_uri=redirect_uri,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            scopes=requested_scopes,
        )
    except HTTPException as exc:
        return redirect_error("invalid_request", str(exc.detail))

    # Redirect to redirect_uri?code=...&state=...
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
