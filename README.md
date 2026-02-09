# HTTP Response Status Codes

## Success
- 200 OK
- 201 Created
- 204 No Content


## Client Error
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests

## Server Error
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

# API Routes
- Create docs
- api/v1/orgs/:orgId/docs/ - create single doc in the root of the org - POST
- api/v1/orgs/:orgId/docs/:docId/versions - update existing doc version - POST


- api/v1/orgs/:orgId/folder/:folderId/docs/ - create single doc inside a folder in the org - POST


- api/v1/orgs/create = Create Org - POST
- api/v1/auth/login = Login - POST
- api/v1/user/orgs = Get users org - GET