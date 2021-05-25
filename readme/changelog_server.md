# Joplin Server Changelog

## [server-v2.0.4](https://github.com/laurent22/joplin/releases/tag/server-v2.0.4) (Pre-release) - 2021-05-25T18:33:11Z

- Fixed: Fixed Item and Log page when using Postgres (ee0f237)

## [server-v2.0.3](https://github.com/laurent22/joplin/releases/tag/server-v2.0.3) (Pre-release) - 2021-05-25T18:08:46Z

- Fixed: Fixed handling of request origin (12a6634)

## [server-v2.0.2](https://github.com/laurent22/joplin/releases/tag/server-v2.0.2) (Pre-release) - 2021-05-25T19:15:50Z

- New: Add mailer service (ed8ee67)
- New: Add support for item size limit (6afde54)
- New: Added API end points to manage users (77b284f)
- Improved: Allow enabling or disabling the sharing feature per user (daaaa13)
- Improved: Allow setting the path to the SQLite database using SQLITE_DATABASE env variable (68e79f1)
- Improved: Allow using a different domain for API, main website and user content (83cef7a)
- Improved: Generate only one share link per note (e156ee1)
- Improved: Go back to home page when there is an error and user is logged in (a24b009)
- Improved: Improved Items table and added item size to it (7f05420)
- Improved: Improved log table too and made it sortable (ec7f0f4)
- Improved: Make it more difficult to delete all data (b01aa7e)
- Improved: Redirect to correct page when trying to access the root (51051e0)
- Improved: Use external directory to store Postgres data in Docker-compose config (71a7fc0)
- Fixed: Fixed /items page when using Postgres (2d0580f)
- Fixed: Fixed bug when unsharing a notebook that has no recipients (6ddb69e)
- Fixed: Fixed deleting a note that has been shared (489995d)
- Fixed: Make sure temp files are deleted after upload is done (#4540)

## [server-v2.0.1](https://github.com/laurent22/joplin/releases/tag/server-v2.0.1) (Pre-release) - 2021-05-14T13:55:45Z

- New: Add support for sharing notes via a link (ccbc329)
- New: Add support for sharing a folder (#4772)
- New: Added log page to view latest changes to files (874f301)
- Fixed: Prevent new user password from being hashed twice (76c143e)
- Fixed: Fixed crash when rendering note with links to non-existing resources or notes (07484de)
- Fixed: Fixed error handling when no session is provided (63a5bfa)
- Fixed: Fixed uploading empty file to the API (#4402)

## [server-v1.7.2](https://github.com/laurent22/joplin/releases/tag/server-v1.7.2) - 2021-01-24T19:11:10Z

- Fixed: Fixed password hashing when changing password
- Improved: Many other internal changes for increased reliability
