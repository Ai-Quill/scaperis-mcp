# WebScrapAI API Technical Reference

## GET Data API Implementation Details

This document provides technical details about the implementation of the `/api/get_data` endpoint for developers who need to maintain or extend the API.

### File Location

```
app/api/get_data/route.tsx
```

### Dependencies

- **@/utils/supabase-admin**: For API key validation
- **@/utils/supabase/server**: For Supabase client creation
- **export-to-csv**: For CSV generation
- **fast-xml-parser**: For XML parsing and building
- **next/server**: For NextRequest and NextResponse types

### Authentication Flow

1. The API key is extracted from either:
   - The `api_key` query parameter
   - The `x-api-key` request header
2. The API key is validated using the `isValidateAPIKey` function from `@/utils/supabase-admin`
3. If the API key is invalid, a 401 Unauthorized response is returned

### Data Retrieval Process

1. The chat ID is extracted from the `chat_id` query parameter
2. The API queries the Supabase `scrapers` table for a record matching:
   - The provided chat ID
   - The user ID associated with the API key
3. The query also retrieves related `runners` data using a join
4. If no scraper is found, a 404 Not Found response is returned
5. The API sorts the runners by ID in descending order to get the most recent one
6. If no runner or result is found, a 404 Not Found response is returned

### Format Handling

The API supports multiple output formats, controlled by the `format` query parameter:

#### JSON (default)

- Returns the raw result data as JSON
- Content-Type: `application/json`

#### CSV

- Uses the `export-to-csv` library to convert the data to CSV
- Handles both array and object data structures
- Content-Type: `text/csv`

#### XML

- Uses the `fast-xml-parser` library to convert JSON to XML
- Handles both array and object data structures
- Content-Type: `application/xml`

#### Markdown (MD)

- Returns the markdown result directly from the runner
- Content-Type: `text/markdown`

#### Screenshot

- Retrieves the screenshot from either:
  - The runner's screenshot field
  - The scraper's screenshot field
- Creates a signed URL for the screenshot from Supabase storage
- Fetches the image and returns it as a blob
- Content-Type: `image/jpeg`

#### Quick

- Returns both markdown content and screenshot URL in a single JSON response
- Uses NextResponse.json() to return a structured JSON response
- Includes additional metadata like status, chat_id, and timestamp
- Response structure:

  ```json
  {
    "markdown": "Markdown content from the runner",
    "screenshot": {
      "url": "Signed URL to the screenshot in Supabase storage"
    },
    "status": "Current status of the scraper",
    "chat_id": "The chat ID from the request",
    "timestamp": "ISO timestamp of when the response was generated"
  }
  ```

- If no screenshot is available, the screenshot field will be null
- Content-Type: `application/json`

### Data Structure

The API expects the following data structure in the Supabase database:

#### scrapers table

- `id`: Unique identifier
- `user_id`: ID of the user who owns the scraper
- `status`: Current status of the scraper
- `screenshot`: Path to the screenshot in Supabase storage
- `chat_id`: Unique identifier for the chat session

#### runners table

- `id`: Unique identifier
- `result`: The scraped data result
- `md_result`: The scraped data in Markdown format
- `screenshot`: Path to the screenshot in Supabase storage

### Error Handling

The API includes comprehensive error handling for various scenarios:

- Missing chat ID: 400 Bad Request
- Invalid API key: 401 Unauthorized
- Scraper not found: 404 Not Found
- No data found: 404 Not Found
- Screenshot not found: 404 Not Found
- Error generating CSV: Returns "error" as response
- Storage errors: 500 Internal Server Error

### Future Improvements

Potential areas for improvement in the API implementation:

1. Add pagination for large datasets
2. Implement caching for frequently accessed data
3. Add rate limiting to prevent abuse
4. Expand XML implementation (currently marked with TODO)
5. Add more detailed error messages and logging
6. Implement request validation middleware
7. Add support for additional output formats (e.g., Excel, PDF)
8. Implement data filtering options
