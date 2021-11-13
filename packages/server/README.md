# Installing

## Configuration

First copy `.env-sample` to `.env` and edit the values in there:

- `APP_BASE_URL`: This is the base public URL where the service will be running. For example, if you want it to run from `https://example.com/joplin`, this is what you should set the URL to. The base URL can include the port.
- `APP_PORT`: The local port on which the Docker container will listen. You would typically map this port to 443 (TLS) with a reverse proxy.

## Running the server

To start the server with default configuration, run:

```shell
docker run --env-file .env -p 22300:22300 joplin/server:latest
```

This will start the server, which will listen on port **22300** on **localhost**. By default it will use SQLite, which allows you to test the app without setting up a database. To run it for production though, you'll want to connect the container to a database, as described below.

## Supported docker tags

The following tags are available:

- `latest` is always the most recent released version
- `beta` is always the most recent beta released version
- Major versions, such as `2`, `2-beta`
- Specific minor versions, such as `2.1`, `2.2`, `2.3-beta`
- Specific patch versions, such as `2.0.4`, `2.2.8-beta`

## Setup the database

You can setup the container to either use an existing PostgreSQL server, or connect it to a new one using docker-compose

### Using an existing PostgreSQL server

To use an existing PostgresSQL server, set the following environment variables in the .env file:

```conf
DB_CLIENT=pg
POSTGRES_PASSWORD=joplin
POSTGRES_DATABASE=joplin
POSTGRES_USER=joplin
POSTGRES_PORT=5432
POSTGRES_HOST=localhost
```

Make sure that the provided database and user exist as the server will not create them.

### Using docker-compose

A [sample docker-compose file](https://github.com/laurent22/joplin/blob/dev/docker-compose.server.yml
 ) is available to show how to use Docker to install both the database and server and connect them:

## Setup reverse proxy

Once Joplin Server is running, you will then need to expose it to the internet by setting up a reverse proxy, and that will depend on how your server is currently configured, and whether you already have Nginx or Apache running:

- [Apache Reverse Proxy](https://httpd.apache.org/docs/current/mod/mod_proxy.html)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## Setup storage

By default, the item contents (notes, tags, etc.) are stored in the database and you don't need to do anything special to get that working.

However since that content can be quite large, you also have the option to store it outside the database by setting the `STORAGE_DRIVER` environment variable.

### Setting up storage on a new installation

Again this is optional - by default items will simply be saved to the database. To save to the local filesystem instead, use:

	STORAGE_DRIVER=Type=File; Path=/path/to/dir

Then all item data will be saved under this `/path/to/dir` directory.

### Migrating storage for an existing installation

Migrating storage is a bit more complicated because the old content will have to be migrated to the new storage. This is done by providing a fallback driver, which tells the server where to look if a particular item is not yet available on the new storage. 

To migrate from the database to the file system for example, you would set the environment variables like so:

	STORAGE_DRIVER=Type=File; Path=/path/to/dir
	STORAGE_DRIVER_FALLBACK=Type=Database; Mode=ReadAndWrite

From then on, all new and updated content will be added to the filesystem storage. When reading an item, if the server cannot find it in the filesystem, it will look for it in the database.

Fallback drivers have two write modes:

- In **ReadAndClear** mode, it's going to clear the fallback driver content every time an item is moved to the main driver. It means that over time the old storage will be cleared and all content will be on the new storage.

- In **ReadAndWrite** mode, it's going to write the content to the fallback driver too. This is purely for safey - it allows deploying the new storage (such as the filesystem or S3) but still keep the old storage up-to-date. So if something goes wrong it's possible to go back to the old storage until the new one is working.

It's recommended to start with ReadAndWrite mode.

This simple setup with main and fallback driver is sufficient to start using a new storage, however old content that never gets updated will stay on the database. To migrate this content too, you can use the `storage import` command. It takes a connection string and move all items from the old storage to the new one.

For example, to move all content from the database to the filesytem:

	docker exec -it CONTAINER_ID node packages/server/dist/app.js storage import --connection 'Type=File; Path=/path/to/dir'

On the database, you can verify that all content has been migrated by running this query:

```sql
SELECT count(*), content_storage_id FROM items GROUP BY content_storage_id;
```

If everything went well, all items should have a `content_storage_id` > 1 ("1" being the database).

### Other storage driver

Besides the database and filesystem, it's also possible to use AWS S3 for storage using the same environment variable:

	STORAGE_DRIVER=Type=S3; Region=YOUR_REGION_CODE; AccessKeyId=YOUR_ACCESS_KEY; SecretAccessKeyId=YOUR_SECRET_ACCESS_KEY; Bucket=YOUR_BUCKET

## Setup the website

Once the server is exposed to the internet, you can open the admin UI and get it ready for synchronisation. For the following instructions, we'll assume that the Joplin server is running on `https://example.com/joplin`.

### Secure the admin user

By default, the instance will be setup with an admin user with email **admin@localhost** and password **admin** and you should change this. To do so, open `https://example.com/joplin/login` and login as admin. Then go to the Profile section and change the admin password.

### Create a user for sync

While the admin user can be used for synchronisation, it is recommended to create a separate non-admin user for it. To do so, navigate to the Users page - from there you can create a new user. Once this is done, you can use the email and password you specified to sync this user account with your Joplin clients.

## Checking the logs

Checking the log can be done the standard Docker way:

```bash
# With Docker:
docker logs --follow CONTAINER

# With docker-compose:
docker-compose --file docker-compose.server.yml logs
```

# Setup for development

## Setup up the database

### SQLite

By default the server supports SQLite for development, so nothing needs to be setup.

### PostgreSQL

To use Postgres, from the monorepo root, run `docker-compose --file docker-compose.server-dev.yml up`, which will start the PostgreSQL database.

## Starting the server

From `packages/server`, run `npm run start-dev`

# Changelog

[View the changelog](https://github.com/laurent22/joplin/blob/dev/readme/changelog_server.md)

# License

Copyright (c) 2017-2021 Laurent Cozic

Personal Use License

Joplin Server is available for personal use only. For example you may host the software on your own server for non-commercial activity.

To obtain a license for commercial purposes, please contact us.
