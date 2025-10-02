# Sharing a notebook with E2EE enabled

- When sharing the notebook, a key (NOTEBOOK_KEY) is automatically generated and encrypted with the sender master password.
	- That key ID is then associated with the notebook
- When adding a recipient, the key is decrypted using the sender master password, and reencrypted using the recipient public key
	- That encrypted key is then attached to the share_user object (the invitation)
- When the recipient receives the invitation, the key is retrieved from it, then decrypted using the private key, and reencrypted using the recipient master password.

Once the key exchange is done, each user has their own copy of NOTEBOOK_KEY encrypted with their own master password. Public/Private Keys are only used to transfer NOTEBOOK_KEY.

Whenever any item within the notebook is encrypted, it is done with NOTEBOOK_KEY.

# Migrations

Enabling migration to a new public key algorithm can be done by:
1. Registering a new public key algorithm. This involves:
	1. Adding a new item to the `PublicKeyAlgorithm` `enum` and
	2. Updating the `PublicKeyCryptoProvider` for each platform.
2. Adding the new `PublicKeyAlgorithm` enum item to the `ppkMigrations` array in `ppk.ts`.
