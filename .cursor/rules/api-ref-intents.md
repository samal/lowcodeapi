# Process for Updating API Intent JSON Files

## Overview
This document outlines the exact process for updating API intent JSON files (e.g., `openai.json`, `anthropic.json`) with new or updated API endpoints based on official API documentation.

## Step-by-Step Process

### 1. Analyze Current File Structure
- Read the existing JSON file to understand its structure
- Identify the current endpoints and their organization
- Note the existing categories and patterns used

### 2. Research Latest API Documentation
- Search for the latest official API reference documentation
- Identify new endpoints that are missing from the current file
- Note any changes to existing endpoints (new parameters, deprecated fields, etc.)

### 3. Identify Missing Endpoints
- Compare the official API documentation with the current JSON file
- List all missing endpoints by category
- Prioritize endpoints based on importance and usage

### 4. Add New Endpoints
For each new endpoint, create a route object with the following structure:

```json
{
  "provider_alias_intent": "/v1/endpoint/path",
  "text": "Human readable name",
  "category": "Category Name",
  "method": "HTTP_METHOD",
  "type": "API" or "Upload",
  "params": {
    "param_name": {
      "type": "string|number|array|object|boolean",
      "text": "Description of the parameter",
      "required": true|false,
      "examples": "example value"
    }
  },
  "custom_headers": {
    "Header-Name": "header value"
  },
  "body": {
    "field_name": {
      "type": "string|number|array|object|boolean|file",
      "text": "Description of the field",
      "required": true|false,
      "examples": "example value",
      "enum": ["option1", "option2"]
    }
  },
  "path": {
    "path_param": {
      "type": "string",
      "text": "Description",
      "required": true
    }
  },
  "domain_params": {},
  "meta": {
    "version": "v1",
    "auth": [],
    "description": "Endpoint description",
    "rate_limit": [],
    "api_endpoint": "https://api.provider.com/v1/endpoint/path",
    "alias_endpoint": "/provider/v1/endpoint/path",
    "api_ref": "https://platform.provider.com/docs/api-reference/endpoint"
  },
  "auth": {
    "header": {
      "headerName": "Authorization",
      "headerValue": "Bearer",
      "authKey": "api_key"
    }
  },
  "payload_type": "",
  "updated_at": "YYYY-MM-DDTHH:mm:ss.sssZ"
}
```

### 5. Key Fields to Include

#### Required Fields:
- `provider_alias_intent`: The API endpoint path (e.g., `/v1/batches`)
- `text`: Human-readable name for the endpoint
- `category`: Category grouping (e.g., "Batch", "Vector Stores", "Chat")
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `type`: Either "API" for standard requests or "Upload" for file uploads
- `meta.api_endpoint`: Full URL to the API endpoint
- `meta.alias_endpoint`: Alias path for the provider
- `meta.api_ref`: Link to official API documentation

#### Parameter Types:
- **Query Parameters**: Add to `params` object
- **Path Parameters**: Add to both `params` and `path` objects
- **Request Body**: Add to `body` object
- **File Uploads**: Use `type: "file"` in body

#### Special Headers:
- For beta APIs (e.g., Assistants API, Vector Stores), add:
  ```json
  "custom_headers": {
    "OpenAI-Beta": "assistants=v1"
  }
  ```

### 6. Update Configuration
After adding new endpoints:
- Update `config.total_api` count to reflect the new total
- Update `config.updated_at` timestamp to current date/time
- Ensure all metadata is accurate

### 7. Validation Steps
1. **JSON Validation**: Ensure the JSON is valid using `jq` or similar tool
   ```bash
   cat file.json | jq empty && echo "JSON is valid"
   ```

2. **Structure Validation**: Verify all required fields are present
3. **Linter Check**: Run linter to catch any syntax errors
4. **Count Verification**: Count routes to ensure total_api matches
   ```bash
   cat file.json | jq '.routes | length'
   ```

### 8. Common Patterns

#### Batch API Endpoints:
- Create batch: POST `/v1/batches`
- List batches: GET `/v1/batches` with pagination params
- Retrieve batch: GET `/v1/batches/{batch_id}`
- Cancel batch: POST `/v1/batches/{batch_id}/cancel`

#### Vector Store Endpoints:
- CRUD operations: POST, GET, POST (modify), DELETE `/v1/vector_stores/{vector_store_id}`
- File management: POST, GET, GET, DELETE `/v1/vector_stores/{vector_store_id}/files/{file_id}`
- Always include `OpenAI-Beta: assistants=v1` header

#### Standard Patterns:
- List endpoints: GET with `limit`, `order`, `after`, `before` pagination params
- Retrieve endpoints: GET with required path parameter
- Create endpoints: POST with required body fields
- Update endpoints: POST with path parameter and optional body fields
- Delete endpoints: DELETE with required path parameter

### 9. Best Practices
- Always reference official API documentation
- Include comprehensive parameter descriptions
- Add examples where helpful
- Mark required fields explicitly
- Use consistent naming conventions
- Maintain chronological order within categories
- Update timestamps consistently
- Include API reference links for each endpoint

### 10. Example: Adding Batch API Endpoints

```json
{
  "provider_alias_intent": "/v1/batches",
  "text": "Create batch",
  "category": "Batch",
  "method": "POST",
  "type": "API",
  "params": {},
  "custom_headers": {},
  "body": {
    "input_file_id": {
      "type": "string",
      "text": "The ID of an uploaded file that contains requests for the new batch",
      "required": true
    },
    "endpoint": {
      "type": "string",
      "text": "The endpoint to be used for the batch",
      "required": true,
      "examples": "/v1/chat/completions"
    }
  },
  "path": {},
  "domain_params": {},
  "meta": {
    "version": "v1",
    "auth": [],
    "description": "Creates a batch job that processes multiple requests asynchronously",
    "rate_limit": [],
    "api_endpoint": "https://api.openai.com/v1/batches",
    "alias_endpoint": "/openai/v1/batches",
    "api_ref": "https://platform.openai.com/docs/api-reference/batch/create"
  },
  "auth": {
    "header": {
      "headerName": "Authorization",
      "headerValue": "Bearer",
      "authKey": "api_key"
    }
  },
  "payload_type": "",
  "updated_at": "2025-11-11T15:34:13.464Z"
}
```

## Checklist Before Completion
- [ ] All new endpoints added with complete structure
- [ ] All required fields populated
- [ ] Parameter types and descriptions accurate
- [ ] Custom headers added where needed
- [ ] API reference links included
- [ ] `total_api` count updated
- [ ] `updated_at` timestamp updated
- [ ] JSON validation passed
- [ ] Linter checks passed
- [ ] Route count matches `total_api`

## Notes
- Always maintain backward compatibility with existing endpoints
- Follow the existing file's formatting and style
- Use consistent date/time format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Keep categories organized and logical
- Document any special requirements or notes in endpoint descriptions

