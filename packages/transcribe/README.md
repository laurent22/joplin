# Installation and Setup

## Configure Docker for Transcribe

1. Copy `.env-transcribe-sample` to your Docker configuration directory.
2. Rename it to `.env-transcribe`.
3. Set `HTR_CLI_IMAGES_FOLDER` to the full path of the folder where images will be stored. This folder must be outside the Docker container.
4. Test the server with the default configuration:

```shell
docker build -f ./Dockerfile.transcribe -t transcribe .
docker run --env-file .env-transcribe -p 4567:4567 \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-v ./packages/transcribe/images:/app/packages/transcribe/images \
	transcribe
```

## GPU Acceleration

By default the server runs inference on CPU. Set `HTR_CLI_GPU_TYPE` in your `.env` to enable GPU acceleration.

| Value | Hardware | Requires |
|-------|----------|---------|
| `none` | CPU (default) | Nothing extra |
| `cuda` | NVIDIA GPU | NVIDIA Docker runtime (`nvidia-container-toolkit`) |
| `metal` | Apple Silicon | Native binary (no Docker for inference) |

### NVIDIA CUDA

1. Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) on the host.
2. Build the GPU Docker image:

   ```shell
   docker build -f packages/transcribe/Dockerfile.htr-cli-gpu -t joplin/htr-cli-gpu:latest .
   ```

3. Add these variables to your `.env`:

   ```env
   HTR_CLI_GPU_TYPE=cuda
   HTR_CLI_DOCKER_IMAGE=joplin/htr-cli-gpu:latest
   ```

4. Start the transcribe container with `--gpus all`:

   ```shell
   docker run --env-file .env-transcribe -p 4567:4567 \
       --gpus all \
       -v /var/run/docker.sock:/var/run/docker.sock \
       -v ./packages/transcribe/images:/app/packages/transcribe/images \
       transcribe
   ```

### Apple Silicon (Metal)

Metal GPU access is not available inside Docker containers on macOS, so the inference binary runs natively on the host instead of in a container.

1. Run the setup script to download the native binary and model files (from `packages/transcribe`):

   ```shell
   yarn setupMetal
   ```

   An optional `--install-dir` argument controls where files are downloaded (default: `./htr-metal`):

   ```shell
   yarn setupMetal --install-dir /opt/htr-metal
   ```

   The script prints the exact `.env` lines to add, for example:

   ```env
   HTR_CLI_GPU_TYPE=metal
   HTR_CLI_BINARY_PATH=/path/to/htr-metal/bin/llama-mtmd-cli
   HTR_CLI_MODELS_FOLDER=/path/to/htr-metal/models
   ```

2. Add those lines to your `.env`.

3. Start the server normally — `HTR_CLI_IMAGES_FOLDER` still needs to be set and accessible to the native binary.

Here's a sample `.env` file for testing:

```ini
# Copy these lines from the output of `yarn setupMetal`
HTR_CLI_GPU_TYPE=metal
HTR_CLI_BINARY_PATH=
HTR_CLI_MODELS_FOLDER=

HTR_CLI_IMAGES_FOLDER=/path/to/images
API_KEY=test-key
QUEUE_DRIVER=sqlite
QUEUE_DATABASE_NAME=./queue.sqlite3
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
npm run start
```

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
