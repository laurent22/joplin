# Lock types

There are two types of locks:

- **SYNC**: Used when synchronising a client with a target. There can be multiple SYNC locks simultaneously.
- **EXCLUSIVE**: Used when a client upgrades a sync target. There can be only one EXCLUSIVE lock.

# Timeout

When a client acquires a lock, it must refresh it every X seconds. A lock timeout after Y seconds (where X < Y). A lock with a timestamp greater than Y is considered expired and can be ignored by other clients. A client that tries to refresh a lock that has expired should fail.

For example, if a client is currently syncing, it must stop doing so if it couldn't refresh the lock with Y seconds.

For example, if a client is upgrading a target, it must stop doing so if it couldn't refresh the lock within Y seconds.

# Acquiring a SYNC lock

- The client check if there is a valid EXCLUSIVE lock on the target
- If there is, it must stop the sync process
- Otherwise it checks if it owns a SYNC lock on the target
    - If it does, it starts syncing
        - When syncing is done, it releases the SYNC lock
    - If it doesn't, it acquires a SYNC lock and repeat the complete process from the beginning (to avoid race conditions)

# Acquiring an EXCLUSIVE lock

- The client check if there is a valid EXCLUSIVE or SYNC lock on the target
- If there is, it must stop the upgrade process (or wait till target is unlocked)
- Otherwise it checks if it owns an EXCLUSIVE lock on the target
    - If it does, it starts upgrading the target
        - When upgrading is done, it releases the EXCLUSIVE lock
    - If it doesn't, it acquires an EXCLUSIVE lock and repeat the complete process from the beginning (to avoid race conditions)

# Lock files

The lock files are in format `<lockType>_<clientType>_<clientId>.json` with lockType being "exclusive" or "sync", clientType being "desktop", "mobile" or "cli" and clientId is the globally unique ID assigned to a client profile when it is created.

The have the following content:

```json
{
    "type": "exclusive",
    "clientType": <string>,
    "clientId": <string>,
    "updatedTime": <timestamp in milliseconds>,
}
```

(Note that the lock file content is for information purpose only. Its content is not used in the lock algorithm since all data can be derived from the filename and file timestamp)

Although only one client can acquire an exclusive lock, there can be multiple `exclusive_*.json` lock files in the lock folder (for example if a client crashed before releasing a lock or if two clients try to acquire a lock at the exact same time). In this case, only the oldest lock amongst the active ones is the valid one. If there are two locks with the same timestamp, the one with lowest client ID is the valid one.

# Sync Target Migration

First the app checks the sync target version - if it's new (no version), it set it up by upgrading to the latest sync version.

If it's the same as the client supported version, it syncs as normal.

If it's lower than the client supported version, the client does not allow sync and instead displays a message asking the user to upgrade the sync target (upgradeState = SHOULD_UPGRADE).

If the user click on the link to upgrade, upgradeState becomes MUST_UPGRADE, and the app restarts.

On startup, the app check the upgradeState setting. If it is MUST_UPGRADE it displays the upgrade screen and starts upgrarding. Once done it sets upgradeState back to IDLE, and restart the app.