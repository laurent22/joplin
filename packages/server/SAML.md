# Testing SAML

To test SAML auth, the easiest is to launch a [Keycloak](https://www.keycloak.org/) instance using Docker.

Then create a "Joplin" realm

## Creating the Joplin client

Select the previously created "Joplin" realm and import this client:

**joplin.json:**

<!-- cSpell:disable -->

```json
{
  "clientId": "joplin",
  "name": "Joplin",
  "description": "",
  "rootUrl": "",
  "adminUrl": "",
  "baseUrl": "",
  "surrogateAuthRequired": false,
  "enabled": true,
  "alwaysDisplayInConsole": false,
  "clientAuthenticatorType": "client-secret",
  "redirectUris": [
    "http://joplincloud.local:22300/api/saml"
  ],
  "webOrigins": [
    "https://www.keycloak.org"
  ],
  "notBefore": 0,
  "bearerOnly": false,
  "consentRequired": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "publicClient": true,
  "frontchannelLogout": true,
  "protocol": "saml",
  "attributes": {
    "saml.assertion.signature": "false",
    "saml.force.post.binding": "true",
    "saml.encrypt": "false",
    "saml.server.signature": "true",
    "saml.server.signature.keyinfo.ext": "false",
    "saml.signing.certificate": "MIIEmzCCAoMCBgGaKwMIYjANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZqb3BsaW4wHhcNMjUxMDI4MTMyODMwWhcNMjgxMDI4MTMzMDEwWjARMQ8wDQYDVQQDDAZqb3BsaW4wggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDAmPdKDu1AkcHMV60jt0HY2bOWXD15CZCbEF3Hb/KeAmkasPfEzCgz+olCvRtSPkbEaROLg+hrlJ6rj06xJDutFDnW4DZ0SO44gmJ1ehf7/ShghYKTW5b9HyoHfLNjwkwLpca35mwo7sXspb4H0gH+NC04Vp9BNnoxS5olVssag62pYqIi/V4PMJuBm9CT1GklWBkFtTLXUALpkdv+tEcZHsP64iW4XMWfau1n4WwCMJMb/l3LSzUOorEZXCwNOYCDevgaNzFo5neautVVnbWk0H2aZ18hPL9BlniaeVbPevLXYRh4jG2SBpH6wMO0Py0AZEqsmzbUT2masuhRhFhlUCCZhNJpdlGV4jEUclHZOtYdWuTEBYnH7D9ONsDD3ZgBDzaH7O5X95ZuWnfObuhWExgWnX2JyCuFahuKx4Dlpm/+Bu5eCDklsy2Pxq9OUzulusr0P4VgPZNtuM06JCRKKdCMUcptcpVhAAlTQvRs0z6R+vT3/pNnxIM+BoTXSCuygoH+XY6hU6e3IWWCENyhgRz5IrmE6tmosKZ1wKFcYbDxfizgv7KYw7BsqarekbBvIbtaaBEpgCFZryNT1IQG3n7T0yYuuki91HoJ/uhRCDa6SQTM1TA8Qxu+hvAQfS5kLSWS2lzSwFHDDUFi2EPWYslvj0DwIjZL8/kn3Bh23QIDAQABMA0GCSqGSIb3DQEBCwUAA4ICAQACX6DtNvFujNZVdXh0q7dk55wAy4r+7dlpWjilmZNEEfAV9k4MSGcMQvZGCBzmeh4F0Hce5E71+zhm6SFoETu8ezvrhG8RpNApqqn9DWkf9yZLJlN8Qu8gcA4CdIcUfwWbsCSrH4XWAnRQCckvvWj+XdKQXJLaF0jVeyKcAMfP84XaBa6YrmEwm9bywTZptMKmDHILNIxo0OWUTrXyGxSJTF9oglzS0FaeTFtdOOXl2X4vxJQG60hiUAAgdYSvtBWePNcOmfKVw37+kdwuN4LO9cYbZ4EqEIHnCO+zfqST9l/mfCbYJbG2uN5lf9mQr2Y7A2JW7tAK1vd7b9bV13oUzDkcDYW1TxOOXXsPyIFIaCtpKAlX4fSanxmKs/aHv9QEvyQxeV8uJGVlTQnWpJhX5M98ZlNJJBhTVrbvrgkPNUHHDFb9wMMYNdGUMBtE5H1DjmjQibxzl/hsfnsX2m4kBBQVXaDjHJljc4YljXd+OXgZmCunjt3qztjRCsPX9VCzi4gzYRxr4ccAHf6WIHPCz6A4Jn82bPwuNaA4S8DP+rPOY27FEXV3L4eZiDn7uNhdIIhRBLfHiK+c+LG+bPzIDO6QNnwClBEEo7mZ23OmPpeERbzjsjGRlf1C3cPGp+QuViwLg6v7USYd6NACKOZozVcgHtQR0mgsZi8iW0+EBg==",
    "realm_client": "false",
    "saml.artifact.binding.identifier": "Kcp8kO5LR6zvPeUSVQE8VMkeSeE=",
    "saml.artifact.binding": "false",
    "saml.signature.algorithm": "RSA_SHA256",
    "saml.useMetadataDescriptorUrl": "false",
    "saml_force_name_id_format": "false",
    "saml.client.signature": "false",
    "saml.authnstatement": "true",
    "display.on.consent.screen": "false",
    "saml_name_id_format": "username",
    "saml.signing.private.key": "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",
    "saml.allow.ecp.flow": "false",
    "saml_signature_canonicalization_method": "http://www.w3.org/2001/10/xml-exc-c14n#",
    "saml.onetimeuse.condition": "false",
    "saml.server.signature.keyinfo.xmlSigKeyInfoKeyNameTransformer": "NONE"
  },
  "authenticationFlowBindingOverrides": {},
  "fullScopeAllowed": true,
  "nodeReRegistrationTimeout": -1,
  "protocolMappers": [
    {
      "name": "displayName",
      "protocol": "saml",
      "protocolMapper": "saml-user-property-mapper",
      "consentRequired": false,
      "config": {
        "attribute.nameformat": "Basic",
        "user.attribute": "username",
        "friendly.name": "displayName",
        "attribute.name": "displayName"
      }
    },
    {
      "name": "email",
      "protocol": "saml",
      "protocolMapper": "saml-user-property-mapper",
      "consentRequired": false,
      "config": {
        "attribute.nameformat": "Basic",
        "user.attribute": "email",
        "friendly.name": "email",
        "attribute.name": "email"
      }
    }
  ],
  "defaultClientScopes": [
    "saml_organization",
    "role_list"
  ],
  "optionalClientScopes": [],
  "access": {
    "view": true,
    "configure": true,
    "manage": true
  }
}
```

 <!-- cSpell:enable -->

The client is already setup with the required attributes and redirect URLs. Change `http://joplincloud.local:22300/api/saml` to your local URL if needed.

## Setting up Joplin Server

Get the IDP XML file from Keycloak. The URL is something like this:

```
http://<keycloak-host>:<port>/realms/<realm-name>/protocol/saml/descriptor
```

The URL is likely to be something like this for this example:

```
http://localhost:8080/realms/joplin/protocol/saml/descriptor
```

It should look like this:

**idp.xml:**

 <!-- cSpell:disable -->

```xml
<md:EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="http://localhost:8080/realms/joplin"><md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:KeyDescriptor use="signing"><ds:KeyInfo><ds:KeyName>6yRI1mOQyynWBQGgYdJMGKs96yQy5yOzUnOcMAMtRw4</ds:KeyName><ds:X509Data><ds:X509Certificate>MIICmzCCAYMCBgGaKwAPnzANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZqb3BsaW4wHhcNMjUxMDI4MTMyNTE1WhcNMzUxMDI4MTMyNjU1WjARMQ8wDQYDVQQDDAZqb3BsaW4wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCmRf7tgM8Bq1P/28kOy8YVoOq/n/GhzBxaIMn10Q1Y9azR6EWmmFf7wdM+APeX53CICW6JWSNlFMI1vsmpWBHYQZxwYUPOmy7WZq5h8stWsgFTKxMvf4vej1JAZHNE/pCMk2i57B/4eqVQIHIXf4gO9W4AbSIYx8ZwxHvLGDH7Bq8ijeUKI2ifIe/NCENctLyhY+DXGAZOX0E0Wot5tONBwX/rJg4j1p1UTTmXj/kBvXb7k/4O38xYmUx6Wmx9JKrBNMuiqdm8W/JCW5/hRUCAHTY/qGK3gurtGug4xpAmHoa6WOYkZnl7VFXpMeev4UxsD8csP+/uL5i2rGVj2Qr1AgMBAAEwDQYJKoZIhvcNAQELBQADggEBAAKm6YvjKgmLNfCP7ylQ3ZVhLZfhlezXYKIEeW+sRt2tIwt6P92ueJbHq2rb5N0f9S3L9Rw1Y35MU2Ar8v9uIMwQYZQSmb0Oi1mvD4BhMa1HETuLNC7GM8p5jnbfvEVppkw84wiZaO7dDp1sfgHDQBg1RNhMowzkaWIF4WNLyLZ1oc9AP9ZK37LhHJuhN66LfNBXXw7hOzc3zZR7vwWe2z4tEg281ZeZ4jud5A4uVsY0PIiWmJ/hrlDOwUT0s8/YlLbLe49XI/LjQcnsJyt3YF0q05fOpXETgLr/NB+QrSnwbyTdTAD9SoW+avLUby056BYI7Ev9oGbVzqFySQ/Ji4E=</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:ArtifactResolutionService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/joplin/protocol/saml/resolve" index="0"></md:ArtifactResolutionService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleLogoutService><md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleLogoutService><md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat><md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleSignOnService><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="http://localhost:8080/realms/joplin/protocol/saml"></md:SingleSignOnService></md:IDPSSODescriptor></md:EntityDescriptor>
```

 <!-- cSpell:enable -->

Then create the SP XML file. It should look like this:

**sp.xml**

<!-- cSpell:disable -->

```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="joplin">
	<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
		<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
		<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://joplincloud.local:22300/api/saml" index="1" />
	</md:SPSSODescriptor>
</md:EntityDescriptor>
```

<!-- cSpell:enable -->

Again make sure that the URL matches your local server.

Finally, setup the Joplin Server environment:

```ini
SAML_ENABLED=true
SAML_IDP_CONFIG_FILE=/path/to/idp.xml
SAML_SP_CONFIG_FILE=/path/to/sp.xml
SAML_ORGANIZATION_DISPLAY_NAME=Joplin Test
```
