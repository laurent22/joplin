# Installing

## Configure Docker for Transcribe

1. Copy `.env-transcribe-sample` to the location of your Docker configuration files.
2. Rename the file `.env-transcribe-sample` to `.env-transcribe`.
3. `HTR_CLI_IMAGES_FOLDER` should be a full path to the folder that is going to store the images. It is an external folder, outside of the Docker container.
4. Run the following command to test starting the server using the default configuration:

```shell
docker build -f ./Dockerfile.transcribe -t transcribe .
docker run --env-file .env-transcribe -p 4567:4567 \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v ./packages/transcribe/images:/app/packages/transcribe/images \
     transcribe
```

## Using `docker compose`

For running with docker compose the minimal required configuration is available on `.env-sample` and `docker-compose.server.yml`.

1. Run `cp .env-sample .env`
2. Modify the options that make sense to you in the new `.env` file
3. Run `docker compose -f docker-compose.server.yml --profile full up --detached`

For further customization look at `.env-sample-transcribe`

# Setup for development

## Testing

The integration tests that require the full model to run **don't run on the CI**. It is necessary to be extra careful when changing the model or the prompt because of that. The specific test that has been disabled is at `workers/JobProcessor.test.ts`

## Setup up the database

As the queue driver, we have the option of using SQLite or PostgreSQL, `QUEUE_DRIVER` can be set to `pg` or `sqlite` and `QUEUE_DATABASE_NAME` is the location of the SQLite file when using this configuration.

## Starting the server

From `packages/transcribe`, run `npm run start`

# Endpoints

The `Authorization` header value should be set to the same secret set on `API_KEY`, used for starting Transcribe.

## POST `/transcribe`

Endpoint for creating the transcription job. It is going to store the image on disk after resizing it and assign it to a job record in the database to be eventually processed.

### Request Body:
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (required) – The file to be processed

### Response:

The successful response will include a `jobId` identifier that can later be used to retrieve the result. E.g.:

```json
{
	"jobId": "bcd2e633-eb10-44cb-a280-bf723238c12e"
}
```

### Requesting with cURL:

```
curl --request POST \
  --url http://localhost:4567/transcribe \
  --header 'Authorization: api-key' \
  --header 'Content-Type: multipart/form-data' \
  --form file=@/home/js/Pictures/2025-07-24_17-42_1.png
```


## GET `/transcribe/{:jobId}`

Endpoint to get the result of the job that was created via the `POST /transcribe` endpoint.

### Request:

Requires a `jobId` as the identifier.


### Example Responses:

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

### Requesting with cURL:

```
curl --request GET \
  --url http://localhost:4567/transcribe/57ebd2e2-b496-40ab-9008-5f861bcb7858 \
  --header 'Authorization: api-key'
```