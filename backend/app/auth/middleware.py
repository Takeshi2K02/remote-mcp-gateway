from fastapi import status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.security import verify_app_access_token
from app.db.database import SessionLocal
from app.mcp.context import MCPRequestContext, set_current_context, clear_current_context
from app.models.user import User


class MCPAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only intercept requests to the streamable HTTP/SSE MCP endpoints
        path = request.url.path
        if not (path == "/mcp" or path.startswith("/mcp/")):
            return await call_next(request)

        # Allow OPTIONS request for CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Unauthorized: Missing or invalid Bearer Token"},
            )

        token = auth_header.split(" ", 1)[1]
        try:
            # Re-use verify_app_access_token from security.py
            credentials = HTTPAuthorizationCredentials(
                scheme="Bearer", credentials=token
            )
            payload = verify_app_access_token(credentials)

            # Check scope
            scope = payload.get("scope")
            if scope != "mcp":
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Forbidden: Token lacks 'mcp' scope"},
                )

            entra_object_id = payload.get("sub")
            email = payload.get("email")
            full_name = payload.get("full_name")

            if not entra_object_id or not email:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Unauthorized: Invalid token claims"},
                )

            # Get user from database
            db = SessionLocal()
            try:
                user = (
                    db.query(User)
                    .filter(User.entra_object_id == entra_object_id)
                    .first()
                )
                if not user:
                    # Sync user dynamically if authenticated but not local
                    user = User(
                        entra_object_id=entra_object_id,
                        email=email,
                        full_name=full_name,
                        is_active=True,
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                elif not user.is_active:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Forbidden: User account is inactive"},
                    )

                # Store user details in the context variables
                context = MCPRequestContext(
                    user_id=user.id,
                    entra_object_id=entra_object_id,
                    email=email,
                    full_name=full_name,
                    scopes=[scope] if scope else [],
                )
            finally:
                db.close()

            # Set current context and execute next handler in a try-finally block
            set_current_context(context)
            try:
                # TODO: Remove MCP debug logging after protocol verification
                body_bytes = await request.body()
                body_str = body_bytes.decode("utf-8", errors="replace")

                import json
                mcp_method = None
                try:
                    json_body = json.loads(body_str)
                    if isinstance(json_body, dict):
                        mcp_method = json_body.get("method")
                    elif isinstance(json_body, list) and len(json_body) > 0:
                        mcp_method = json_body[0].get("method")
                except Exception:
                    pass

                mcp_methods_to_log = {
                    "initialize",
                    "tools/list",
                    "tools/call",
                    "resources/list",
                    "prompts/list",
                }

                should_log = mcp_method in mcp_methods_to_log

                if should_log:
                    headers_str = ""
                    for k, v in request.headers.items():
                        if k.lower() == "authorization":
                            parts = v.split(" ", 1)
                            if len(parts) == 2:
                                truncated = f"{parts[0]} {parts[1][:10]}..."
                            else:
                                truncated = f"{v[:10]}..."
                            headers_str += f"{k}: {truncated}\n"
                        else:
                            headers_str += f"{k}: {v}\n"

                    print("============================================================\n"
                          "[MCP REQUEST]\n"
                          f"Method: {request.method}\n"
                          f"Path: {request.url.path}\n"
                          "Headers:\n"
                          f"{headers_str}"
                          "Body:\n"
                          f"{body_str}\n"
                          "============================================================\n", flush=True)

                response = await call_next(request)

                if should_log:
                    response_body_str = ""
                    if "application/json" in response.headers.get("content-type", ""):
                        from starlette.concurrency import iterate_in_threadpool
                        response_body = [chunk async for chunk in response.body_iterator]
                        response.body_iterator = iterate_in_threadpool(iter(response_body))
                        response_body_content = b"".join(response_body)
                        response_body_str = response_body_content.decode("utf-8", errors="replace")
                    else:
                        response_body_str = f"<non-json response: {response.headers.get('content-type', '')}>"

                    print("============================================================\n"
                          "[MCP RESPONSE]\n"
                          f"JSON-RPC Method: {mcp_method}\n"
                          f"Status: {response.status_code}\n"
                          "Body:\n"
                          f"{response_body_str}\n"
                          "============================================================\n", flush=True)

                return response
            finally:
                clear_current_context()

        except Exception as exc:
            # Catch JWT errors, database issues or expired signature exceptions
            detail = getattr(exc, "detail", str(exc))
            status_code = getattr(exc, "status_code", status.HTTP_401_UNAUTHORIZED)
            return JSONResponse(
                status_code=status_code,
                content={"detail": f"Unauthorized: {detail}"},
            )
