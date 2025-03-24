# tests/integration/post-fragments-charset.hurl
# Authenticated POST to /v1/fragments with charset in content type
POST http://localhost:8080/v1/fragments
# We're sending a plain text fragment with charset
Content-Type: text/plain; charset=utf-8
# Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1
# Body of the request goes in ```...``` when it's a string
`This fragment includes charset!`

# We expect to get back an HTTP 201
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain; charset=utf-8"
# Capture the Location URL into a variable named `url`
[Captures]
url: header "Location"

# Try to GET the fragment we just posted by its URL
GET {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
# Verify the content type matches what we sent, including the charset
Content-Type: text/plain; charset=utf-8
[Asserts]
body == "This fragment includes charset!"
