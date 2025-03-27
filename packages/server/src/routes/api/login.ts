import config from '../../config';
import Router from '../../utils/Router';
import { redirect, SubPath } from '../../utils/routeUtils';
import { generateRedirectHtml, identityProvider, serviceProvider } from '../../utils/saml';
import { AppContext, RouteType, SamlPostResponse } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import { InternalServerError } from '../../utils/errors';
import { FlowResult } from 'samlify/types/src/flow';
import { cookieSet } from '../../utils/cookies';
import defaultView from '../../utils/defaultView';

export const router = new Router(RouteType.Api);

router.public = true;

// Set an error message saying that SAML is disabled.
// @param ctx The AppContext.
function samlNotAvailable(ctx: AppContext) {
	ctx.status = 403;
	ctx.body = { error: 'This server does not accept SAML authentication.' };
}

// Redirect the user to the IdP login page, if they somehow get to this URL directly.
router.get('api/saml', async (_path: SubPath, ctx: AppContext) => {
	if (config().saml.enabled) {
		return await generateRedirectHtml();
	} else {
		return samlNotAvailable(ctx);
	}
});

// Called when a user successfully authenticated with the IdP, and was redirected to Joplin.
router.post('api/saml', async (_path: SubPath, ctx: AppContext) => {
	if (config().saml.enabled) {
		// Load SAML configuration
		const [sp, idp] = await Promise.all([
			serviceProvider(),
			identityProvider(),
		]);

		// Parse the login response
		const fields = await bodyFields<SamlPostResponse>(ctx.req);

		let result: FlowResult;

		try {
			result = await sp.parseLoginResponse(idp, 'post', { body: fields });
		} catch (error) {
			throw new InternalServerError('Failed to parse the SAML response! Please check server configuration.', { details: { originalError: error } });
		}

		// Extract attributes from the SAML response
		const email = result.extract.attributes['email'];
		const displayName = result.extract.attributes['displayName'];

		// Validate the attributes
		if (typeof email !== 'string' || email === '' || typeof displayName !== 'string' || displayName === '') {
			throw new InternalServerError('Invalid SAML response. Either the email or the display name is invalid.');
		}

		// Load the user
		const user = await ctx.joplin.models.user().ssoLogin(email, displayName);

		// Create a new session
		const session = await ctx.joplin.models.session().createUserSession(user.id);

		if (fields.RelayState) {
			switch (fields.RelayState) {
			case 'web-login': { // If the user wanted to load a page from Joplin Server, we set the cookie for this session
				cookieSet(ctx, 'sessionId', session.id);
				return redirect(ctx, `${config().baseUrl}/home`);
			}

			case 'app-login': { // If the user came from a client, we load the redirect page.
				const view = defaultView('samlAppRedirect', 'Login');
				const redirectUrl = `joplin://x-callback-url/samlLogin?id=${session.id}&user_id=${session.user_id}`;

				view.content = {
					samlOrganizationName: config().saml.enabled && config().saml.organizationDisplayName ? config().saml.organizationDisplayName : undefined,
					redirectUrl,
				};

				return view;
			}
			}
		} else { // Otherwise, just return the tokens as a JSON object
			return { id: session.id, user_id: session.user_id };
		}
	} else {
		return samlNotAvailable(ctx);
	}
});

export default router;
