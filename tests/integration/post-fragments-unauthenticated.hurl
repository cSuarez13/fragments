# tests/integration/post-fragments-unauthenticated.hurl
# Unauthenticated POST to /v1/fragments
POST http://localhost:8080/v1/fragments
# We're sending a plain text fragment
Content-Type: text/plain
# No authentication provided
# Body of the request goes in ```...``` when it's a string
`This request has no authentication!`

# We expect to get back an HTTP 401 Unauthorized
HTTP/1.1 401
[Asserts]
# Verify we get the expected error response
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" matches "Unauthorized"
