# tests/integration/post-fragments-json.hurl
# Authenticated POST to /v1/fragments with JSON
POST http://localhost:8080/v1/fragments
# We're sending a JSON fragment
Content-Type: application/json
# Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1
# JSON body
{
"name": "Sample",
"description": "This is a sample JSON fragment",
"value": 42
}
# We expect to get back an HTTP 201
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
# Capture the Location URL into a variable named `url`
[Captures]
url: header "Location"

# Try to GET the fragment we just posted by its URL
GET {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
# Verify the JSON body matches what we sent
jsonpath "$.name" == "Sample"
jsonpath "$.description" == "This is a sample JSON fragment"
jsonpath "$.value" == 42
