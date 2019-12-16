# GSoC: Additinal protection per note

**DRAFT**

Joplin supports E2EE, which means the content is encrypted on the sync target. Locally the content curently is not encrypted.

We should add a new option to allow encrypting selected text within a note. It would work like so:

**Encrypting note content**

- Select some text in the editor
- Select menu Edit => Encrypt
- The selected text is replaced by encrypted content

**Decrypting note content**

- Place the cursor anywhere within the encrypted content.
- Select menu Edit => Decrypt
- The encrypted text is replaced by the plain text.

## Problem

If a user tries this on a resource, the resource should be encrypted too. But what if it is linked from another note? Perhaps this should only be implemented once the one-to-one relationship between notes and resources is enforced.