# tests/integration/versioning.hurl
# Integration tests for fragment versioning functionality

# 1. Create a new text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Initial fragment content
```

# Confirm creation succeeded and save the URL and ID
HTTP/1.1 201
[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"

# 2. Update the fragment to create a version
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Updated fragment content - version 1
```

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.size" == 37

# 3. Update the fragment again to create another version
PUT {{fragment_url}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Updated fragment content - version 2
```

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.size" == 37

# 4. Get the list of versions for this fragment
GET {{fragment_url}}/versions
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
# Check that there are at least 2 versions
jsonpath "$.versions" count >= 2

# 5. Get the expanded list of versions
GET {{fragment_url}}/versions?expand=1
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.versions[0].fragmentId" == {{fragment_id}}

# Capture the first version ID
[Captures]
version1_id: jsonpath "$.versions[0].id"

# 6. Get the data for a specific version
GET {{fragment_url}}/versions/{{version1_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "Updated fragment content"

# 7. Restore the fragment to a previous version
POST {{fragment_url}}/versions
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{
  "versionId": "{{version1_id}}"
}

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment_id}}

# 8. Verify that the fragment was restored
GET {{fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "Updated fragment content"

# 9. Clean up - delete the fragment
DELETE {{fragment_url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
