# 404 Not Found Test
# Test that requesting a non-existent route returns a proper 404 response

GET http://localhost:8080/no-such-route

# We should get back an HTTP 1.1 404 response
HTTP/1.1 404

# Extra checks to perform against the response
[Asserts]
# Verify we get JSON response with proper error structure
jsonpath "$.status" == "error"
# Check that the error object exists and has the expected properties
jsonpath "$.error" isCollection
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "not found"
