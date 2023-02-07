# Joplin Server Changelog

## [server-v2.10.6](https://github.com/laurent22/joplin/releases/tag/server-v2.10.6) - 2023-02-06T19:01:36Z

- New: Add in ability to use Postgres connection string in configuration (#6836 by [@halkeye](https://github.com/halkeye))
- Fixed: Fixed issue when an item is associated with a share that no longer exists (ba5f0bc)

## [server-v2.10.5](https://github.com/laurent22/joplin/releases/tag/server-v2.10.5) - 2022-12-26T12:09:13Z

- Fixed: Fixed regression that would prevent styles from being loaded in published notes (#7525)

## [server-v2.10.4](https://github.com/laurent22/joplin/releases/tag/server-v2.10.4) - 2022-12-18T16:02:06Z

- Fixed: Fixed regression introduced by form-parse lib update (#7463)

## [server-v2.10.3](https://github.com/laurent22/joplin/releases/tag/server-v2.10.3) - 2022-12-15T23:32:16Z

- Upgraded packages for performance and security improvements.

## [server-v2.9.7](https://github.com/laurent22/joplin/releases/tag/server-v2.9.7) - 2022-11-05T16:51:39Z

- Improved: Allow enabling and disabling tasks (1379c9c)
- Improved: Allow searching user by email or name (1cfbefb)
- Improved: Fail-safe when trying to delete a non-disabled account (21883b4)
- Improved: Paginate users (8ac8d53)
- Improved: Refactor table structure (8ea6d89)
- Improved: Update sender email (bf92ee7)
- Improved: Upgrade Koa framework to 2.13.4 (dc92546)
- Improved: Upgrade to Node 18 (f34078b)
- Improved: When re-activating an account, remove it from the deletion queue (bbc4228)
- Fixed: Fixed account activation logic (ccf5d20)

## [server-v2.9.5](https://github.com/laurent22/joplin/releases/tag/server-v2.9.5) - 2022-10-11T10:44:01Z

- New: Add support for sidebar in user pages (053dbab)
- Improved: Automatically delete expired sessions (d5dfecc)
- Improved: Cannot sort user deletions by email (8e18024)
- Improved: Do not make checkboxes in published notes clickable (cb637e8)
- Improved: Improve admin email UI (e3c9bcb)
- Improved: Process user deletions once an hour (f99b8df)
- Improved: Use apt to install tini to enable multi-platform support (#6097 by Erik Thomsen)
- Fixed: Could not manually start task (#6491)
- Fixed: Fixed Unsupported File Type error when sharing certain notes (#6531)
- Fixed: Fixed removal of user deletion tasks (8f8cc12)
- Fixed: Fixed sidebar menu selection (422a5bf)
- Fixed: Fixed user deletion schedule (bfe5ee8)
- Fixed: Published note must be scrollable when it contains a large table (#6370)

## [server-v2.7.4](https://github.com/laurent22/joplin/releases/tag/server-v2.7.4) - 2022-02-02T19:23:34Z

- New: Add task to automate deletion of disabled accounts (1afcb27)
- Improved: Always display Help link even when not logged in (00163f5)
- Improved: Call server start command directly, without going through npm (c185f00)
- Improved: Disable session expiration logic for now (4c11bbf)
- Improved: Enabled task to automatically delete sessions every 6 hours (69170dd)
- Improved: Fixed handling of mailer security settings, and changed env variable name MAILER_SECURE =&gt; MAILER_SECURITY, and default port 587 =&gt; 465 (Breaking change) (#5222)
- Improved: Improved env variable validation and support true-false as boolean values (fd322ed)
- Improved: Improved string localization in views (98bfb65)
- Improved: Make page wider only when displaying admin pages (df9c460)
- Improved: Move admin pages under /admin (#6006)
- Improved: Put admin pages under /admin (09cbe3c)
- Improved: Remove uneeded CSS file (9dbf5e0)
- Improved: Set NODE_ENV to "production" in Docker image (ed0f0fa)
- Improved: Set a timestamp when disabling a user (2f7ab7e)
- Improved: Simplify Docker image (#6010)
- Improved: Temporarily save user info before deleting account (68469bc)
- Improved: View sent emails from admin dashboard (f5f7981)
- Fixed: Fixed sharing notebook with a user that does not have E2EE enabled (#5958)
- Fixed: Use multi-stage builds and smaller base image (#6048) (#5397 by [@aaron](https://github.com/aaron))

## [server-v2.7.3](https://github.com/laurent22/joplin/releases/tag/server-v2.7.3) - 2021-12-29T13:35:12Z

- Improved: Allow deleting complete user data (#5824)
- Improved: Changed ID length from 32 to 22 characters (e9ce3d1)
- Improved: Disable logs and items pages for end-user (83a46e5)
- Improved: Display NTP server domain and port when there is an error, and display message when NTP check is skipped (4a1bc07)
- Improved: Increase default MAX_TIME_DRIFT to 2000 (35f684a)
- Improved: Setup localisation (aa42ceb)

## [server-v2.6.14](https://github.com/laurent22/joplin/releases/tag/server-v2.6.14) - 2021-12-02T16:29:54Z

- Improved: Improved storage command (122afd6)

## [server-v2.6.13](https://github.com/laurent22/joplin/releases/tag/server-v2.6.13) - 2021-11-29T18:41:28Z

- New: Added command to delete database item content (01048f5)
- Improved: Allow disabling NTP time drift check (dc67eac)
- Improved: Do not set the SMTP auth option when user or password are not set (#5791 by [@MovingEarth](https://github.com/MovingEarth))
- Improved: Increase default MAX_TIME_DRIFT to 100ms (8e54a65)
- Improved: Optimise reading from external storage when fallback driver is not present (4fecb08)
- Improved: Remove unique constraint errors from the log when they are already handled by the application (a6884a2)
- Improved: Retry NTP request up to three times when it fails (7eb1d89)

## [server-v2.6.12](https://github.com/laurent22/joplin/releases/tag/server-v2.6.12) - 2021-11-23T16:30:27Z

- New: Added task to compress changes older than 6 months (75f7296)
- Improved: Allow specifying a max content size when importing content to new storage (080c3cc)
- Improved: Check for time drift when the server starts (#5738)
- Improved: Display more debug info in error log (3716972)
- Improved: Display more detailed error messages on SQL query errors (42a4edb)
- Improved: Perform storage checks before starting services (16d5047)
- Fixed: Fixed HandleOversizedAccounts task interval (fc419d9)

## [server-v2.6.11](https://github.com/laurent22/joplin/releases/tag/server-v2.6.11) - 2021-11-14T17:14:51Z

- Improved: Prevent large data blobs from crashing the application (5eb3a92)

## [server-v2.6.10](https://github.com/laurent22/joplin/releases/tag/server-v2.6.10) - 2021-11-13T12:47:53Z

- Improved: Improved storage migration error handling, and improved storage test units (5a41d80)
- Improved: Rename "ReadOnly" mode to "ReadAndClear" to avoid any confusion (5cd4537)

## [server-v2.6.9](https://github.com/laurent22/joplin/releases/tag/server-v2.6.9) - 2021-11-11T16:38:00Z

- Improved: Hide more credentials from the log (73137cf)
- New: Added command to test a storage connection (c6dec0a)
- New: Added command to migrate content to different storage (005f720)

## [server-v2.6.5](https://github.com/laurent22/joplin/releases/tag/server-v2.6.5) - 2021-11-10T12:07:50Z

- Improved: Allow storing item content in database, filesystem or S3 (depending on config) (#5602)

## [server-v2.6.3](https://github.com/laurent22/joplin/releases/tag/server-v2.6.3) - 2021-11-08T15:20:41Z

- New: Add support for sharing notes when E2EE is enabled (#5529)
- Improved: Disable mailer service if no-reply email is not set (ce5c5d6)
- Improved: Display latest migration name after auto-migration (7ad73df)
- Improved: Immediately ask user to set password after Stripe checkout (9e1cb9d)
- Improved: Set resource content size when viewing published note (70d5c7a)

## [server-v2.6.2](https://github.com/laurent22/joplin/releases/tag/server-v2.6.2) - 2021-11-03T12:54:38Z

- New: Add support for faster built-in sync locks (#5662)
- Improved: Improved env variable handling to make it self documenting and enforce type checking (b5d792c)
- Improved: Improved logging and rendering of low level middleware errors (3704413)

## [server-v2.5.10](https://github.com/laurent22/joplin/releases/tag/server-v2.5.10) - 2021-11-02T14:45:54Z

- New: Add unique constraint on name and owner ID of items table (f7a18ba)
- Fixed: Fixed issue that could cause server to return empty items in some rare cases (99ea4b7)

## [server-v2.5.9](https://github.com/laurent22/joplin/releases/tag/server-v2.5.9) - 2021-10-28T19:43:41Z

- Improved: Remove session expiration for now (4a2af32)

## [server-v2.5.8](https://github.com/laurent22/joplin/releases/tag/server-v2.5.8) - 2021-10-28T16:07:23Z

- New: Added item owner ID, and allow disabling db auto-migrations (b655f27)
- Fixed: Fixed Stripe portal page redirection (9ba90b5)
- Fixed: Fixed items.owner_id migration (a753429)
- Fixed: Fixed display of latest migration in startup log (#5627 by [@KowalskiPiotr98](https://github.com/KowalskiPiotr98))
- Improved: Moved CLI commands to separate files (dca13b3)
- Improved: Delete all sessions when a password is changed or reset (b497177)
- Improved: Expire sessions after 12 hours (0ada1df)
- Improved: Improved task service log entries (bc5a853)
- Improved: Run oversized account task more frequently (2f09f88)

## [server-v2.5.5](https://github.com/laurent22/joplin/releases/tag/server-v2.5.5) - 2021-10-23T20:58:37Z

- New: Added tool to delete old changes (169b585)
- Fixed: Fixed issue when a notebook is shared, then unshared, then shared again (47fc51e)

## [server-v2.5.2](https://github.com/laurent22/joplin/releases/tag/server-v2.5.2) - 2021-10-07T13:36:27Z

- New: Add support for promotion codes (5b58811)
- Improved: Sort flags by date (31efc9b)
- Fixed: Fixed links in published notes (#5507)

## [server-v2.5.1](https://github.com/laurent22/joplin/releases/tag/server-v2.5.1) - 2021-09-29T15:52:34Z

- New: Add support for events and use them to track background tasks (79d1ad7)
- Improved: Allow manually deleting a user flag (3a11885)
- Improved: Also clear admin session ID on logout after impersonating a user (24945a0)
- Improved: Correctly attach Stripe sub to Joplin Server sub when it is recreated from Stripe (5da820a)
- Improved: Display banner when an account is disabled and provide reason (8c9331c)
- Improved: Only disable API access when an account is disabled (6fec2a9)
- Improved: Remove AccountOverLimit flag from accounts that are now below the limit (5de5370)
- Improved: Send reminder email every time a payment fails (2dd8045)

## [server-v2.4.11-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.4.11-beta) - 2021-09-26T17:10:57Z

- Improved: Do not allow accepting share more than once (57a1d03)
- Fixed: Fixed Stripe checkout when a coupon is used (c45f961)

## [server-v2.4.10-beta](https://github.com/laurent22/joplin/releases/tag/server-v2.4.10-beta) (Pre-release) - 2021-09-25T19:07:05Z

- Improved: Improved share service reliability and optimised performance (0175348)
- Security: Implement clickjacking defense (e3fd34e)

## [server-v2.4.9](https://github.com/laurent22/joplin/releases/tag/server-v2.4.9-beta) - 2021-09-22T16:31:23Z

- New: Add support for changing user own email (63e88c0)
- Improved: Allow an admin to impersonate a user (03b4b6e)
- Improved: Allow entering coupon code on Stripe checkout page (4577c9c)
- Improved: Clear cookie when account has been deleted to allow viewing login page again (061761f)
- Improved: Exclude certain queries from slow log (4e70ca6)
- Improved: Handle Joplin Cloud failed subscription payments (a6b1cff)
- Improved: Improved support for background tasks and added admin UI to view them (cd877f6)
- Improved: Improved user list page (4d38397)
- Improved: Link to Joplin Cloud signup page on login page (d850eed)
- Improved: Manage subscription entirely from Stripe (7fac194)
- Improved: Redirect to user page after changing a user (c91d4bd)
- Improved: Rename admin button "Send reset password email" to more correct "Send account information email" (37d446b)
- Improved: Sync deleted items first to allow fixing oversized accounts (43c594b)
- Fixed: Fixed calculating total item size after an item has been deleted (024967c)

## [server-v2.4.8](https://github.com/laurent22/joplin/releases/tag/server-v2.4.8-beta) - 2021-09-15T22:16:59Z

- New: Added support for app level slow SQL query log (5e8b742)

## [server-v2.4.7](https://github.com/laurent22/joplin/releases/tag/server-v2.4.7-beta) - 2021-09-15T15:58:46Z

- Improved: Improve flag logic (c229821)
- Fixed: Fixed handling of brute force limiter by getting correct user IP (3ce947e)

## [server-v2.4.6](https://github.com/laurent22/joplin/releases/tag/server-v2.4.6-beta) - 2021-09-14T15:02:21Z

- New: Add link to Stripe subscription page to manage payment details (4e7fe66)
- New: Add transaction info to debug deadlock issues (01b653f)

## [server-v2.4.3](https://github.com/laurent22/joplin/releases/tag/server-v2.4.3-beta) - 2021-09-02T17:49:11Z

- New: Added Help page for Joplin Cloud (6520a48)
- New: Added icon next to profile button (5805a41)
- Improved: Display note title as page title when sharing note (82331c9)
- Fixed: Fixed calculation of max sizes for Postgres (93a4ad0)

## [server-v2.4.2](https://github.com/laurent22/joplin/releases/tag/server-v2.4.2) - 2021-08-28T17:45:41Z

- New: Add request rate limter on session and login end points (543413d)
- New: Add support for user flags (82b157b)
- New: Added commands to control db migrations - list, down, up (2c79ce2)
- Improved: Display user flags in profile when logged in as admin (4394329)
- Improved: Handle flags for accounts over limit (6e087bc)
- Improved: Increase cookies security - set HttpOnly, Secure and SameSite flags (bcadb36)
- Improved: No longer install vim into the image (#5337 by [@piotrb](https://github.com/piotrb))
- Improved: Re-enable account when new subscription is associated with it (ac82e4b)
- Improved: Switch to node:16-bullseye base image (#5202 by [@piotrb](https://github.com/piotrb))
- Fixed: Prevent crash when returning too many rows using SQLite (1efe3d3)
- Fixed: Filenames with non-ascii characters could not be downloaded from published note (#5328)
- Fixed: Fix missing CSS file error (#5309 by [@whalehub](https://github.com/whalehub))
- Fixed: Fixed second duration (c7421df)

## [server-v2.3.7](https://github.com/laurent22/joplin/releases/tag/server-v2.3.7-beta) - 2021-08-13T21:20:17Z

- Fixed: Fix migrations (a9961ae)

## [server-v2.3.6](https://github.com/laurent22/joplin/releases/tag/server-v2.3.6-beta) - 2021-08-13T20:59:41Z

- Fixed: Fix migrations (f518549)

## [server-v2.3.5](https://github.com/laurent22/joplin/releases/tag/server-v2.3.5-beta) - 2021-08-13T18:01:20Z

- Fixed: Fixed pagination link styling (d42d181)

## [server-v2.3.4](https://github.com/laurent22/joplin/releases/tag/server-v2.3.4-beta) - 2021-08-13T16:56:17Z

- Improved: Allow setting email key to prevent the same email to be sent multiple times (391204c)
- Improved: Clarify beta transition message (c4fcfec)
- Improved: Disable upload for accounts with subscription failed payments (f14c74d)
- Improved: Re-enable account when subscription is paid (4b5318c)
- Improved: Set better filename and mime type for files downloaded via published notes (#5286)
- Fixed: Fixed publishing of notes with HTML markup type (97726b0)
- Fixed: Fix regression (6359c9c)
- Fixed: Fixed layout of notes on mobile devices (#5269)

## [server-v2.2.11](https://github.com/laurent22/joplin/releases/tag/server-v2.2.11-beta) - 2021-08-03T18:48:00Z

- Improved: Disable beta account once expired (785248b)
- Improved: Handle beta user upgrade (8910c87)
- Improved: Prevent duplicate Stripe subscriptions and improved Stripe workflow testing (6ac22ed)
- Fixed: Fixed support emails (724aa72)

## [server-v2.2.10](https://github.com/laurent22/joplin/releases/tag/server-v2.2.10) - 2021-08-01T10:04:53Z

- Improved: Allows providing a coupon when creating the Stripe checkout session (b5b6111)

## [server-v2.2.9](https://github.com/laurent22/joplin/releases/tag/server-v2.2.9-beta) - 2021-07-31T13:52:53Z

- New: Add Docker major, minor and beta version tags (#5237 by [@JackGruber](https://github.com/JackGruber))
- New: Add support for Stripe yearly subscriptions (f2547fe)
- Improved: Improve installation instructions (53b4d7a)
- Fixed: Fixed certain URLs (282f782)
- Fixed: Published notes that contain non-alphabetical characters could end up being truncated (#5229)

## [server-v2.2.8](https://github.com/laurent22/joplin/releases/tag/server-v2.2.8-beta) - 2021-07-24T16:55:58Z

- New: Added form tokens to prevent CSRF attacks (CVE-2021-23431) (19b45de)
- Improved: Allow admin to change Stripe subscription (75a421e)
- Improved: Allow enabling or disabling a user. Handle cancelling subscription. (27c3cbd)
- Improved: Allow user to upgrade account (e83ab93)
- Improved: Allow users to cancel Stripe subscription (b7e9848)
- Improved: Clarify error message when user info cannot be saved (4567b78)
- Improved: Explain how to use Joplin Server with a Joplin app (3f993af)
- Improved: Handle Stripe webhook receiving multiple times the same event (252d069)
- Improved: Make sure email URLs are displayed as clickable links (7245aea)
- Improved: Moved email templates to separate files (6a93cb2)
- Improved: Set default of env SUPPORT_EMAIL to "SUPPORT_EMAIL" to make it clear it needs to be set (92520e5)

## [server-v2.2.7](https://github.com/laurent22/joplin/releases/tag/server-v2.2.7-beta) - 2021-07-11T17:31:42Z

- New: Added support for resetting user password (62b6198)
- Improved: Check password complexity (240cb35)
- Improved: Disallow changing email address until a secure solution to change it is implemented (f8d2c26)
- Fixed: Fixed mail queue as some emails were not being processed (89f4ca1)

## [server-v2.2.6](https://github.com/laurent22/joplin/releases/tag/server-v2.2.6-beta) - 2021-07-09T15:57:47Z

- New: Add Docker image labels (#5158 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Fixed change processing logic (5a27d4d)
- Fixed: Fixed styling of shared note (6c1a6b0)

## [server-v2.2.5](https://github.com/laurent22/joplin/releases/tag/server-v2.2.5-beta) - 2021-07-03T21:40:37Z

- Improved: Make app context immutable and derive the per-request context properties from it (e210926)

## [server-v2.2.4](https://github.com/laurent22/joplin/releases/tag/server-v2.2.4-beta) - 2021-07-03T21:10:29Z

- Fixed: Fixed issue with user sessions being mixed up (238cc86)

## [server-v2.2.3](https://github.com/laurent22/joplin/releases/tag/server-v2.2.3-beta) - 2021-07-03T19:38:36Z

- Fixed: Fixed size of a database field (264f36f)

## [server-v2.2.2](https://github.com/laurent22/joplin/releases/tag/server-v2.2.2-beta) - 2021-07-03T18:28:35Z

- Improved: Improved logging and reliability of cron tasks (d99c34f)
- Improved: Only emit "created" event when new user is saved (8883df2)

## [server-v2.2.1](https://github.com/laurent22/joplin/releases/tag/server-v2.2.1-beta) - 2021-07-03T15:41:32Z

- New: Add support for account max total size (b507fbf)
- Improved: Display max size info in dashboard (3d18514)
- Improved: Hide "Is Admin" from dashboard (7447793)
- Improved: Moved Joplin-specific context properties under its own namespace (bfa7ea7)
- Improved: Normalize email addresses before saving them (427218b)
- Improved: Remove dangerous "Delete all" button for now (125af75)

## [server-v2.1.6](https://github.com/laurent22/joplin/releases/tag/server-v2.1.6-beta) - 2021-06-24T10:01:46Z

- Fixed: Fixed accessing main website (Regression) (f868797)

## [server-v2.1.5](https://github.com/laurent22/joplin/releases/tag/server-v2.1.5-beta) - 2021-06-24T08:26:38Z

- New: Add support for X-API-MIN-VERSION header (51f3c00)

## [server-v2.1.4](https://github.com/laurent22/joplin/releases/tag/server-v2.1.4-beta) - 2021-06-24T07:26:03Z

- Improved: Split permission to share note or folder (0c12c7f)
- Fixed: Fixed handling of max item size for encrypted items (112157e)
- Fixed: Fixed transaction locking issue when a sub-transaction fails (12aae48)

## [server-v2.1.3](https://github.com/laurent22/joplin/releases/tag/server-v2.1.3-beta) - 2021-06-19T14:15:06Z

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

## [server-v2.0.9](https://github.com/laurent22/joplin/releases/tag/server-v2.0.9-beta) - 2021-06-11T16:49:05Z

- New: Add navbar on login and sign up page (7a3a208)
- New: Added option to enable or disable stack traces (5614eb9)
- Improved: Handle custom user content URLs (a36b13d)
- Fixed: Fixed error when creating user (594084e)

## [server-v2.0.6](https://github.com/laurent22/joplin/releases/tag/server-v2.0.6) - 2021-06-07T17:27:27Z

- New: Add Stripe integration (770af6a)
- New: Add request duration to log (c8d7ecb)
- New: Add terms and privacy page (db7b802)
- New: Added way to disable signup page, and added links between signup and login pages (75d79f3)
- Improved: Check share ID when uploading a note (3c41b45)
- Improved: Load shared user content from correct domain (de45740)

## [server-v2.0.5](https://github.com/laurent22/joplin/releases/tag/server-v2.0.5) - 2021-06-02T08:14:47Z

- New: Add version number on website (0ef7e98)
- New: Added signup pages (41ed66d)
- Improved: Allow disabling item upload for a user (f8a26cf)

## [server-v2.0.4](https://github.com/laurent22/joplin/releases/tag/server-v2.0.4) - 2021-05-25T18:33:11Z

- Fixed: Fixed Item and Log page when using Postgres (ee0f237)

## [server-v2.0.3](https://github.com/laurent22/joplin/releases/tag/server-v2.0.3) - 2021-05-25T18:08:46Z

- Fixed: Fixed handling of request origin (12a6634)

## [server-v2.0.2](https://github.com/laurent22/joplin/releases/tag/server-v2.0.2) - 2021-05-25T19:15:50Z

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

## [server-v2.0.1](https://github.com/laurent22/joplin/releases/tag/server-v2.0.1) - 2021-05-14T13:55:45Z

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
