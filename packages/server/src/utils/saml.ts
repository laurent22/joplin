import { ServiceProvider, IdentityProvider, setSchemaValidator } from 'samlify';
import * as validator from '@authenio/samlify-xmllint-wasm';
import { readFile } from 'fs-extra';
import config from '../config';
import { PostBindingContext } from 'samlify/types/src/entity';
import { _ } from '@joplin/lib/locale';
import { SamlRelayState } from './types';
import { User } from '../services/database/types';
import { ErrorForbidden } from './errors';
import { createHash } from 'crypto';

const checkIfSamlIsEnabled = () => {
	if (!config().saml.enabled) {
		throw new Error('SAML support is disabled for this server.');
	}
};

export const getServiceProvider = async (relayState: SamlRelayState = null) => {
	checkIfSamlIsEnabled();

	return ServiceProvider({
		metadata: await readFile(config().saml.serviceProviderConfigFile),
		relayState,
	});
};

export const getIdentityProvider = async () => {
	checkIfSamlIsEnabled();

	return IdentityProvider({
		metadata: await readFile(config().saml.identityProviderConfigFile),
	});
};

// As extracted by samlify, where any value may be repeated in the XML
export interface LoginResponseExtract {
	audience?: string | string[];
	response?: Record<string, string | string[]>;
	conditions?: Record<string, string | string[]>;
	issuer?: string | string[];
	nameID?: string;
	sessionIndex?: Record<string, string | string[]>;
	attributes?: Record<string, string | string[]>;
}

type ServiceProviderInstance = Awaited<ReturnType<typeof getServiceProvider>>;

// Assertion key => time until which the assertion is valid
const usedLoginAssertions = new Map<string, number>();
const maxUsedLoginAssertions = 100_000;

// samlify checks the signature, the issuer and the validity window of a response, but not that it was issued for this
// server, which an identity provider shared with other applications also does for them, nor that it is used only once.
export const checkLoginResponse = (serviceProvider: ServiceProviderInstance, extract: LoginResponseExtract, now = Date.now()) => {
	const audiences = Array.isArray(extract.audience) ? extract.audience : [extract.audience];
	if (!audiences.includes(serviceProvider.entityMeta.getEntityID())) throw new ErrorForbidden('This SAML response was issued for another application');

	const destination = extract.response?.destination;
	if (destination && destination !== serviceProvider.entityMeta.getAssertionConsumerService('post')) throw new ErrorForbidden('This SAML response was sent to another address');

	const notOnOrAfter = Date.parse(String(extract.conditions?.notOnOrAfter || ''));
	if (isNaN(notOnOrAfter)) throw new ErrorForbidden('This SAML response has no expiry time');

	// The response ID is not covered by the signature when only the assertion is signed, which is the default for some
	// identity providers, so a replay is recognised from the signed assertion's content instead
	const assertionKey = createHash('sha256').update(JSON.stringify([extract.issuer, extract.nameID, extract.conditions, extract.sessionIndex, extract.audience, extract.attributes])).digest('hex');

	for (const [key, expiryTime] of usedLoginAssertions) {
		if (expiryTime > now && usedLoginAssertions.size <= maxUsedLoginAssertions) break;
		usedLoginAssertions.delete(key);
	}

	if (usedLoginAssertions.has(assertionKey)) throw new ErrorForbidden('This SAML response has already been used');
	usedLoginAssertions.set(assertionKey, notOnOrAfter);
};

export const setupSamlAuthentication = () => {
	setSchemaValidator(validator);
};

export const getLoginRequest = async (relayState: SamlRelayState = null) => {
	const [sp, idp] = await Promise.all([
		getServiceProvider(relayState),
		getIdentityProvider(),
	]);

	return sp.createLoginRequest(idp, 'post') as PostBindingContext;
};

// This does not rely on the usual templates since the redirect should be fast, and shouldn't contain too much HTML code.
export const generateRedirectHtml = async (relayState: SamlRelayState = null) => {
	const loginRequest = await getLoginRequest(relayState);

	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_('Joplin SSO Authentication')}</title>
</head>
<body>
    <p>${_('Please wait while we load your organisation sign-in page...')}</p>

    <form id="saml-form" method="post" action="${loginRequest.entityEndpoint}" autocomplete="off">
        <input type="hidden" name="${loginRequest.type}" value="${loginRequest.context}"/>

        ${loginRequest.relayState ? `<input type="hidden" name="RelayState" value="${loginRequest.relayState}"/>` : ''}
    </form>

    <script type="text/javascript">
        (() => {
            document.querySelector('#saml-form').submit();
        })();
    </script>
</body>
</html>`;
};

export const samlOwnedUserProperties = (): (keyof User)[] => {
	return [
		'full_name',
		'email',
		'password',
	];
};
