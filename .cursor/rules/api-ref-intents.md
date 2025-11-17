# Process for Updating API Intent JSON Files

## Overview
This document outlines the exact process for updating API intent JSON files (e.g., `openai.json`, `anthropic.json`) with new or updated API endpoints based on official API documentation.

## ⚠️ CRITICAL REQUIREMENT: Always Reference Official API Documentation

**BEFORE adding or updating any API endpoint, you MUST:**

1. **Access the official API reference documentation** for the provider
   - Find the API reference URL in the `config.api_link_ref` field of the JSON file
   - Or check the `server/src/intents/README.md` for the provider's documentation link
   - Examples:
     - For OpenAI, use `https://platform.openai.com/docs/api-reference/introduction`
     - For Anthropic, use `https://docs.anthropic.com/en/api/overview`

2. **Verify endpoint existence and structure** from the official documentation
   - Never add endpoints based on assumptions or patterns alone
   - Always confirm the exact endpoint path, HTTP method, and parameters from official docs
   - Check for required vs optional parameters
   - Verify request/response schemas

3. **Use official documentation as the single source of truth**
   - Copy parameter descriptions directly from official docs when possible
   - Follow the exact naming conventions used in the official API
   - Include the official API reference link in `meta.api_ref` for each endpoint

4. **If official documentation is unavailable or unclear:**
   - Search the web for the provider's official API documentation
   - Check the provider's GitHub repository for API documentation
   - Look for OpenAPI/Swagger specifications
   - **DO NOT** add endpoints without verification from official sources

## Step-by-Step Process

### 1. Analyze Current File Structure
- Read the existing JSON file to understand its structure
- Identify the current endpoints and their organization
- Note the existing categories and patterns used
- **Check `config.api_link_ref` for the official API documentation URL**

### 2. Research Latest API Documentation
- **MANDATORY**: Access the official API reference documentation from the provider
  - Use the URL from `config.api_link_ref` or `server/src/intents/README.md`
  - Navigate through the official documentation to find all available endpoints
- Search for the latest official API reference documentation
- Identify new endpoints that are missing from the current file
- Note any changes to existing endpoints (new parameters, deprecated fields, etc.)
- **Verify each endpoint's exact path, method, parameters, and body structure from official docs**

### 3. Identify Missing Endpoints
- **Compare the official API documentation with the current JSON file**
- Cross-reference each endpoint in the official docs with the JSON file
- List all missing endpoints by category
- Prioritize endpoints based on importance and usage
- **Verify endpoint paths match exactly** what's documented in the official API reference

### 4. Add New Endpoints
**IMPORTANT**: Before adding any endpoint, ensure you have:
- ✅ Verified the endpoint exists in the official API documentation
- ✅ Confirmed the exact endpoint path and HTTP method
- ✅ Reviewed all parameters, their types, and whether they're required
- ✅ Checked the request body schema if applicable
- ✅ Found the official API reference URL for the endpoint

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
  - **MUST match exactly** as documented in the official API reference
- `text`: Human-readable name for the endpoint
  - **Should match** the endpoint name from official documentation
- `category`: Category grouping (e.g., "Batch", "Vector Stores", "Chat")
  - **Should align** with how the provider categorizes endpoints in their docs
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
  - **MUST match exactly** the method specified in official documentation
- `type`: Either "API" for standard requests or "Upload" for file uploads
- `meta.api_endpoint`: Full URL to the API endpoint
  - **MUST match exactly** the base URL + endpoint path from official docs
- `meta.alias_endpoint`: Alias path for the provider
  - Format: `/provider_name/v1/endpoint/path`
- `meta.api_ref`: **Link to official API documentation for this specific endpoint**
  - **REQUIRED**: Must point to the exact endpoint documentation page
  - Examples:
    - OpenAI: `https://platform.openai.com/docs/api-reference/batch/create`
    - Anthropic: `https://docs.anthropic.com/en/api/messages`

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

#### Documentation Requirements (MANDATORY):
- **ALWAYS reference official API documentation** - This is not optional
- **Verify every endpoint** exists in the official API reference before adding
- **Copy parameter descriptions** directly from official documentation when possible
- **Use exact parameter names** as they appear in the official API
- **Include the official API reference link** (`meta.api_ref`) for every endpoint
- **Never assume endpoint structure** - always verify from official docs

#### Quality Standards:
- Include comprehensive parameter descriptions from official docs
- Add examples where helpful (preferably from official documentation)
- Mark required fields explicitly based on official API requirements
- Use consistent naming conventions that match the official API
- Maintain chronological order within categories
- Update timestamps consistently
- Include API reference links for each endpoint (REQUIRED)

### 10. Examples: Adding API Endpoints

#### Example 1: OpenAI Batch API Endpoint

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

#### Example 2: Anthropic Messages API Endpoint

```json
{
  "provider_alias_intent": "/v1/messages",
  "text": "Create message",
  "category": "Messages",
  "method": "POST",
  "type": "API",
  "params": {},
  "custom_headers": {
    "anthropic-version": "2023-06-01"
  },
  "body": {
    "model": {
      "type": "string",
      "text": "The model that will complete your prompt",
      "required": true,
      "examples": "claude-3-5-sonnet-20241022"
    },
    "max_tokens": {
      "type": "number",
      "text": "The maximum number of tokens to generate before stopping",
      "required": true
    },
    "messages": {
      "type": "array",
      "text": "The messages that make up the conversation so far",
      "required": true
    },
    "system": {
      "type": "array",
      "text": "System prompt"
    },
    "temperature": {
      "type": "number",
      "text": "Amount of randomness injected into the response"
    }
  },
  "path": {},
  "domain_params": {},
  "meta": {
    "version": "v1",
    "auth": [],
    "description": "Create a message",
    "rate_limit": [],
    "api_endpoint": "https://api.anthropic.com/v1/messages",
    "alias_endpoint": "/anthropic/v1/messages",
    "api_ref": "https://docs.anthropic.com/en/api/messages"
  },
  "auth": {
    "header": {
      "headerName": "x-api-key",
      "headerValue": "",
      "authKey": "api_key"
    }
  },
  "payload_type": "",
  "updated_at": "2025-11-11T15:34:13.464Z"
}
```

## Checklist Before Completion

### Documentation Verification (MANDATORY):
- [ ] **All endpoints verified in official API reference documentation**
- [ ] **Official API documentation URL accessed and reviewed**
- [ ] **Each endpoint's path, method, and parameters match official docs exactly**
- [ ] **All `meta.api_ref` links point to official documentation pages**
- [ ] **Parameter descriptions copied/verified from official documentation**

### Structure and Quality:
- [ ] All new endpoints added with complete structure
- [ ] All required fields populated
- [ ] Parameter types and descriptions accurate (verified from official docs)
- [ ] Custom headers added where needed (as documented in official API)
- [ ] API reference links included for every endpoint
- [ ] `total_api` count updated
- [ ] `updated_at` timestamp updated
- [ ] JSON validation passed
- [ ] Linter checks passed
- [ ] Route count matches `total_api`

## Notes

### Documentation Requirements:
- **ALWAYS verify endpoints in official API documentation before adding**
- **Never add endpoints based on assumptions, patterns, or similar APIs**
- **If official documentation is unclear, search for it or ask for clarification**
- **The official API reference is the single source of truth**

### Technical Guidelines:
- Always maintain backward compatibility with existing endpoints
- Follow the existing file's formatting and style
- Use consistent date/time format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Keep categories organized and logical (matching official API organization when possible)
- Document any special requirements or notes in endpoint descriptions
- When in doubt about endpoint structure, refer back to the official API documentation

