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

The integration tests that require the full model to run **don't run by default, including on CI**. It is necessary to be extra careful when changing the model or the prompt because of that. The specific test that has been disabled is at `workers/JobProcessor.test.ts`

To run all tests, use the command:

```
yarn test-all
```

## Setup up the database

As the queue driver, we have the option of using SQLite or PostgreSQL, `QUEUE_DRIVER` can be set to `pg` or `sqlite` and `QUEUE_DATABASE_NAME` is the location of the SQLite file when using this configuration.

## Starting the server

From `packages/transcribe`, run `npm run start`
