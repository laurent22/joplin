# Installation and Setup

## Configure Docker for Transcribe

The transcribe server embeds the llama.cpp binary directly in the Docker image. The AI models must be downloaded separately and mounted as a volume.

### 1. Download the models

Create a directory for the models and download them:

```shell
mkdir -p ./data/transcribe-models
wget -O ./data/transcribe-models/Model-7.6B-Q4_K_M.gguf https://huggingface.co/openbmb/MiniCPM-o-2_6-gguf/resolve/main/Model-7.6B-Q4_K_M.gguf
wget -O ./data/transcribe-models/mmproj-model-f16.gguf https://huggingface.co/openbmb/MiniCPM-o-2_6-gguf/resolve/main/mmproj-model-f16.gguf
```

### 2. Configure environment

1. Copy `.env-transcribe-sample` to your Docker configuration directory.
2. Rename it to `.env-transcribe`.

### 3. Run the server

The models directory on your host is mounted into the container at `/opt/models`. The `HTR_CLI_MODELS_FOLDER` environment variable refers to the path inside the container, not the host path.

```shell
docker build -f ./Dockerfile.transcribe -t transcribe .
docker run --env-file .env-transcribe -p 4567:4567 \
	-v ./packages/transcribe/images:/app/packages/transcribe/images \
	-v ./data/transcribe-models:/opt/models:ro \
	-e HTR_CLI_MODELS_FOLDER=/opt/models \
	transcribe
```

## Using Docker Compose

The minimal configuration is provided in `.env-sample` and `docker-compose.server.yml`.

1. Run `cp .env-sample .env`
2. Update any options you need in `.env`
3. Start the server:

   ```shell
   docker compose -f docker-compose.server.yml --profile full up --detached
   ```

For advanced configuration, refer to `.env-sample-transcribe`.

## Security

The transcribe container runs with these security measures:

- **Non-root user**: The application runs as the `transcribe` user, not root
- **Read-only filesystem**: The container filesystem is read-only (only `/app/packages/transcribe/images` and `/tmp` are writable)
- **Resource limits**: Memory and CPU limits prevent runaway processes
- **No Docker socket**: Unlike previous versions, no Docker socket mount is required

---

# Development Setup

## Testing

Integration tests requiring the full model **do not run by default (including on CI)**. Be cautious when modifying the model or prompts.
The disabled test is located at: `workers/JobProcessor.test.ts`.

Run all tests with:

```shell
yarn test-all
```

## Database Setup

The queue driver can be **SQLite** or **PostgreSQL**:

* Set `QUEUE_DRIVER` to `sqlite` or `pg`.
* If using SQLite, `QUEUE_DATABASE_NAME` specifies the path to the database file.

## Starting the Server

From `packages/transcribe`, run:

```shell
yarn start
```

### Environment variables

- `HTR_CLI_BINARY_PATH`: Path to the llama-mtmd-cli binary
- `HTR_CLI_MODELS_FOLDER`: Path to the models directory
- `HTR_CLI_IMAGES_FOLDER`: Path where uploaded images are stored

---

# API Endpoints

All requests must include the `Authorization` header with the value set to your `API_KEY`.

## POST `/transcribe`

Creates a transcription job. The uploaded image is resized, stored on disk, and assigned to a job record in the database.

**Request Body:**

* **Content-Type**: `multipart/form-data`
* **Field**: `file` (required) – the image file to process

**Response:**

```json
{
	"jobId": "bcd2e633-eb10-44cb-a280-bf723238c12e"
}
```

**Example (cURL):**

```shell
curl --request POST \
	--url http://localhost:4567/transcribe \
	--header 'Authorization: api-key' \
	--header 'Content-Type: multipart/form-data' \
	--form file=@/home/js/Pictures/2025-07-24_17-42_1.png
```

---

## GET `/transcribe/{jobId}`

Fetches the result of a transcription job created with `POST /transcribe`.

**Request:**

* Requires a valid `jobId`.

**Example Responses:**

```json
{
	"id": "57ebd2e2-b496-40ab-9008-5f861bcb7858",
	"state": "created"
}
```

```json
{
	"id": "07f09553-f5e9-467e-b98d-406778e61969",
	"state": "active"
}
```

```json
{
	"id": "57ebd2e2-b496-40ab-9008-5f861bcb7858",
	"completedOn": "2025-06-11T18:20:22.000Z",
	"output": {
		"result": "markdown\r\n# Main title\r\n\r\nSome text here. This should take more than one line.\r\n\r\n## Sub title\r\n\r\n- One kind\r\n  - of list\r\n    - sub-item\r\n\r\n## Conclusion\r\n\r\nLet's finish here."
	},
	"state": "completed"
}
```

**Example (cURL):**

```shell
curl --request GET \
	--url http://localhost:4567/transcribe/57ebd2e2-b496-40ab-9008-5f861bcb7858 \
	--header 'Authorization: api-key'
```
