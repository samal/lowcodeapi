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
- Count current endpoints: `cat file.json | jq '.routes | length'`
- Note the current `total_api` count in config

### 2. Research Latest API Documentation
- **MANDATORY**: Access the official API reference documentation from the provider
  - Use the URL from `config.api_link_ref` or `server/src/intents/README.md`
  - Navigate through the official documentation to find all available endpoints
  - Look for a complete list of resources/methods in the API reference
- Search for the latest official API reference documentation
- Create a comprehensive list of ALL available endpoints from official docs
- Identify new endpoints that are missing from the current file
- Note any changes to existing endpoints (new parameters, deprecated fields, etc.)
- **Verify each endpoint's exact path, method, parameters, and body structure from official docs**

### 3. Identify Missing Endpoints (Systematic Approach)
- **Create a systematic comparison** between official API documentation and current JSON file
- Cross-reference each resource/method in the official docs with the JSON file
- **Group missing endpoints by resource category** (e.g., Videos, Live Broadcasts, Captions)
- Create a checklist/todo list of missing endpoints to track progress
- Prioritize endpoints based on importance and usage
- **Verify endpoint paths match exactly** what's documented in the official API reference
- **Important**: Don't assume completeness - major resources may be entirely missing (e.g., Videos, Live Broadcasts)

### 4. Plan Incremental Updates (For Large APIs)

**When the official API has many endpoints (20+ missing endpoints), use an incremental approach:**

1. **Break down into atomic tasks**
   - Each endpoint or small group of related endpoints (2-5) should be an atomic task
   - Use the `todo_write` tool to create a structured task list
   - Group related endpoints by resource category (e.g., "Add Videos endpoints: list, insert, update, delete")

2. **Incremental addition strategy**
   - Add endpoints in batches of 5-10 at a time
   - Validate JSON after each batch to catch errors early
   - Update `total_api` count incrementally (or wait until all are added)
   - This prevents tool timeouts and keeps the file consistently valid

3. **Atomic task structure**
   - Each task should be specific and actionable
   - Example: "Add Videos/list endpoint" (not "Add all Videos endpoints")
   - Mark tasks as `in_progress` when working, `completed` when done
   - This provides clear progress tracking

4. **Maintain file validity**
   - After each batch, ensure JSON is valid: `cat file.json | jq empty`
   - Fix any syntax errors immediately before proceeding
   - Keep the file in a working state at all times

5. **Progress tracking**
   - Update todo list after each completed batch
   - Count routes periodically: `cat file.json | jq '.routes | length'`
   - Note which resource categories are complete

### 5. Add New Endpoints (Atomic Approach)

**IMPORTANT**: Before adding any endpoint, ensure you have:
- ✅ Verified the endpoint exists in the official API documentation
- ✅ Confirmed the exact endpoint path and HTTP method
- ✅ Reviewed all parameters, their types, and whether they're required
- ✅ Checked the request body schema if applicable
- ✅ Found the official API reference URL for the endpoint

**For each atomic task:**
1. Add 1-5 related endpoints (same resource category)
2. Validate JSON immediately: `cat file.json | jq empty`
3. Check for linting errors
4. Update todo list to mark task as completed
5. Proceed to next atomic task

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

### 6. Key Fields to Include

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

### 7. Update Configuration
After adding new endpoints:
- **Count routes to verify**: `cat file.json | jq '.routes | length'`
- Update `config.total_api` count to match the actual route count
- Update `config.updated_at` timestamp to current date/time (format: `YYYY-MM-DDTHH:mm:ss.sssZ`) 
- Ensure all metadata is accurate
- **Critical**: The `total_api` count MUST match the actual number of routes in the file

### 8. Validation Steps (MANDATORY)
1. **JSON Validation**: Ensure the JSON is valid using `jq` or similar tool
   ```bash
   cat file.json | jq empty && echo "JSON is valid"
   ```
   - If validation fails, fix syntax errors immediately
   - Common issues: missing commas, unclosed brackets, trailing commas

2. **Structure Validation**: Verify all required fields are present
   - Check that every endpoint has: `provider_alias_intent`, `text`, `category`, `method`, `type`, `meta.api_ref`
   - Verify `meta.api_endpoint` and `meta.alias_endpoint` are correctly formatted
   - Ensure `auth` configuration is present and correct

3. **Linter Check**: Run linter to catch any syntax errors
   ```bash
   # Use the read_lints tool or IDE linter
   ```

4. **Count Verification**: Count routes to ensure total_api matches
   ```bash
   cat file.json | jq '.routes | length'
   ```
   - **CRITICAL**: The count MUST match `config.total_api` exactly
   - If they don't match, update `config.total_api` to the actual count

5. **Completeness Check**: Verify all major resources are covered
   - Review the official API documentation index/list of resources
   - Ensure no major resource categories are missing
   - Check for common patterns: CRUD operations (List, Get, Create, Update, Delete)

### 9. Common Patterns

#### Batch API Endpoints:
- Create batch: POST `/v1/batches`
- List batches: GET `/v1/batches` with pagination params
- Retrieve batch: GET `/v1/batches/{batch_id}`
- Cancel batch: POST `/v1/batches/{batch_id}/cancel`
- **Note**: Some APIs support batch requests (e.g., YouTube, Google APIs) - check official docs for batch processing capabilities

#### Vector Store Endpoints:
- CRUD operations: POST, GET, POST (modify), DELETE `/v1/vector_stores/{vector_store_id}`
- File management: POST, GET, GET, DELETE `/v1/vector_stores/{vector_store_id}/files/{file_id}`
- Always include `OpenAI-Beta: assistants=v1` header

#### Standard CRUD Patterns:
- **List endpoints**: GET with pagination params (`limit`, `maxResults`, `pageToken`, `order`, `after`, `before`)
- **Retrieve endpoints**: GET with required path parameter or query parameter (usually `id`)
- **Create endpoints**: POST with required body fields, sometimes with file uploads (`type: "Upload"`)
- **Update endpoints**: PUT or POST with path parameter and optional body fields
- **Delete endpoints**: DELETE with required path parameter (usually `id`)

#### Upload Endpoints:
- Set `type: "Upload"` and `request_type: "Upload"` for file uploads
- Include `file` field in `body` with `type: "file"` and `required: true`
- Examples: Video uploads, image uploads, document uploads, caption files

#### Special Action Endpoints:
- Rate/Like endpoints: POST with rating parameter
- Report/Abuse endpoints: POST with report details
- Bind/Transition/Control endpoints: POST for state changes
- Download endpoints: GET that returns file content

### 10. Best Practices

#### Documentation Requirements (MANDATORY):
- **ALWAYS reference official API documentation** - This is not optional
- **Verify every endpoint** exists in the official API reference before adding
- **Copy parameter descriptions** directly from official documentation when possible
- **Use exact parameter names** as they appear in the official API
- **Include the official API reference link** (`meta.api_ref`) for every endpoint
- **Never assume endpoint structure** - always verify from official docs
- **Don't assume completeness** - major resources may be entirely missing from existing files

#### Systematic Approach (Incremental for Large APIs):
- **Create a comprehensive list** of all resources/methods from official docs first
- **Break down into atomic tasks** - each endpoint or small group (2-5) becomes a task
- **Use `todo_write` tool** to create structured task list with status tracking
- **Group endpoints by resource category** when creating tasks (e.g., "Videos endpoints", "Live Broadcasts endpoints")
- **Add endpoints incrementally** - work on one atomic task at a time
- **Validate after each atomic task** - ensure JSON is valid before proceeding
- **Update todo list** - mark tasks as `in_progress` when working, `completed` when done
- **Maintain file validity** throughout the process - don't break JSON structure
- **For large APIs (20+ endpoints)**: Add in batches of 5-10 endpoints per task to avoid timeouts

#### Quality Standards:
- Include comprehensive parameter descriptions from official docs
- Add examples where helpful (preferably from official documentation)
- Mark required fields explicitly based on official API requirements (`required: true`)
- Use consistent naming conventions that match the official API
- Maintain logical order within categories (List → Get → Create → Update → Delete → Special Actions)
- Update timestamps consistently (use same format: `YYYY-MM-DDTHH:mm:ss.sssZ`)
- Include API reference links for each endpoint (REQUIRED)
- Ensure `provider_proxy_intent` matches `provider_alias_intent` unless there's a special path (e.g., uploads)

#### Completeness Checklist:
- [ ] All major resources from official API docs are represented
- [ ] CRUD operations are complete for each resource (where applicable)
- [ ] Special action endpoints are included (rate, report, bind, transition, etc.)
- [ ] Upload endpoints are properly marked with `type: "Upload"`
- [ ] Batch request support is added if the API supports it
- [ ] All endpoint categories are logically organized

### 11. Atomic Task Management

#### Creating Atomic Tasks for Large API Updates

When updating an API with many missing endpoints, break the work into atomic, trackable tasks:

**Example Task Structure:**
```javascript
// Use todo_write tool to create tasks
todo_write({
  merge: false,
  todos: [
    {
      id: "1",
      status: "in_progress",
      content: "Add Videos endpoints: list, insert, update, delete"
    },
    {
      id: "2", 
      status: "pending",
      content: "Add Videos endpoints: rate, getRating, reportAbuse"
    },
    {
      id: "3",
      status: "pending", 
      content: "Add Captions endpoints: list, insert, update, delete, download"
    },
    {
      id: "4",
      status: "pending",
      content: "Add Live Broadcasts endpoints: list, insert, update, delete"
    },
    {
      id: "5",
      status: "pending",
      content: "Add Live Broadcasts special actions: bind, transition, control"
    }
  ]
})
```

**Task Management Best Practices:**
1. **One resource category per task** (or split large categories into multiple tasks)
2. **Keep tasks small** - 2-10 endpoints per task depending on complexity
3. **Update status immediately** - mark `in_progress` when starting, `completed` when done
4. **Validate after each task** - don't proceed if JSON is invalid
5. **Track progress** - review todo list to see what's remaining

**Incremental Update Workflow:**
```
1. Create comprehensive todo list from official API docs
2. Start with first task (mark as in_progress)
3. Add endpoints for that task
4. Validate JSON: cat file.json | jq empty
5. Check linter: read_lints
6. Mark task as completed
7. Move to next task
8. Repeat until all tasks complete
9. Final validation and count update
10. Update config.total_api with final count
```

**Benefits of Atomic Tasks:**
- ✅ Prevents tool timeouts on large updates
- ✅ Keeps JSON file valid throughout the process
- ✅ Clear progress tracking
- ✅ Easy to resume if interrupted
- ✅ Can validate incrementally
- ✅ Easier to debug issues (know exactly which task caused problems)

### 12. Examples: Adding API Endpoints

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

#### Example 3: YouTube Videos API Endpoint (Upload)
```json
{
  "provider_alias_intent": "/v3/videos",
  "provider_proxy_intent": "/v3/videos",
  "text": "Insert video",
  "category": "Videos",
  "method": "POST",
  "type": "Upload",
  "request_type": "Upload",
  "params": {
    "part": {
      "text": "The part parameter serves two purposes in this operation. It identifies the properties that the write operation will set as well as the properties that the API response will include",
      "type": "string",
      "required": true,
      "examples": "snippet,contentDetails,status"
    },
    "notifySubscribers": {
      "text": "The notifySubscribers parameter indicates whether YouTube should send a notification about the new video to users who subscribe to the video's channel",
      "type": "boolean"
    }
  },
  "path": {},
  "body": {
    "snippet": {
      "text": "The snippet object contains basic details about the video, including its title, description, and category",
      "type": "object",
      "required": true
    },
    "status": {
      "text": "The status object contains information about the video's uploading, processing, and privacy statuses",
      "type": "object"
    },
    "file": {
      "text": "The video file to upload",
      "type": "file",
      "required": true
    }
  },
  "custom_headers": {},
  "domain_params": {},
  "meta": {
    "auth": [],
    "api_ref": "https://developers.google.com/youtube/v3/docs/videos/insert",
    "version": "v3",
    "rate_limit": [],
    "description": "Uploads a video to YouTube and optionally sets the video's metadata",
    "api_endpoint": "https://www.googleapis.com/youtube/v3/videos",
    "alias_endpoint": "/youtube/v3/videos"
  },
  "auth": {
    "header": {
      "authKey": "api_key",
      "headerName": "Authorization",
      "headerValue": "Bearer"
    }
  },
  "response_format": {},
  "updated_at": "2025-01-28T12:00:00.000Z"
}
```

#### Example 4: YouTube Batch Requests Endpoint
```json
{
  "provider_alias_intent": "/v3/batch",
  "provider_proxy_intent": "/v3/batch",
  "text": "Batch requests",
  "category": "Batch",
  "method": "POST",
  "type": "API",
  "request_type": "API",
  "params": {},
  "path": {},
  "body": {
    "requests": {
      "text": "Array of API requests to batch process. Each request should include method, path, and body/params as needed",
      "type": "array",
      "required": true,
      "examples": [
        {
          "method": "GET",
          "path": "/v3/videos",
          "params": {
            "part": "snippet",
            "id": "VIDEO_ID"
          }
        }
      ]
    }
  },
  "custom_headers": {},
  "domain_params": {},
  "meta": {
    "auth": [],
    "api_ref": "https://developers.google.com/youtube/v3/guides/batch-processing",
    "version": "v3",
    "rate_limit": [],
    "description": "Combines multiple API calls into a single HTTP request to reduce the number of HTTP connections",
    "api_endpoint": "https://www.googleapis.com/batch/youtube/v3",
    "alias_endpoint": "/youtube/v3/batch"
  },
  "auth": {
    "header": {
      "authKey": "api_key",
      "headerName": "Authorization",
      "headerValue": "Bearer"
    }
  },
  "response_format": {},
  "updated_at": "2025-01-28T12:00:00.000Z"
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

### Sanitization and Quality:
- [ ] All emoji characters removed from text and description fields
- [ ] All routes have `provider_proxy_intent` field
- [ ] All routes have `request_type` field
- [ ] All routes have `response_format` field (empty object if not used)
- [ ] Invalid fields removed (`response_type`, empty `subdomain`, empty `payload_type`)
- [ ] All categories properly capitalized (Title Case)
- [ ] All params and body fields have `text` property with descriptions
- [ ] All endpoint texts are unique (no duplicates)
- [ ] Categories standardized (no sentence-like categories)

### Incremental Updates (For Large APIs):
- [ ] Created atomic task list using `todo_write` tool
- [ ] Tasks broken down by resource category (2-10 endpoints per task)
- [ ] JSON validated after each atomic task
- [ ] Todo list updated after each completed task
- [ ] File remained valid throughout the update process
- [ ] All atomic tasks marked as completed

## Notes

### Documentation Requirements:
- **ALWAYS verify endpoints in official API documentation before adding**
- **Never add endpoints based on assumptions, patterns, or similar APIs**
- **If official documentation is unclear, search for it or ask for clarification**
- **The official API reference is the single source of truth**
- **Major resources may be completely missing** - don't assume the file is complete

### Technical Guidelines:
- Always maintain backward compatibility with existing endpoints
- Follow the existing file's formatting and style
- Use consistent date/time format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Keep categories organized and logical (matching official API organization when possible)
- Document any special requirements or notes in endpoint descriptions
- When in doubt about endpoint structure, refer back to the official API documentation
- **Validate JSON frequently** during large updates to catch errors early
- **Count routes and update total_api** as the final step before completion

### 13. API Version Updates

When updating API versions (e.g., v3 to v4), follow this systematic approach:

#### Version Update Process:
1. **Update Config Object**:
   - Update `config.api_endpoint` to new version base URL
   - Update `config.api_link_ref` if documentation URL changed
   - Update `config.updated_at` timestamp

2. **Update All Endpoints**:
   - Replace version in `provider_alias_intent` (e.g., `/v3/` → `/v4/`)
   - Update `meta.api_endpoint` URLs to new version
   - Update `meta.alias_endpoint` paths to new version
   - Update `meta.version` field to new version string

3. **Batch Update Script Pattern**:
```python
import json
import re

with open('file.json', 'r') as f:
    data = json.load(f)

# Update config
data['config']['api_endpoint'] = "https://api.provider.com/v4"
data['config']['api_link_ref'] = "https://docs.provider.com/api/v4/"

# Update all routes
for route in data['routes']:
    # Update provider_alias_intent
    route['provider_alias_intent'] = route['provider_alias_intent'].replace('/v3/', '/v4/', 1)
    
    # Update api_endpoint
    if 'meta' in route and 'api_endpoint' in route['meta']:
        route['meta']['api_endpoint'] = route['meta']['api_endpoint'].replace('/api/v3/', '/api/v4/')
    
    # Update alias_endpoint
    if 'meta' in route and 'alias_endpoint' in route['meta']:
        route['meta']['alias_endpoint'] = route['meta']['alias_endpoint'].replace('/v3/', '/v4/', 1)
    
    # Update version
    if 'meta' in route:
        route['meta']['version'] = 'v4'

with open('file.json', 'w') as f:
    json.dump(data, f, indent=2)
```

4. **Add Missing API Reference Links**:
   - After version update, ensure all endpoints have `meta.api_ref` links
   - Update API reference links to point to new version documentation
   - Use pattern matching to assign appropriate API reference URLs based on endpoint paths

5. **Add Missing Endpoints**:
   - Compare with official API documentation for new version
   - Add any new endpoints introduced in the new version
   - Remove deprecated endpoints if necessary (check official docs)

### 14. Sanitization and Quality Improvements

After updating or adding endpoints, perform comprehensive sanitization to ensure file quality:

#### Sanitization Checklist:
1. **Remove Emoji Characters**: Clean all emoji characters (🚧, etc.) from `text` and `description` fields
2. **Add Missing Required Fields**:
   - Ensure all routes have `provider_proxy_intent` (should match `provider_alias_intent` if not set)
   - Ensure all routes have `request_type` (should match `type` field, typically "API")
   - Ensure all routes have `response_format` (empty object `{}` if not needed)
3. **Remove Empty/Invalid Fields**:
   - Remove `response_type` field (use `response_format` instead)
   - Remove empty `subdomain` fields
   - Remove empty `payload_type` fields
4. **Category Standardization**:
   - Capitalize all category names (Title Case)
   - Fix sentence-like categories to proper category names
   - Standardize multi-word categories (e.g., "notification settings" → "Notification Settings")
5. **Parameter and Body Field Descriptions**:
   - Ensure all `params` and `body` fields have `text` property with descriptive text
   - Use common parameter descriptions for standard fields (page, per_page, search, etc.)
   - Generate descriptions from parameter names if missing
6. **Endpoint Text Uniqueness**:
   - Ensure all endpoint `text` values are unique
   - Use full endpoint path context to create unique, descriptive texts
   - Include HTTP method and resource context in text descriptions
   - Avoid generic texts like "Projects", "Groups" - be specific (e.g., "List project access requests", "Get project by ID")

#### Sanitization Script Pattern:
```python
import json
import re
from collections import defaultdict, Counter

# Read file
with open('file.json', 'r') as f:
    data = json.load(f)

# 1. Remove emojis
def clean_text(text):
    if not text:
        return text
    text = re.sub(r'[\U0001F300-\U0001F9FF]', '', text)
    text = re.sub(r'[\u2600-\u27BF]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

# 2. Add missing fields
for route in data['routes']:
    if 'provider_proxy_intent' not in route:
        route['provider_proxy_intent'] = route['provider_alias_intent']
    if 'request_type' not in route:
        route['request_type'] = route.get('type', 'API')
    if 'response_format' not in route:
        route['response_format'] = {}
    
    # Remove invalid fields
    if 'response_type' in route:
        del route['response_type']
    if 'subdomain' in route and (not route['subdomain'] or route['subdomain'] == {}):
        del route['subdomain']
    if 'payload_type' in route and (not route['payload_type'] or route['payload_type'] == ''):
        del route['payload_type']
    
    # Clean text
    route['text'] = clean_text(route['text'])
    if 'meta' in route and 'description' in route['meta']:
        route['meta']['description'] = clean_text(route['meta']['description'])

# 3. Fix categories
category_mapping = {
    "projects": "Projects",
    "users": "Users",
    # ... add mappings
}
for route in data['routes']:
    if route['category'] in category_mapping:
        route['category'] = category_mapping[route['category']]
    else:
        # Title case
        route['category'] = ' '.join(word.capitalize() for word in route['category'].split())

# 4. Add missing param/body text descriptions
common_params = {
    'page': 'Page number',
    'per_page': 'Number of results per page',
    'search': 'Search query',
    # ... add common descriptions
}
for route in data['routes']:
    # Fix params
    if 'params' in route and route['params']:
        for param_name, param_def in route['params'].items():
            if isinstance(param_def, dict) and 'text' not in param_def:
                param_def['text'] = common_params.get(param_name, param_name.replace('_', ' ').title())
    
    # Fix body
    if 'body' in route and route['body']:
        for body_name, body_def in route['body'].items():
            if isinstance(body_def, dict) and 'text' not in body_def:
                body_def['text'] = common_params.get(body_name, body_name.replace('_', ' ').title())

# 5. Ensure unique endpoint texts
text_to_routes = defaultdict(list)
for route in data['routes']:
    text_to_routes[route['text']].append(route)

for text, routes in text_to_routes.items():
    if len(routes) > 1:
        # Make each unique using full path context
        for route in routes:
            intent = route['provider_alias_intent']
            method = route['method']
            path = intent.replace('/v4/', '').strip('/')
            # Generate unique text based on path and method
            # ... implementation

# Write back
with open('file.json', 'w') as f:
    json.dump(data, f, indent=2)
```

#### Validation After Sanitization:
```bash
# Check for duplicates
cat file.json | jq -r '.routes[] | .text' | sort | uniq -d

# Verify all have required fields
cat file.json | jq '.routes[] | select(.provider_proxy_intent == null or .request_type == null)'

# Check for empty param/body texts
cat file.json | jq '.routes[] | select(.params != {} and (.params | to_entries[] | .value.text == null))'

# Verify JSON validity
cat file.json | jq empty && echo "✅ JSON is valid"
```

#### Common Issues to Fix:
- **Emoji characters**: Remove all emoji Unicode characters from text fields
- **Missing provider_proxy_intent**: Should match provider_alias_intent for standard endpoints
- **Missing request_type**: Should be "API" for standard API calls, "Upload" for file uploads
- **Empty response_format**: Add empty object `{}` if not used
- **Generic categories**: "projects" → "Projects", "Get a namespaces list" → "Namespaces"
- **Missing param descriptions**: All params and body fields must have `text` property
- **Duplicate texts**: Each endpoint must have a unique `text` value based on its full path and method

