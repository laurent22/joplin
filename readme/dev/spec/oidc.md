# Open ID feature specification

## Setting up synchronisation for local testing

Run:

```shell
docker compose --file docker-compose-oidc.yml up
```

In a separate terminal run:

```shell
docker exec ocis cat /var/lib/ocis/idp/tmp/identifier-registration.yaml
```

This will print the list of default OIDC clients. The "ownCloud desktop app" client for example can be used to test synchronisation.

- WebDAV URL: https://localhost:9200/remote.php/dav/files/admin/
- OIDC Issuer URL: https://localhost:9200
- OIDC Client ID: `id` property from the "ownCloud desktop app" client
- OIDC Client Secret: `secret` property from the "ownCloud desktop app" client