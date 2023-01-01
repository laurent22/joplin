# Installing

## Requirements

- Docker Engine runs Joplin Server. See [Install Docker Engine](https://docs.docker.com/engine/install/) for steps to install Docker Engine for your operating system.
- Docker Compose is required to store item contents (notes, tags, etc.) if PostgreSQL is not used. See [Install Docker Compose](https://docs.docker.com/compose/install/) for steps to install Docker Compose for your operating system.

## Configure Docker for Joplin Server

1. Copy `.env-sample` (located [here](https://raw.githubusercontent.com/laurent22/joplin/dev/.env-sample)) to the location of your Docker configuration files. Example: /home/[user]/docker
2. Rename the file `.env-sample` to `.env`.
3. Run the following command to test starting the server using the default configuration:

```shell
docker run --env-file .env -p 22300:22300 joplin/server:latest
```

The server will listen on port **22300** on **localhost**. By default, the server will use SQLite, which allows you to test the app without setting up a database. When running the server for production use, you should connect the container to a database, as described below.


## Supported Docker tags

The following tags are available:

- `latest` is always the most recent released version
- `beta` is always the most recent beta released version
- Major versions, such as `2`, `2-beta`
- Specific minor versions, such as `2.1`, `2.2`, `2.3-beta`
- Specific patch versions, such as `2.0.4`, `2.2.8-beta`

## Setup the database

You can setup the container to either use an existing PostgreSQL server, or connect it to a new database using docker-compose.

### Using an existing PostgreSQL server

To use an existing PostgresSQL server, you can variables in the .env file. Either:

#### Individual variables

```conf
DB_CLIENT=pg
POSTGRES_PASSWORD=joplin
POSTGRES_DATABASE=joplin
POSTGRES_USER=joplin
POSTGRES_PORT=5432
POSTGRES_HOST=localhost
```

#### Connection String

```conf
DB_CLIENT=pg
POSTGRES_CONNECTION_STRING=postgresql://username:password@your_joplin_postgres_server:5432/joplin
```

Ensure that the provided database and user exist as Joplin Server will not create them. When running on macOS or Windows through Docker Desktop, a mapping of localhost is made automatically. On Linux, you can add `--net=host --add-host=host.docker.internal:127.0.0.1` to the `docker run` command line to make the mapping happen. Any other `POSTGRES_HOST` than localhost or 127.0.0.1 should work as expected without further action.

### Using docker-compose

1. Using the [sample docker-compose file](https://raw.githubusercontent.com/laurent22/joplin/dev/docker-compose.server.yml), create a docker compose file in the location of your Docker configuration files. Example: /home/[user]/docker/docker-compose.yml
2. Update the fields in the docker-compose file as seen in the sample file.


## Setup reverse proxy

This step is optional.

Configuring a reverse proxy is not required for core functionality and is only required if Joplin Server needs to be accessible over the internet. See the following documentation for configuring a reverse proxy with Apache or Nginx.

- [Apache Reverse Proxy](https://httpd.apache.org/docs/current/mod/mod_proxy.html)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## Setup storage

This step is optional.

By default, the item contents (notes, tags, etc.) are stored in the database and no additional steps are required to get that working.

However, since that content can be quite large, you have the option to store it outside the database by setting the `STORAGE_DRIVER` environment variable.

### Setting up storage on a new installation

This step is optional.

To save item contents (notes, tags, etc.) to the local filesystem instead, use:

	STORAGE_DRIVER=Type=Filesystem; Path=/path/to/dir

After this is set, all item contents will be saved under the defined `/path/to/dir` directory.

### Migrating storage for an existing installation

This step is optional.

Migrating storage is a bit more complicated because the old content will have to be migrated to the new storage. This is done by providing a fallback driver, which tells the server where to look if a particular item is not yet available on the new storage.

To migrate from the database to the file system, you would set the environment variables as follows:

	STORAGE_DRIVER=Type=Filesystem; Path=/path/to/dir
	STORAGE_DRIVER_FALLBACK=Type=Database; Mode=ReadAndWrite

From then on, all new and updated content will be added to the filesystem storage. When reading an item, if the server cannot find it in the filesystem, it will look for it in the database.

Fallback drivers have two write modes:

- In **ReadAndClear** mode, it's going to clear the fallback driver content every time an item is moved to the main driver. It means that over time the old storage will be cleared and all content will be on the new storage.

- In **ReadAndWrite** mode, it's going to write the content to the fallback driver too. This is purely for safey - it allows deploying the new storage (such as the filesystem or S3) but still keep the old storage up-to-date. So if something goes wrong it's possible to go back to the old storage until the new one is working.

It's recommended to start with ReadAndWrite mode.

This simple setup with main and fallback driver is sufficient to start using a new storage, however old content that never gets updated will stay on the database. To migrate this content too, you can use the `storage import` command. It takes a connection string and move all items from the old storage to the new one.

For example, to move all content from the database to the filesytem:

	docker exec -it CONTAINER_ID node packages/server/dist/app.js storage import --connection 'Type=Filesystem; Path=/path/to/dir'

On the database, you can verify that all content has been migrated by running this query:

```sql
SELECT count(*), content_storage_id FROM items GROUP BY content_storage_id;
```

If everything went well, all items should have a `content_storage_id` > 1 ("1" being the database).

### Other storage driver

Besides the database and filesystem, it's also possible to use AWS S3 for storage using the same environment variable:

	STORAGE_DRIVER=Type=S3; Region=YOUR_REGION_CODE; AccessKeyId=YOUR_ACCESS_KEY; SecretAccessKeyId=YOUR_SECRET_ACCESS_KEY; Bucket=YOUR_BUCKET

## Verify access to the admin page

Once Joplin Server is exposed to the internet, open the admin UI. For the following instructions, we'll assume that Joplin Server is running on `https://example.com/joplin`.

If Joplin Server is running running locally only, access the Admin Page using `http://[hostname]:22300`

### Update the admin user credentials

By default, Joplin Server will be setup with an admin user with email **admin@localhost** and password **admin**. For security purposes, the admin user's credentials should be changed. On the Admin Page, login as the admin user. In the upper right, select the Profile button update the admin password.

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

See LICENSE.md in this directory
