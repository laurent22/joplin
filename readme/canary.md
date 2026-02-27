# Warrant Canary

This repository contains the official warrant canary for Joplin.

The purpose of the warrant canary is to provide a regularly updated, cryptographically signed statement indicating that no secret legal orders, gag orders, or similar directives have been received as of the stated date.

If such an order were ever received and disclosure were legally prohibited, the canary would cease to be updated.

## Location of the Canary

The current signed canary is published at:

https://github.com/laurent22/joplin/raw/dev/readme/canary.txt

## Canary Signing Key

The canary is signed using a dedicated OpenPGP key. It is linked from the canary.txt file.

Its fingerprint is present in the canary.txt file itself and duplicated at:

https://github.com/laurent22/joplin/blob/dev/README.md

## Updating the canary file

Run `yarn updateCanary` from the root of the repository and follow the prompt.

## Key Rotation Policy

The canary signing key may be rotated for the following reasons:

* Key expiry
* Suspected compromise
* Maintainer transition
* Operational upgrades (e.g. hardware-backed signing)

Key rotation will never be performed silently.

## Key Rotation Procedure

### 1. Generate a New Key

Create a new dedicated OpenPGP signing key.

Export the new public key in ASCII-armoured format.

### 2. Publish the New Key

Add the new public key to:

https://github.com/laurent22/joplin/raw/dev/Assets/keys/joplin-canary-signing-key.asc

### 3. Update Documentation

#### Update the README

* Mark the new fingerprint as **Active**
* Mark the previous fingerprint as **Retired**
* Document the rotation date

Example:

```
Active Canary Signing Key:
NEW FINGERPRINT

Previous Key (retired 2028-02-18):
OLD FINGERPRINT
```

#### Update updateCanary.ts

Add the new fingerprint to the canary template.

### 4. Transitional Signing

For the first canary issued after rotation:

* Sign with the new key
* Optionally also sign with the old key

This creates a cryptographic bridge between the two identities.

If the old key is compromised, do not dual-sign. Instead, publish a revocation statement.
