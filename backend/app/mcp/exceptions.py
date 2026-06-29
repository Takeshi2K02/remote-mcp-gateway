class MCPGatewayError(Exception):
    """Base exception for MCP gateway errors."""


class MCPAuthenticationError(MCPGatewayError):
    """Raised when MCP authentication fails."""


class MCPAuthorizationError(MCPGatewayError):
    """Raised when a user is not allowed to access a resource."""


class MCPResourceNotFoundError(MCPGatewayError):
    """Raised when a requested MCP resource does not exist."""


class MCPExecutionError(MCPGatewayError):
    """Raised when MCP tool execution fails."""