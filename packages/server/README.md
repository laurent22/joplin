# Installing

## Install application

```shell
git clone https://github.com/laurent22/joplin
cd joplin
npm i
docker-compose --file docker-compose.server.yml up
```

This will start the server, which will listen on port **22300** on **localhost**.

## Setup reverse proxy

You will then need to expose this server to the internet by setting up a reverse proxy, and that will depend on how your server is currently configured, and whether you already have Nginx or Apache running:

- [Apache Reverse Proxy](https://httpd.apache.org/docs/current/mod/mod_proxy.html)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## Setup admin user

For the following instructions, we'll assume that the Joplin server is running on `https://example.com/joplin`.

By default, the instance will be setup with an admin user with email **admin@localhost** and password **admin** and you should change this by opening the admin UI. To do so, open `https://example.com/joplin/login`. From there, go to Profile and change the admin password.

## Setup a user for sync

While the admin user can be used for synchronisation, it is recommended to create a separate non-admin user for it. To do, open the admin UI and navigate to the Users page - from there you can create a new user.

Once this is done, you can use the email and password you specified to sync this user account with your Joplin clients.

# Set up for development

## Setting up the database

### SQLite

The server supports SQLite for development and test units. To use it, open `src/config-dev.ts` and uncomment the sqlite3 config.

### Postgres

It's best to use Postgres as this is what is used in production, however it requires Docker.

To use it, from the monorepo root, run `docker-compose --file docker-compose.server-dev.yml up`, which will start the Postgres database.

## Starting the server

From `packages/server`, run `npm run start-dev`