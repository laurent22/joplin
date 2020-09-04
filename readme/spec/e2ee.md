# Encryption

Encrypted data is encoded to ASCII because encryption/decryption functions in React Native can only deal with strings. So for compatibility with all the apps we need to use the lowest common denominator.

## Encrypted data format

### Header

Name               |  Size
-------------------|-------------------------
Identifier         |  3 chars ("JED")
Version number     |  2 chars (Hexa string)

This is followed by the encryption metadata:

Name               |  Size
-------------------|-------------------------
Length             |  6 chars (Hexa string)
Encryption method  |  2 chars (Hexa string)
Master key ID      |  32 chars (Hexa string)

See `lib/services/EncryptionService.js` for the list of available encryption methods.

### Data chunk

The data is encoded in one or more chunks for performance reasons. That way it is possible to take a block of data from one file and encrypt it to another block in another file. Encrypting/decrypting the whole file in one go would not work (on mobile especially).

Name    |  Size
--------|----------------------------
Length  |  6 chars (Hexa string)
Data    |  ("Length" bytes) (ASCII)

## Master Keys

The master keys are used to encrypt and decrypt data. They can be generated from the Encryption Service and are saved to the database. They are themselves encrypted via a user password using a [strong encryption method](https://github.com/laurent22/joplin/blob/fb6dee32ac035b00153106273135fb16be4b4fa5/ReactNativeClient/lib/services/EncryptionService.js#L263).

These encrypted master keys are transmitted with the sync data so that they can be available to each client. Each client will need to supply the user password to decrypt each key.

The application supports multiple master keys in order to handle cases where one offline client starts encrypting notes, then another offline client starts encrypting notes too, and later both sync. Both master keys will have to be decrypted separately with the user password.

Only one master key can be active for encryption purposes. For decryption, the algorithm will check the Master Key ID in the header, then check if it's available to the current app and, if so, use this for decryption.

## Encryption Service

The applications make use of the `EncryptionService` class to handle encryption and decryption. Before it can be used, a least one master key must be loaded into it and be marked as "active".

## Encryption workflow

Items are encrypted only during synchronisation, when they are serialised (via `BaseItem.serializeForSync`), so before being sent to the sync target.

They are decrypted by DecryptionWorker in the background.

The apps handle displaying both decrypted and encrypted items, so that user is aware that these items are there even if not yet decrypted. Encrypted items are mostly read-only to the user, except that they can be deleted.

## Enabling and disabling encryption

Enabling/disabling E2EE while two clients are in sync might have an unintuitive behaviour (although that behaviour might be correct), so below some scenarios are explained:

- If client 1 enables E2EE, all items will be synced to target and will appear encrypted on target. Although all items have been re-uploaded to the target, their timestamps did *not* change (because the item data itself has not changed, only its representation). Because of this, client 2 will not re-download the items - it does not need to do so anyway since it has already the item data.

- When a client sync and download a master key for the first time, encryption will be automatically enabled (user will need to supply the master key password). In that case, all items that are not encrypted will be re-synced. Uploading only non-encrypted items is an optimisation since if an item is already encrypted locally it means it's encrypted on target too.

- If both clients are in sync with E2EE enabled: if client 1 disable E2EE, it's going to re-upload all the items unencrypted. Client 2 again will not re-download the items for the same reason as above (data did not change, only representation). Note that user *must* manually disable E2EE on all clients otherwise some will continue to upload encrypted items. Since synchronisation is stateless, clients do not know whether other clients use E2EE or not so this step has to be manual.

- Although messy, Joplin supports having some clients send encrypted items and others unencrypted ones. The situation gets resolved once all the clients have the same E2EE settings.

- Currently, there is no way to delete encryption keys if you do not need them anymore or if you disabled the encryption completely. You will get a persistant notification to provide a Master Key password on a new device, even if encryption is disabled. Entering the Master Key(s) password and still having the encryption disabled will get rid of the notification. See [Delete E2EE Master Keys](https://discourse.joplinapp.org/t/delete-e2ee-master-keys/906) for more info.
