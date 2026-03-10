# Legacy Customer Data Import

A production-grade backend system for importing customer records from CSV files. Built with Node.js, Express, MongoDB, and Redis-backed job queues for asynchronous processing.

## Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) v20+ (for running tests locally)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/brandontwj1/customer-import.git
   cd customer-import
   ```

2. Create a `.env` file from the example and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Example `.env`:
   ```env
   MONGO_ROOT_USERNAME=admin
   MONGO_ROOT_PASSWORD=secret
   DB_NAME=customer_import
   PORT=3000
   IMPORT_WORKER_CONCURRENCY=5
   NODE_ENV=production
   ```

3. Start the entire stack:
   ```bash
   docker compose up
   ```

This brings up five services:

| Service          | Description                          | URL                        |
|------------------|--------------------------------------|----------------------------|
| **app**          | Express API server                   | `http://localhost:3000`    |
| **worker**       | Background import worker             | —                          |
| **mongodb**      | MongoDB database                     | `localhost:27017`          |
| **redis**        | Redis (Bull job queue)               | `localhost:6379`           |
| **mongodb-express** | Mongo Express web UI (dev/debug)  | `http://localhost:8081`    |

Mongo Express is included in the Docker Compose configuration to provide a web-based GUI for inspecting the MongoDB database during development and manual testing. It is accessible at `http://localhost:8081`.

## API Usage Examples

All error responses follow a consistent format:

```json
{ "error": "<message>", "status": <code> }
```

---

### Health Check

```
GET /
```

```bash
curl http://localhost:3000/
```

**Response** `200 OK`
```json
{ "status": "ok" }
```

---

### Import CSV

```
POST /api/import
Content-Type: multipart/form-data
```

Upload a CSV file for asynchronous processing. The file must be sent as a `file` field in multipart form-data. Returns a job ID immediately — the file is processed by the worker in the background.

**Expected CSV format:**
```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-05-15,America/New_York
Jane Smith,jane@example.com,1985-08-22,Europe/London
```

Example CSV files are available in the `tests/fixtures/` directory (`valid/`, `invalid/`, `mixed/`) and can be used to try out the import endpoint.

```bash
curl -X POST http://localhost:3000/api/import \
  -F "file=@customers.csv"
```

> Replace `customers.csv` with the path to the CSV file you want to upload. Example files are provided in the `tests/fixtures/` directory.

```bash
curl -X POST http://localhost:3000/api/import \
  -F "file=@tests/fixtures/valid/customers.csv"
```

**Response** `202 Accepted`
```json
{ "id": "665f1a2b3c4d5e6f7a8b9c0d" }
```

**Error** `400 Bad Request` — no file attached
```json
{ "error": "No file uploaded", "status": 400 }
```

---

### Get Import Job by ID

```
GET /api/import/:id
```

Returns the full import job document including processing results and any rejected records with per-row error details.

```bash
curl http://localhost:3000/api/import/665f1a2b3c4d5e6f7a8b9c0d
```

**Response** `200 OK`
```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "filename": "customers.csv",
  "status": "completed",
  "totalRecords": 100,
  "successCount": 99,
  "failedCount": 1,
  "rejectedRecords": [
    {
      "row": 5,
      "data": {
        "full_name": "",
        "email": "bad",
        "date_of_birth": "2099-01-01",
        "timezone": "Invalid"
      },
      "errorMsgs": [
        "full_name must be a non-empty string",
        "Invalid email format",
        "date_of_birth must be in the past",
        "Invalid IANA timezone"
      ],
      "_id": "665f1a2b3c4d5e6f7a8b9c0d"
    }
  ],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:05.000Z"
}
```

Job statuses: `pending` → `processing` → `completed` || `failed`.

**Error** `404 Not Found` — invalid or non-existent ID
```json
{ "error": "Import job not found", "status": 404 }
```

---

### List Import Jobs (Paginated)

```
GET /api/import?page=1&limit=10
```

| Query Param | Default | Constraints             |
|-------------|---------|-------------------------|
| `page`      | 1       | Must be ≥ 1             |
| `limit`     | 20      | Must be ≥ 1 and ≤ 100   |

```bash
curl "http://localhost:3000/api/import?page=1&limit=10"
```

**Response** `200 OK`
```json
{
  "data": [ { "_id": "...", "filename": "...", "status": "completed", ... } ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

Results are sorted by `createdAt` descending (most recent first).

**Error** `400 Bad Request` — invalid page and limit parameters
```json
{ "error": "Page and limit must be a positive integer", "status": 400 }
```
**Error** `400 Bad Request` — limit parameter exceeds 100
```json
{ "error": "Limit must not exceed 100", "status": 400 }
```
---

### List Customers (Paginated)

```
GET /api/customers?page=1&limit=20
```

| Query Param | Default | Constraints             |
|-------------|---------|-------------------------|
| `page`      | 1       | Must be ≥ 1             |
| `limit`     | 20      | Must be ≥ 1 and ≤ 100   |

```bash
curl "http://localhost:3000/api/customers?page=1&limit=20"
```

**Response** `200 OK`
```json
{
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7a8b9c0e",
      "full_name": "Emily Roberts",
      "email": "emily.roberts100@example.com",
      "date_of_birth": "1993-05-17T00:00:00.000Z",
      "timezone": "America/Toronto",
      "createdAt": "2025-01-15T10:30:01.000Z",
      "updatedAt": "2025-01-15T10:30:01.000Z"
    },
    ...
  ],
  "total": 99,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

Results are sorted by `createdAt` descending (most recent first).

---

### Get Customer by ID

```
GET /api/customers/:id
```

```bash
curl http://localhost:3000/api/customers/665f1a2b3c4d5e6f7a8b9c0e
```

**Response** `200 OK`
```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0e",
  "full_name": "Emily Roberts",
  "email": "emily.roberts100@example.com",
  "date_of_birth": "1993-05-17T00:00:00.000Z",
  "timezone": "America/Toronto",
  "createdAt": "2025-01-15T10:30:01.000Z",
  "updatedAt": "2025-01-15T10:30:01.000Z"
}
```

**Error** `404 Not Found`
```json
{ "error": "Customer not found", "status": 404 }
```

**Error** `400 Bad Request` — malformed ObjectId
```json
{ "error": "Invalid customer ID", "status": 400 }
```

---

### Update Customer

```
PUT /api/customers/:id
Content-Type: application/json
```

Partial updates are supported. Only `full_name`, `email`, `date_of_birth`, and `timezone` are accepted. All validation rules are enforced (unique email, past date of birth, valid IANA timezone). At least one field must be provided.

```bash
curl -X PUT http://localhost:3000/api/customers/665f1a2b3c4d5e6f7a8b9c0e \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Jane Doe", "timezone": "Europe/London"}'
```

**Response** `200 OK` — returns the updated customer document
```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0e",
  "full_name": "Jane Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-05-15T00:00:00.000Z",
  "timezone": "Europe/London",
  "createdAt": "2025-01-15T10:30:01.000Z",
  "updatedAt": "2025-01-15T10:35:00.000Z"
}
```

**Error** `400 Bad Request` — no fields provided
```json
{ "error": "No fields provided for update", "status": 400 }
```

**Error** `400 Bad Request` — unknown fields
```json
{ "error": "Unknown field(s) provided for update", "status": 400 }
```

**Error** `409 Conflict` — duplicate email
```json
{ "error": "Email already exists in the database.", "status": 409 }
```

**Error** `404 Not Found`
```json
{ "error": "Customer not found", "status": 404 }
```

---

### Delete Customer

```
DELETE /api/customers/:id
```

```bash
curl -X DELETE http://localhost:3000/api/customers/665f1a2b3c4d5e6f7a8b9c0e
```

**Response** `204 No Content` — empty body on success.

**Error** `404 Not Found`
```json
{ "error": "Customer not found", "status": 404 }
```

**Error** `400 Bad Request` — malformed ObjectId
```json
{ "error": "Invalid customer ID", "status": 400 }
```

## CSV Format

```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-05-15,America/New_York
Jane Smith,jane@example.com,1985-08-22,Europe/London
```

| Field          | Validation                                              | Required |
|----------------|---------------------------------------------------------|----------|
| `full_name`    | Non-empty string                                        | Yes      |
| `email`        | Valid email format, unique in database                   | No       |
| `date_of_birth`| ISO 8601 date (YYYY-MM-DD), must be in the past         | No       |
| `timezone`     | Valid IANA timezone (e.g. `America/New_York`)            | No       |

## Testing

Install dependencies locally (one-time):

```bash
npm install
```

Run all tests with coverage:

```bash
npm test
```

This runs Jest with `--runInBand --forceExit --coverage`. Tests use `mongodb-memory-server` to spin up an isolated in-memory MongoDB instance automatically — no running database, Docker, or Redis is required.

After the run, a coverage report is generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view the detailed line-by-line report.

**Test breakdown:**

| Suite          | Location                         | Covers                                                       |
|----------------|----------------------------------|--------------------------------------------------------------|
| Unit           | `tests/unit/csvService.test.js`  | Column validation, row-level field validation (name, email, DOB, timezone) |
| Integration    | `tests/integration/customer.test.js` | Customer CRUD endpoints (GET, PUT, DELETE), pagination, error cases |
| Integration    | `tests/integration/import.test.js`   | CSV upload (POST), import job retrieval (GET), pagination    |

Test fixtures are located in `tests/fixtures/` (`valid/`, `invalid/`, `mixed/`).

## Project Structure

```
src/
├── app.js                  # Express app setup and middleware
├── server.js               # Entry point, starts server and DB connection
├── config/
│   └── db.js               # MongoDB connection via Mongoose
├── controllers/
│   ├── customerController.js   # Customer CRUD logic
│   └── importController.js     # CSV upload and import job retrieval
├── middleware/
│   ├── errorHandler.js     # Centralised error handling
│   └── logger.js           # Winston structured logging + request logger
├── models/
│   ├── Customer.js         # Customer schema with validation
│   └── ImportJob.js        # Import job schema
├── queues/
│   └── importQueue.js      # Bull queue backed by Redis
├── routes/
│   ├── customerRoutes.js   # Customer API routes
│   └── importRoutes.js     # Import API routes
├── services/
│   └── csvService.js       # CSV column and row validation
├── utils/
│   ├── constants.js        # Shared constants (pagination, regex, timezones)
│   └── errorMessages.js    # Centralised error message strings
└── workers/
    └── importWorker.js     # Async worker that processes queued CSV imports
tests/
├── fixtures/
│   ├── valid/              # Valid CSV fixtures
│   ├── invalid/            # Invalid CSV fixtures
│   └── mixed/              # CSV with both valid and invalid rows
├── integration/            # API endpoint tests (supertest)
└── unit/                   # Service-level unit tests
```

## Design Decisions

- **Bull + Redis for async processing**: CSV imports are handled asynchronously via a Bull job queue backed by Redis. The API returns a job ID immediately (HTTP 202), and a separate worker process picks up and processes the file. This decouples upload latency from processing time and allows the worker to be scaled independently.
- **Separate worker process**: The import worker runs as its own Docker service rather than being embedded in the API server. This keeps the API responsive under load and allows worker concurrency to be tuned via the `IMPORT_WORKER_CONCURRENCY` environment variable.
- **Mongoose for schema validation**: Mongoose provides schema-level validation (e.g. email uniqueness, date constraints) that acts as a second layer of defence alongside the CSV row validation in `csvService`. The unique index on `email` is enforced at the database level.
- **Winston for structured logging**: All logs are output as JSON with timestamps. Key events (requests, errors, import jobs) are logged at appropriate levels.
- **Centralised constants and error messages**: All validation rules, pagination defaults, and error strings live in `utils/constants.js` and `utils/errorMessages.js`. This ensures consistency across the codebase and makes changes straightforward.
- **Multer with memory storage**: Uploaded CSV files are buffered in memory and serialised into the Bull job payload. This avoids needing shared file storage between the API and worker containers.

## Assumptions & Limitations

- **Only `full_name` is required**: `email`, `date_of_birth`, and `timezone` are treated as optional fields. Rows missing these fields are still imported successfully.
- **Email uniqueness is enforced at the database level**: Duplicate emails within a single CSV or across multiple imports will be rejected individually with an appropriate error message in the import results.
- **In-memory file buffering**: Uploaded CSVs are held in memory (via Multer) before being passed to the job queue. For very large files, this increases memory usage on the API server. A streaming or chunked upload approach would be more suitable for production workloads with multi-GB files.
- **No end-to-end import tests**: The test suite does not include end-to-end tests that upload a CSV and then poll the import job to verify the final results match the file contents. This is due to the complexity of coordinating the separate worker process in the test environment. The import pipeline has been verified through manual testing and is covered at the unit level (CSV validation) and integration level (API endpoints and job creation).
- **No authentication or authorisation**: All endpoints are publicly accessible. A production deployment would require an auth layer (e.g. JWT, API keys).
- **Single-record inserts during import**: The worker inserts records one at a time to capture per-row errors. Bulk inserts with `insertMany` (using `ordered: false`) would improve throughput for large files but add complexity to per-row error reporting.

## Future Improvements

- **End-to-end import testing**: Introduce tests that spin up the worker in-process to verify the full import pipeline — upload a CSV, wait for processing, and assert that the resulting job data and database state match the file contents.
- **Streaming CSV processing**: Replace in-memory buffering with a streaming parser for large files to reduce memory pressure.
- **Bulk database inserts**: Use `insertMany` with `ordered: false` to batch insert valid records and improve import throughput for large files.
- **Pre-insert email deduplication**: Currently duplicate emails are only caught when the database rejects the insert (via the unique index). A more efficient approach would be to pre-check emails against the database in batch before inserting, and also detect duplicates within the CSV itself, providing clearer error messages and reducing unnecessary database round-trips.