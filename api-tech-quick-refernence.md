# WebScrapAI API Quick Reference

## GET Data API

### Base URL
```
https://your-domain.com/api/get_data
```

### Authentication
API key required via:
- Query parameter: `api_key=your_api_key`
- Header: `x-api-key: your_api_key`

### Parameters

| Parameter | Required | Description                                      |
|-----------|----------|--------------------------------------------------|
| chat_id   | Yes      | Chat/scraping session ID                         |
| format    | No       | Output format: `json` (default), `csv`, `xml`, `md`, `screenshot`, `quick` |

### Example Requests

#### Basic JSON Request
```bash
curl -X GET "https://your-domain.com/api/get_data?chat_id=123456&api_key=your_api_key"
```

#### CSV Format
```bash
curl -X GET "https://your-domain.com/api/get_data?chat_id=123456&format=csv&api_key=your_api_key"
```

#### Using Header Authentication
```bash
curl -X GET "https://your-domain.com/api/get_data?chat_id=123456&format=json" \
  -H "x-api-key: your_api_key"
```

#### Screenshot Request
```bash
curl -X GET "https://your-domain.com/api/get_data?chat_id=123456&format=screenshot&api_key=your_api_key" \
  --output screenshot.jpg
```

#### Quick Format (Markdown + Screenshot URL)
```bash
curl -X GET "https://your-domain.com/api/get_data?chat_id=123456&format=quick&api_key=your_api_key"
```

### Response Codes

| Code | Meaning                                           |
|------|---------------------------------------------------|
| 200  | Success (also returned for quick format when data is still processing) |
| 400  | Bad Request (missing chat_id)                     |
| 401  | Unauthorized (invalid API key)                    |
| 404  | Not Found (scraper or data not found)             |
| 500  | Server Error                                      |

### Common Errors

```json
{"error": "Chat ID not provided", "status": "failed"}
{"error": "Invalid API Key", "status": "failed"}
{"error": "Scraper not found", "status": "failed"}
{"error": "No data found", "status": "scraper_status"}
{"error": "Screenshot not found"}
```

For the quick format, when data is still being processed:
```json
{
  "processing": true,
  "message": "Data is being processed",
  "status": "running",
  "chat_id": "123456",
  "scraper_id": 1234,
  "timestamp": "2023-03-07T16:22:35.290Z"
}
```

### Content Types

- JSON: `application/json`
- CSV: `text/csv`
- XML: `application/xml`
- Markdown: `text/markdown`
- Screenshot: `image/jpeg`
- Quick: `application/json` (includes markdown and screenshot URL)

### Notes
- Returns the most recent scraping result for the specified chat ID
- User must own the scraper to access its data
- The quick format provides both markdown content and screenshot URL in a single response
- The quick format returns a 200 status code with processing status when data is still being processed
- Other formats return 404 when data is not available 