// tests/integration/format-conversion.hurl
# Integration tests for format conversion functionality

# 1. Create a markdown fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
```
# Markdown Test
This is a **markdown** test with some *formatting*.

- List item 1
- List item 2
```

# Confirm creation succeeded and save the URL
HTTP/1.1 201
[Captures]
fragment_url: header "Location"
fragment_id: jsonpath "$.fragment.id"

# 2. Get the fragment as HTML
GET {{fragment_url}}.html
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and HTML content type
HTTP/1.1 200
Content-Type: text/html
[Asserts]
body contains "<h1>Markdown Test</h1>"
body contains "<strong>markdown</strong>"
body contains "<em>formatting</em>"
body contains "<li>List item 1</li>"
body contains "<li>List item 2</li>"

# 3. Get the fragment as plain text
GET {{fragment_url}}.txt
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and plain text content type
HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "# Markdown Test"
body contains "**markdown**"
body contains "*formatting*"
body contains "- List item 1"
body contains "- List item 2"

# 4. Create a JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
```
{
  "name": "Test User",
  "email": "test@example.com",
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}
```

# Confirm creation succeeded and save the URL
HTTP/1.1 201
[Captures]
json_url: header "Location"
json_id: jsonpath "$.fragment.id"

# 5. Get the JSON fragment as YAML
GET {{json_url}}.yaml
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and YAML content type
HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
body contains "name: Test User"
body contains "email: test@example.com"
body contains "theme: dark"
body contains "notifications: true"

# 6. Get the JSON fragment as text
GET {{json_url}}.txt
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and text content type
HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body contains "\"name\": \"Test User\""
body contains "\"email\": \"test@example.com\""
body contains "\"theme\": \"dark\""
body contains "\"notifications\": true"

# 7. Create a CSV fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/csv
[BasicAuth]
user1@email.com:password1
```
name,age,email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com
```

# Confirm creation succeeded and save the URL
HTTP/1.1 201
[Captures]
csv_url: header "Location"
csv_id: jsonpath "$.fragment.id"

# 8. Get the CSV fragment as JSON
GET {{csv_url}}.json
[BasicAuth]
user1@email.com:password1

# Confirm 200 status and JSON content type
HTTP/1.1 200
Content-Type: application/json
[Asserts]
body contains "\"name\": \"John Doe\""
body contains "\"age\": \"30\""
body contains "\"email\": \"john@example.com\""
body contains "\"name\": \"Jane Smith\""
body contains "\"age\": \"25\""
body contains "\"email\": \"jane@example.com\""

# 9. Try an unsupported conversion
GET {{fragment_url}}.xyz
[BasicAuth]
user1@email.com:password1

# Confirm 415 status for unsupported format
HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" matches /Cannot convert fragment to xyz/

# 10. Clean up - delete all fragments
DELETE {{fragment_url}}
[BasicAuth]
user1@email.com:password1
HTTP/1.1 200

DELETE {{json_url}}
[BasicAuth]
user1@email.com:password1
HTTP/1.1 200

DELETE {{csv_url}}
[BasicAuth]
user1@email.com:password1
HTTP/1.1 200
