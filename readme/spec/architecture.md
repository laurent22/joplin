# Joplin architecture

Joplin as a project is organised around three main components:

- The user applications (desktop, mobile and CLI)
- Joplin Server
- Web Clipper

## User applications

The desktop, mobile and CLI applications have the same architecture and mostly the same backend. The main difference is for the UI, where they each use a different framework, and for system integration (eg. notifications, importing or exporting files, etc.).

The overall architecture for each application is as such:

- Front end: The user facing part of the app. This is different for each applications (see below for the difference between applications)

- Back end: This is shared by all applications. It is made of:

	- Services: Provide high-level functionalities, such as the search engine, plugin system or database driver.

	- Models: The model layer sits between the services and database. They provide a higher level abstraction than SQL and utility functions to easily save data, such as notes, notebooks, etc.

	- Database: All applications use a local [SQLite database](https://sqlite.org/index.html) to store notes, settings, cache, etc. This is only a local database.

- Configuration: The application is configured using a `settings.json` file. Its schema is available online: https://joplinapp.org/schema/settings.json

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/architecture/Application.png" style="max-width: 100%;"></div>

### Desktop application

The desktop application is developed using [Electron](https://www.electronjs.org/), with a front end done in [React](https://react.dev/). The backend runs on [Node.js](https://nodejs.org/).

### Mobile application

The mobile application is developed using [React Native](https://reactnative.dev/). The backend runs on React Native's own [Hermes JavaScript engine](https://hermesengine.dev/).

### CLI application

This application is to use Joplin from the terminal. It is developed using [terminal-kit](https://github.com/cronvel/terminal-kit). The backend runs on Node.js.

## Joplin Server

Joplin Server is used to synchronise the application data between multiple devices. Thus, a user can have their notes on their laptop, and on the go, on their phone. Joplin Server also allows user to share notebooks with others, and publish notes to the internet. Because it is designed specifically for Joplin, it also offers improved performance, compared to other synchronisation targets.

A typical Joplin Server installation will use the following elements:

- The [Joplin Server application](https://github.com/laurent22/joplin/blob/dev/packages/server/README.md). This is a Node.js application. It exposes a REST API that is used by the Joplin clients to upload or download notes, notebooks, and other Joplin objects.

- [PostgreSQL](https://www.postgresql.org/): it is used to save the "item" metadata. An "item" can be a note, a notebook, a tag, etc. It is also used to save other informations, such as user accounts, access logs, etc.

- [AWS S3](https://aws.amazon.com/s3/): it is used to save the item content. In other words, the note body, the file attachments, etc.

- [Nginx](https://www.nginx.com/): It is used as a reverse proxy and for TLS termination.

- A configuration file: A `.env` file, which contains environement variables used to configure the server.

This is a typical Joplin Server installation, but many of its components can be configured - for example it is possible to use a different database engine, or to use the filesystem instead of AWS S3. Any reverse proxy would also work - using Nginx is not required.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/architecture/JoplinServer.png" style="max-width: 100%;"></div>

## Web Clipper

The Web Clipper is a browser extension for Firefox and Chrome. It is used to capture a web page, a part of a page, or a screenshot from the browser, and save it to Joplin.

It is developed using the [WebExtensions API](https://extensionworkshop.com/documentation/develop/about-the-webextensions-api/) with the popup being done using React.

# More information

- [Plugin Architecture spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/plugins.md)
- [E2EE: Technical spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee.md)
- [E2EE: Workflow](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee/workflow.md)
- [All Joplin technical specifications](https://github.com/laurent22/joplin/tree/dev/readme/spec)
