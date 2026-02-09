# Joplin Server SAML support

Joplin Server supports authentication via SAML (Security Assertion Markup Language), allowing integration with identity providers for single sign-on (SSO). This enables users to log in securely using their existing organisational credentials, simplifying account management and enhancing security.

## Setup

To enable SAML, you will need to set the environment variables as defined [in this file](https://github.com/laurent22/joplin/blob/2e846fe15d957873bfa6f16e44ccafc6b31e7a93/packages/server/src/env.ts#L163) and provide a link to your SP and IDP config file.

An SP file would look like this:

```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="Joplin">
	<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
		<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
		<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
									Location="http://localhost:22300/api/saml"
									index="1" />
	</md:SPSSODescriptor>
</md:EntityDescriptor>
```

While and IDP config would look like this:

<!-- cSpell:disable -->

```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="saml-idp">
	<md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
		<md:KeyDescriptor use="signing">
		<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
			<ds:X509Data>
			<ds:X509Certificate>MIIDIzCCAgugAwIBAgIUOGfU4onZ0So0R4L4FH2OUo7cmwcwDQYJKoZIhvcNAQELBQAwITEfMB0GA1UEAwwWVGVzdCBJZGVudGl0eSBQcm92aWRlcjAeFw0yNDEwMjUwOTI0NDBaFw00NDEwMjAwOTI0NDBaMCExHzAdBgNVBAMMFlRlc3QgSWRlbnRpdHkgUHJvdmlkZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCrgUKiNwsnlCwQViTqUfTKJXtGQdFZ5ZHHupqNX3hLa2H/MqL25k00p9dw3h9ddpnpmvBsP4jaEeXF4ibU/HQ78cWiUzPkQripkTtYvAM2I/KodqyCHPJr0yJtFUCT/rDrtrCRZ1eZ+K1nvzVFBqiQwgY8IOmhVIqvK7r+sOuDoP7fFDbiZgDyD07noA/oMlcfkm/xj5O70YGX+Iqh8FMJTA8z6DyqTQKtXPBhndkchZDehCkWmKsmpvM3X9QBBl71tJoFu9WqGgtvfMWq+/WoTJ18jbcj0p2jhhEuvDsI1jmeisXzwunO0HtmbDgd17rjOP2CIXUffAV+gg7B5PFBAgMBAAGjUzBRMB0GA1UdDgQWBBSDjyS0o+Y8Sjb885BCo+bmvbwrgTAfBgNVHSMEGDAWgBSDjyS0o+Y8Sjb885BCo+bmvbwrgTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAMxqjfHu6rjnm4PeOXywpnRca8Md95tnh0YJNAu9Vb19jpqUF96psS1lZMqmZ66tnLPCi+rBAtI66BO2wClqxe5K9MeiJIZOwDHLqJ8TDGE+8LM/uEOqobtdjp1vSEuLAC2zeXba9ISqYUrXGcTic65EERGBnG3w2D/rTm7te7C0b6yYet1l4K1RqctxDaI90YV2a1aiT1wngaOQclHAJlR7c0kJP6JZaS/R56Y88S0exZo82u4CsI3GuY42M2ET74/5pllsRsYrQz6iXqnrbcpxvFAWj5D+1uq+rdqc8M0dW5CXZ7zLjJxXH9pFneOnSyX6YbuK+b6kdKUxKlQRMs</ds:X509Certificate>
			</ds:X509Data>
		</ds:KeyInfo>
		</md:KeyDescriptor>
		<md:KeyDescriptor use="encryption">
		<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
			<ds:X509Data>
			<ds:X509Certificate>MIIDIzCCAgugAwIBAgIUOGfU4onZ0So0R4L4FH2OUo7cmwcwDQYJKoZIhvcNAQELBQAwITEfMB0GA1UEAwwWVGVzdCBJZGVudGl0eSBQcm92aWRlcjAeFw0yNDEwMjUwOTI0NDBaFw00NDEwMjAwOTI0NDBaMCExHzAdBgNVBAMMFlRlc3QgSWRlbnRpdHkgUHJvdmlkZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCrgUKiNwsnlCwQViTqUfTKJXtGQdFZ5ZHHupqNX3hLa2H/MqL25k00p9dw3h9ddpnpmvBsP4jaEeXF4ibU/HQ78cWiUzPkQripkTtYvAM2I/KodqyCHPJr0yJtFUCT/rDrtrCRZ1eZ+K1nvzVFBqiQwgY8IOmhVIqvK7r+sOuDoP7fFDbiZgDyD07noA/oMlcfkm/xj5O70YGX+Iqh8FMJTA8z6DyqTQKtXPBhndkchZDehCkWmKsmpvM3X9QBBl71tJoFu9WqGgtvfMWq+/WoTJ18jbcj0p2jhhEuvDsI1jmeisXzwunO0HtmbDgd17rjOP2CIXUffAV+gg7B5PFBAgMBAAGjUzBRMB0GA1UdDgQWBBSDjyS0o+Y8Sjb885BCo+bmvbwrgTAfBgNVHSMEGDAWgBSDjyS0o+Y8Sjb885BCo+bmvbwrgTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAMxqjfHu6rjnm4PeOXywpnRca8Md95tnh0YJNAu9Vb19jpqUF96psS1lZMqmZ66tnLPCi+rBAtI66BO2wClqxe5K9MeiJIZOwDHLqJ8TDGE+8LM/uEOqobtdjp1vSEuLAC2zeXba9ISqYUrXGcTic65EERGBnG3w2D/rTm7te7C0b6yYet1l4K1RqctxDaI90YV2a1aiT1wngaOQclHAJlR7c0kJP6JZaS/R56Y88S0exZo82u4CsI3GuY42M2ET74/5pllsRsYrQz6iXqnrbcpxvFAWj5D+1uq+rdqc8M0dW5CXZ7zLjJxXH9pFneOnSyX6YbuK+b6kdKUxKlQRMs</ds:X509Certificate>
			</ds:X509Data>
		</ds:KeyInfo>
		</md:KeyDescriptor>
		<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
		<NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
		<NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</NameIDFormat>
		<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:7000/saml/sso"/>
		<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:7000/saml/sso"/>
		<Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="First Name" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Last Name" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="displayName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Display Name" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="E-Mail Address" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="mobilePhone" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Mobile Phone" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Groups" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
		<Attribute Name="userType" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="User Type" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
	</md:IDPSSODescriptor>
</md:EntityDescriptor>
```

<!-- cSpell:enable -->

### Required user attributes

Users must have the following attributes configured on your SAML provider:

- `email`: The user email.
- `displayName`: The user full name.

### API domain

Joplin Server supports using a separate domain for the API calls, using the `API_BASE_URL` env variable. However this setup is **not supported with SAML**. Both API and website must be under the same URL - essentially it means that both `APP_BASE_URL` and `API_BASE_URL` should be set to the same URL.

Your environment file would look like this:

```ini
APP_BASE_URL=https://myserver.com
API_BASE_URL=https://myserver.com
```

### Session expiration

By default Joplin Server automatically clears sessions every 6 hours, forcing clients to login again. This is fine in a context where login can be done via an API, so that the client can automatically login again. However with SAML the user needs to go through the manual login process every time. For this reason it is strongly recommended to disable this task. You can do so by setting `DELETE_EXPIRED_SESSIONS_SCHEDULE` to an empty string, like so:

```ini
DELETE_EXPIRED_SESSIONS_SCHEDULE=
```

## Custom CA certificates

By default, the Joplin Server image does not include the `ca-certificates` which may be needed to get custom certificates for your mail server working. You can install those additional packages (and any other package), using the method below:

```yaml
# docker-compose.yml

services:

  joplin-server:
    image: path/to/image
    ports:
      - "80:80"
    env_file: .env
    volumes:
      - ./config/data:/data:rw
      - ./config/saml:/saml:ro
      - ./config/certs:/tmp/certs:ro
    user: root
    command: >
      bash -c '
        # Install the missing packages

        if ! dpkg -s ca-certificates >/dev/null 2>&1; then
          apt update &&
          apt install -y ca-certificates openssl
        fi

        # Create the CA folder if necessary

        mkdir -p /usr/local/share/ca-certificates

        # Copy the certificates only if modified

        changed=false
        for cert in /tmp/certs/*.crt; do
          if [ -f "$cert" ]; then
            target=/usr/local/share/ca-certificates/$(basename "$cert")
            if [ ! -f "$target" ] || ! cmp -s "$cert" "$target"; then
              cp "$cert" "$target"
              changed=true
            fi
          fi
        done

        # Update the CA only if necessary

        if [ "$changed" = true ]; then
          update-ca-certificates
        fi

        # Launch the server

        tini -- yarn start-server
      '
```