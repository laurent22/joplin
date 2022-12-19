# Joplin Server user status

## User flags

User flags are used to indicate problem conditions with a particular account. They are usually automatically set by various services, for example when an account go over the limit, or when a payment fails. Likewise they are removed automatically when the condition changes.

The list of flags is defined in `UserFlagType`.

## User status

A user can have various status that affects the possible actions they can do. **User statuses are derived from user flags**.

| Status | Values | Description |
| --- | --- | --- | 
| can_upload | 0 or 1 | Whether the user can upload items, such as notes or tags, to the server.
| enabled | 0 or 1 | A disabled user cannot upload or download data from the server API anymore. However, they can still login to the website, make change to their profile, etc.

Perhaps a third status: "blocked" could be created. It would be like `enabled = 0`, except they won't be able to login to the website either.

These status should only be set as a results of user flags. In other words, the application should not directly set `enabled` to 0 or 1 but instead set a user flag that would indicate the issue. A script will then process the user flags and set the status as a result.
