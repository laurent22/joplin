# Joplin Server LDAP support

Joplin Server supports authentication via LDAP (Lightweight Directory Access Protocol), allowing integration with existing directory services for centralised user management. This enables users to log in using their organisation's credentials, streamlining access control and improving security.

## Setup

To enable LDAP, you will need to set the environment variables as defined [in this file](https://github.com/laurent22/joplin/blob/2e846fe15d957873bfa6f16e44ccafc6b31e7a93/packages/server/src/env.ts#L136). You can define up to too LDAP providers.
