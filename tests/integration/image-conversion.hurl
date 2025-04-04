# tests/integration/image-conversion.hurl
# Tests image format conversion functionality

# 1. POST a new PNG image fragment as an authorized user
POST http://localhost:8080/v1/fragments
Content-Type: image/png
[BasicAuth]
user1@email.com:password1
file,sample.png;

# Confirm 201 status and capture location
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/png"

[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"

# 2. GET the image fragment info (metadata)
GET {{fragment_url}}/info
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and verify metadata properties
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment_id}}
jsonpath "$.fragment.type" == "image/png"

# 3. Convert the PNG image to JPEG format
GET {{fragment_url}}.jpg
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and JPEG content type
HTTP/1.1 200
Content-Type: image/jpeg

# 4. Convert the PNG image to WebP format
GET {{fragment_url}}.webp
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and WebP content type
HTTP/1.1 200
Content-Type: image/webp

# 5. Try to convert the image to an unsupported format (should fail)
GET {{fragment_url}}.xyz
[BasicAuth]
user1@email.com:password1

# Confirm 415 status - unsupported format
HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" matches "Cannot convert fragment to xyz"

# 6. Clean up - delete the fragment
DELETE {{fragment_url}}
[BasicAuth]
user1@email.com:password1

# Confirm 200 status
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
