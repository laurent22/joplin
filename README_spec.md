# Encryption

Encrypted data is encoded to ASCII because encryption/decryption functions in React Native can only deal with strings. So for compatibility with all the apps we need to use the lowest common denominator.

## Encrypted file format

### Header

Name               |  Size
---------------------------------------------
Version number     |  2 chars (Hexa string)
Encryption method  |  2 chars (Hexa string)

See lib/services/EncryptionService.js for the list of available encryption methods.

### Data

The data is encoded in one or more chuncks for performance reasons. That way it is possible to take a block of data from one file and encrypt it to another block in another file. Encrypting/decrypting the whole file in one go would not work (on mobile especially).

Name    |  Size
-------------------------------------
Length  |  6 chars (Hexa string)
Data    |  ("Length" bytes)