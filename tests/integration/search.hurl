# tests/integration/search.hurl
# Integration tests for fragment search functionality

# 1. Create a plain text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
This is a plain text fragment for search testing
```

HTTP/1.1 201
[Captures]
text_fragment_id: jsonpath "$.fragment.id"

# 2. Create a markdown fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
```
# Markdown Fragment
This is a markdown fragment for search testing
```

HTTP/1.1 201
[Captures]
md_fragment_id: jsonpath "$.fragment.id"

# 3. Create a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
```
{
  "name": "JSON Fragment",
  "description": "This is a JSON fragment for search testing",
  "size": 1024
}
```

HTTP/1.1 201
[Captures]
json_fragment_id: jsonpath "$.fragment.id"

# 4. Search for text fragments (should return plain text and markdown)
GET http://localhost:8080/v1/fragments/search?type=text/
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" count >= 2
# Use string comparison rather than the contains predicate
jsonpath "$.fragments" includes {{text_fragment_id}}
jsonpath "$.fragments" includes {{md_fragment_id}}

# 5. Search for JSON fragments
GET http://localhost:8080/v1/fragments/search?type=application/json
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" includes {{json_fragment_id}}

# 6. Search for fragments by minimum size
# The JSON fragment is larger than the others, so it should be the only one
GET http://localhost:8080/v1/fragments/search?minSize=100
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" includes {{json_fragment_id}}

# 7. Search with expand=1 to get full metadata
GET http://localhost:8080/v1/fragments/search?expanded=1
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
# Use a different approach to check for IDs in the expanded results
jsonpath "$.fragments[*].id" count >= 3
# Check some properties exist on the expanded results
jsonpath "$.fragments[*].type" exists
jsonpath "$.fragments[*].size" exists
jsonpath "$.fragments[*].created" exists

# 8. Clean up - delete the fragments
DELETE http://localhost:8080/v1/fragments/{{text_fragment_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200

DELETE http://localhost:8080/v1/fragments/{{md_fragment_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200

DELETE http://localhost:8080/v1/fragments/{{json_fragment_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
