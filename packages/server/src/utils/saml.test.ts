import { writeFile, remove } from 'fs-extra';
import { createTempDir } from '@joplin/lib/testing/test-utils';
import config from '../config';
import { checkLoginResponse, getLoginRequest, getServiceProvider, LoginResponseExtract } from './saml';
import { ErrorBadRequest, ErrorForbidden, ErrorTooManyRequests } from './errors';
import { afterAllTests, beforeAllDb, beforeEachDb, expectHttpError, koaAppContext, models } from './testing/testUtils';
import { getApi } from './testing/apiUtils';
import { countLoginCodeFailure } from './request/limiterLoginCodeFailures';
import { SamlRelayState } from './types';

describe('saml', () => {
	let dir: string;

	beforeAll(async () => {
		await beforeAllDb('saml');

		// cSpell:disable
		const spXml = `
		<?xml version="1.0"?>
		<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
							entityID="Joplin">
			<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
				<md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
				<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
											Location="http://localhost:22300/api/saml"
											index="1" />
				
			</md:SPSSODescriptor>
		</md:EntityDescriptor>`;

		const idpXml = `
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
		</md:EntityDescriptor>`;
		// cSpell:enable

		dir = await createTempDir();
		await Promise.all([
			writeFile(`${dir}/idp.xml`, idpXml),
			writeFile(`${dir}/sp.xml`, spXml),
		]);

		config().saml = {
			enabled: true,
			identityProviderConfigFile: `${dir}/idp.xml`,
			serviceProviderConfigFile: `${dir}/sp.xml`,
			organizationDisplayName: '',
		};
	});

	afterAll(async () => {
		await afterAllTests();
		await remove(dir);
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	it.each([null, 'web-login', 'app-login'] as SamlRelayState[])('should create a login request with the relay state: %', async (relayState) => {
		const loginRequest = await getLoginRequest(relayState);

		expect(loginRequest.entityEndpoint).toBe('http://localhost:7000/saml/sso');
		expect(loginRequest.relayState).toBe(relayState);
	});

	const validLoginResponse = (sessionIndex: string): LoginResponseExtract => ({
		audience: 'Joplin',
		response: { id: `response-${sessionIndex}`, destination: 'http://localhost:22300/api/saml' },
		conditions: { notBefore: new Date().toISOString(), notOnOrAfter: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
		issuer: 'saml-idp',
		nameID: 'user@example.com',
		sessionIndex: { sessionIndex },
		attributes: { email: 'user@example.com' },
	});

	it('should accept a signed assertion only once, even in a response with a different ID', async () => {
		const serviceProvider = await getServiceProvider();
		const response = validLoginResponse('session-1');

		expect(() => checkLoginResponse(serviceProvider, response)).not.toThrow();
		// When only the assertion is signed, the response ID can be changed without invalidating the signature
		expect(() => checkLoginResponse(serviceProvider, { ...response, response: { id: 'changed-id' } })).toThrow(ErrorForbidden);
		expect(() => checkLoginResponse(serviceProvider, validLoginResponse('session-2'))).not.toThrow();
	});

	it.each([
		['issued for another application', { audience: 'wiki' }],
		['sent to another address', { response: { id: 'response-x', destination: 'https://wiki.example.com/saml' } }],
		['without an expiry time', { conditions: {} }],
	])('should refuse a login response %s', async (_case, change: LoginResponseExtract) => {
		const serviceProvider = await getServiceProvider();
		expect(() => checkLoginResponse(serviceProvider, { ...validLoginResponse('session-3'), ...change })).toThrow(ErrorForbidden);
	});

	it('should stop accepting login codes after too many failures across the server', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS = '1';

		try {
			const user = await models().user().ssoLogin('saml-user@example.com', 'SAML User', (await koaAppContext()).joplin.services);
			const newCode = async () => {
				await models().user().generateSsoCode(user);
				return user.sso_auth_code;
			};

			const session = await getApi<{ user_id: string }>('', `login_with_code/${await newCode()}`);
			expect(session.user_id).toBe(user.id);

			const code = await newCode();

			for (let i = 0; i < 999; i++) await countLoginCodeFailure();
			await expectHttpError(async () => getApi('', 'login_with_code/000000000'), ErrorBadRequest.httpCode);

			// Even a valid code is refused, as it could otherwise be found by guessing from many addresses
			await expectHttpError(async () => getApi('', `login_with_code/${code}`), ErrorTooManyRequests.httpCode);
		} finally {
			delete process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS;
		}
	});
});
