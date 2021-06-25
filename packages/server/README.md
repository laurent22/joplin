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

## Setup the database

You can setup the container to either use an existing PostgreSQL server, or connect it to a new one using docker-compose
### Using an existing PostgreSQL server

To use an existing PostgresSQL server you must configure some environment variables in the .env file: 

First set the `DB_CLIENT` environment variable to `pg`
```conf
DB_CLIENT=pg
```

#### Defining the connection
Use a connection string variable:
```conf
POSTGRES_CONNECTION_STRING=postgresql://username:password@your_joplin_postgres_server:5432/joplin
```
Or use individual variables:
```conf
POSTGRES_PASSWORD=joplin
POSTGRES_DATABASE=joplin
POSTGRES_USER=joplin
POSTGRES_PORT=5432
POSTGRES_HOST=localhost
```

*Make sure that the provided database and user exist as the server will not create them.*

#### SSL Options
In some cases you will need to supply a CA cert to allow connections to be made to a PostgreSQL server. You can do this by mounting the cert into your container and setting `POSTGRES_SSL_CA_FILEPATH` to the path of the CA cert on the container.
```conf
POSTGRES_SSL_CA_FILEPATH=/home/data/ca.crt
```

If you just wish to ignore an invalid SSL certificate you can do this by setting the `POSTGRES_REJECT_UNAUTHORIZED` variable to false.   
```conf
POSTGRES_REJECT_UNAUTHORIZED=false
```

When the server requires client certificate authentication, mount the cert and key files to the container and set the `POSTGRES_SSL_CERT_FILEPATH` and `POSTGRES_SSL_CERT_KEY_FILEPATH`.     
```conf
POSTGRES_SSL_CERT_FILEPATH=/home/data/postgresql.crt
POSTGRES_SSL_CERT_KEY_FILEPATH=/home/data/postgresql.key
```

For more information on defining SSL parameters on your connection please refer to https://node-postgres.com/features/ssl and https://node-postgres.com/features/ssl.

### Using docker-compose

A [sample docker-compose file](https://github.com/laurent22/joplin/blob/dev/docker-compose.server.yml
 ) is available to show how to use Docker to install both the database and server and connect them:

## Setup reverse proxy

Once Joplin Server is running, you will then need to expose it to the internet by setting up a reverse proxy, and that will depend on how your server is currently configured, and whether you already have Nginx or Apache running:

- [Apache Reverse Proxy](https://httpd.apache.org/docs/current/mod/mod_proxy.html)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

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
