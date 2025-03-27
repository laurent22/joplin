import { ServiceProvider, IdentityProvider, setSchemaValidator } from 'samlify';
import * as validator from '@authenio/samlify-xmllint-wasm';
import { readFile } from 'fs-extra';
import config from '../config';
import { PostBindingContext } from 'samlify/types/src/entity';
import { _ } from '@joplin/lib/locale';
import { SamlRelayState } from './types';

// Checks if SAML support is enabled.
//
// Throws an error otherwise.
function checkIfSamlIsEnabled() {
	if (!config().saml.enabled) {
		throw new Error('SAML support is disabled for this server.');
	}
}

// Load configuration for the Service Provider.
// @param relayState The relay state to use for any subsequent login requests.
// @returns A ServiceProvider object.
export async function serviceProvider(relayState: SamlRelayState = null) {
	checkIfSamlIsEnabled();

	return ServiceProvider({
		metadata: await readFile(config().saml.serviceProviderConfigFile),
		relayState,
	});
}

// Load configuration for the Identity Provider.
// @returns An IdentityProvider object.
export async function identityProvider() {
	checkIfSamlIsEnabled();

	return IdentityProvider({
		metadata: await readFile(config().saml.identityProviderConfigFile),
	});
}

// Set up SAML authentication.
//
// Should be called once when the server is starting.
export function setupSamlAuthentication() {
	setSchemaValidator(validator);
}

// Create a new login request.
// @param relayState The relay state to use.
// @returns A login request, with the proper attributes (such as the proper URL to the IdP).
export async function getLoginRequest(relayState: SamlRelayState = null) {
	const [sp, idp] = await Promise.all([
		serviceProvider(relayState),
		identityProvider(),
	]);

	return sp.createLoginRequest(idp, 'post') as PostBindingContext;
}

// Generate an HTML document that redirects the user to the Identity Provider's login page.
//
// This does not rely on the usual templates since the redirect should be fast, and shouldn't contain too much HTML code.
// @param relayState The relay state to use.
// @returns Plain HTML that redirect the browser to the IdP.
export async function generateRedirectHtml(relayState: SamlRelayState = null) {
	const loginRequest = await getLoginRequest(relayState);

	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_('Joplin SSO Authentication')}</title>
</head>
<body>
    <p>${_('Please wait while we load your organization sign-in page...')}</p>

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
}
