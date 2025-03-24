# tests/integration/post-fragments-unsupported-type.hurl
# Authenticated POST to /v1/fragments with unsupported content type
POST http://localhost:8080/v1/fragments
# We're sending an unsupported content type
Content-Type: application/pdf
# Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1
# Body of the request goes in ```...``` when it's a string
`This is an unsupported fragment type!`

# We expect to get back an HTTP 415 Unsupported Media Type
HTTP/1.1 415
[Asserts]
# Verify we get the expected error response
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" matches "Unsupported Media Type"
