# Encryption

Encrypted data is encoded to ASCII because encryption/decryption functions in React Native can only deal with strings. So for compatibility with all the apps we need to use the lowest common denominator.

## Encrypted data format

### Header

Name               |  Size
-------------------|-------------------------
Version number     |  2 chars (Hexa string)
Encryption method  |  2 chars (Hexa string)
Master key ID      |  32 chars (Hexa string)

See lib/services/EncryptionService.js for the list of available encryption methods.

### Data chunk

The data is encoded in one or more chuncks for performance reasons. That way it is possible to take a block of data from one file and encrypt it to another block in another file. Encrypting/decrypting the whole file in one go would not work (on mobile especially).

Name    |  Size
--------|----------------------------
Length  |  6 chars (Hexa string)
Data    |  ("Length" bytes) (ASCII)

## Master Keys

The master keys are used to encrypt and decrypt data. They can be generated from the Encryption Service, and are saved to the database. They are themselves encrypted via a user password.

These encrypted master keys are transmitted with the sync data so that they can be available to each client. Each client will need to supply the user password to decrypt each key.

The application supports multiple master keys in order to handle cases where one offline client starts encrypting notes, then another offline client starts encrypting notes too, and later both sync. Both master keys will have to be decrypted separately with the user password.

Only one master key can be active for encryption purposes. For decryption, the algorithm will check the Master Key ID in the header, then check if it's available to the current app and, if so, use this for decryption.

## Encryption Service

The applications make use of the EncryptionService class to handle encryption and decryption. Before it can be used, a least one master key must be loaded into it and marked as "active".
