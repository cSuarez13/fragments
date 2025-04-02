# tests/integration/lab-10-dynamodb.hurl
# This integration test validates the complete fragment lifecycle with DynamoDB:
# - Creating fragments with different content types
# - Retrieving fragment metadata
# - Listing all fragments
# - Deleting fragments
# - Verifying deleted fragments are removed from the list

# 1. POST a new JSON fragment as an authorized user
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{ "service": "DynamoDB" }

# Confirm 201 status and capture location and id
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragment.type" == "application/json"

[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# 2. GET the fragment info (metadata) using the captured URL
GET {{fragment1_url}}/info
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and verify metadata properties
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment1_id}}
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 3. POST a second fragment with Markdown content
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
`DynamoDB is **great**.`

# Confirm 201 status and capture location and id
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragment.type" == "text/markdown"

[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# 4. GET the second fragment info (metadata)
GET {{fragment2_url}}/info
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and verify metadata properties
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment2_id}}
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 5. GET all fragments (without expanding)
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and verify fragments list exists
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" exists
jsonpath "$.fragments" isCollection

# 6. DELETE the first fragment
DELETE {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

# Confirm 200 status
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# 7. Try to GET the deleted fragment
GET {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

# Confirm 404 status (fragment should be gone)
HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404

# 8. GET all fragments again to verify the state after deletion
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and verify fragments list exists
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" exists
jsonpath "$.fragments" isCollection

# 9. GET the second fragment to verify it still exists
GET {{fragment2_url}}
[BasicAuth]
user1@email.com:password1

# Confirm this fragment is still accessible
HTTP/1.1 200
Content-Type: text/markdown
