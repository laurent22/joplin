import { ServiceProvider, IdentityProvider, setSchemaValidator } from 'samlify';
import * as validator from '@authenio/samlify-xmllint-wasm';
import { readFile } from 'fs-extra';
import config from '../config';
import { PostBindingContext } from 'samlify/types/src/entity';
import { _ } from '@joplin/lib/locale';
import { SamlRelayState } from './types';
import { User } from '../services/database/types';

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
