# tests/integration/lab-9-s3.hurl

# 1. Authenticated POST to /v1/fragments
POST http://localhost:8080/v1/fragments

# We're sending a plain text fragment
Content-Type: text/plain

# Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1

# Body of the request goes in ```...``` when it's a string
`Hello S3!`

# We expect to get back an HTTP 201
HTTP/1.1 201

# We have various assertions about the response that we want to check
[Asserts]

# Capture the Location URL into a variable named `url`
[Captures]
url: header "Location"

# 2. Try to GET the fragment we just posted by its URL
GET {{url}}

[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body == "Hello S3!"

# 3. Deleting the fragment using the url as an authorized user.
DELETE {{url}}

[BasicAuth]
user1@email.com:password1

HTTP/1.1 200

# 4. Confirm that the server returns a 404, since the fragment should be deleted.
GET {{url}}

[BasicAuth]
user1@email.com:password1

HTTP/1.1 404
