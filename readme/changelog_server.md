# Joplin Server Changelog

## [server-v2.2.7-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.7-beta) (Pre-release) - 2021-07-11T17:31:42Z

- New: Added support for resetting user password (62b6198)
- Improved: Check password complexity (240cb35)
- Improved: Disallow changing email address until a secure solution to change it is implemented (f8d2c26)
- Fixed: Fixed mail queue as some emails were not being processed (89f4ca1)

## [server-v2.2.6-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.6-beta) (Pre-release) - 2021-07-09T15:57:47Z

- New: Add Docker image labels (#5158 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Fixed change processing logic (5a27d4d)
- Fixed: Fixed styling of shared note (6c1a6b0)

## [server-v2.2.5-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.5-beta) (Pre-release) - 2021-07-03T21:40:37Z

- Improved: Make app context immutable and derive the per-request context properties from it (e210926)

## [server-v2.2.4-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.4-beta) (Pre-release) - 2021-07-03T21:10:29Z

- Fixed: Fixed issue with user sessions being mixed up (238cc86)

## [server-v2.2.3-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.3-beta) (Pre-release) - 2021-07-03T19:38:36Z

- Fixed: Fixed size of a database field (264f36f)

## [server-v2.2.2-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.2-beta) (Pre-release) - 2021-07-03T18:28:35Z

- Improved: Improved logging and reliability of cron tasks (d99c34f)
- Improved: Only emit "created" event when new user is saved (8883df2)

## [server-v2.2.1-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.2.1-beta) (Pre-release) - 2021-07-03T15:41:32Z

- New: Add support for account max total size (b507fbf)
- Improved: Display max size info in dashboard (3d18514)
- Improved: Hide "Is Admin" from dashboard (7447793)
- Improved: Moved Joplin-specific context properties under its own namespace (bfa7ea7)
- Improved: Normalize email addresses before saving them (427218b)
- Improved: Remove dangerous "Delete all" button for now (125af75)

## [server-v2.1.6-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.1.6-beta) (Pre-release) - 2021-06-24T10:01:46Z

- Fixed: Fixed accessing main website (Regression) (f868797)

## [server-v2.1.5-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.1.5-beta) (Pre-release) - 2021-06-24T08:26:38Z

- New: Add support for X-API-MIN-VERSION header (51f3c00)

## [server-v2.1.4-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.1.4-beta) (Pre-release) - 2021-06-24T07:26:03Z

- Improved: Split permission to share note or folder (0c12c7f)
- Fixed: Fixed handling of max item size for encrypted items (112157e)
- Fixed: Fixed transaction locking issue when a sub-transaction fails (12aae48)

## [server-v2.1.3-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.1.3-beta) (Pre-release) - 2021-06-19T14:15:06Z

- New: Add support for uploading multiple items in one request (3b9c02e)

## [server-v2.1.1](https://github.com/laurent22/joplin/releases/tag/server-v2.1.1) - 2021-06-17T17:27:29Z

- New: Added account info to dashboard and title to pages (7f0b3fd)
- New: Added way to batch requests (currently disabled) (c682c88)
- New: Added way to debug slow queries (e853244)
- Improved: Hide Reset Password button when creating new users (ac03c08)
- Improved: Sort users by name, then email (65c3d01)

## [server-v2.0.14](https://github.com/laurent22/joplin/releases/tag/server-v2.0.14) - 2021-06-17T08:52:26Z

- Improved: Allow sending reset password email from admin UI (479237d)
- Improved: Tokens would expire too soon (6ae0e84)

## [server-v2.0.13](https://github.com/laurent22/joplin/releases/tag/server-v2.0.13) - 2021-06-16T14:28:20Z

- Improved: Allow creating a new user with no password, which must be set via email confirmation (1896549)
- Improved: Allow creating a user with a specific account type from admin UI (ecd1602)
- Fixed: Fixed error message when item is over the limit (ea65313)
- Fixed: Fixed issue with user not being able to modify own profile (3c18190)

## [server-v2.0.12](https://github.com/laurent22/joplin/releases/tag/server-v2.0.12) - 2021-06-15T16:24:42Z

- Fixed: Fixed handling of user content URL (31121c8)

## [server-v2.0.11](https://github.com/laurent22/joplin/releases/tag/server-v2.0.11) - 2021-06-15T11:41:41Z

- New: Add navbar on login and sign up page (7a3a208)
- New: Added option to enable or disable stack traces (5614eb9)
- Improved: Handle custom user content URLs (a36b13d)
- Fixed: Fixed error when creating user (594084e)

## [server-v2.0.9-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.0.9-beta) (Pre-release) - 2021-06-11T16:49:05Z

- New: Add navbar on login and sign up page (7a3a208)
- New: Added option to enable or disable stack traces (5614eb9)
- Improved: Handle custom user content URLs (a36b13d)
- Fixed: Fixed error when creating user (594084e)

## [server-v2.0.6](https://github.com/laurent22/joplin/releases/tag/server-v2.0.6) (Pre-release) - 2021-06-07T17:27:27Z

- New: Add Stripe integration (770af6a)
- New: Add request duration to log (c8d7ecb)
- New: Add terms and privacy page (db7b802)
- New: Added way to disable signup page, and added links between signup and login pages (75d79f3)
- Improved: Check share ID when uploading a note (3c41b45)
- Improved: Load shared user content from correct domain (de45740)

## [server-v2.0.5](https://github.com/laurent22/joplin/releases/tag/server-v2.0.5) (Pre-release) - 2021-06-02T08:14:47Z

- New: Add version number on website (0ef7e98)
- New: Added signup pages (41ed66d)
- Improved: Allow disabling item upload for a user (f8a26cf)

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
