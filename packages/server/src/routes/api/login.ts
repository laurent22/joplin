import config from '../../config';
import Router from '../../utils/Router';
import { redirect, SubPath } from '../../utils/routeUtils';
import { generateRedirectHtml, getIdentityProvider, getServiceProvider } from '../../utils/saml';
import { AppContext, RouteType, SamlPostResponse } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';
import { cookieSet } from '../../utils/cookies';
import defaultView from '../../utils/defaultView';

export const router = new Router(RouteType.Api);

router.public = true;

// Redirect the user to the Identity Provider login page, if they somehow get to this URL directly.
router.get('api/saml', async (_path: SubPath, _ctx: AppContext) => {
	if (!config().saml.enabled) throw new ErrorForbidden('SAML not enabled');
	return await generateRedirectHtml();
});

// Called when a user successfully authenticated with the Identity Provider, and was redirected to Joplin.
router.post('api/saml', async (_path: SubPath, ctx: AppContext) => {
	if (!config().saml.enabled) throw new ErrorForbidden('SAML not enabled');

	// Load SAML configuration
	const [serviceProvider, identityProvider] = await Promise.all([
		getServiceProvider(),
		getIdentityProvider(),
	]);

	// Parse the login response
	const fields = await bodyFields<SamlPostResponse>(ctx.req);

	const result = await serviceProvider.parseLoginResponse(identityProvider, 'post', { body: fields });

	// Extract attributes from the SAML response
	const email = result.extract.attributes['email'];
	const displayName = result.extract.attributes['displayName'];

	// Load the user
	const user = await ctx.joplin.models.user().ssoLogin(email, displayName);
	if (!user) throw new ErrorForbidden(`Could not login using email "${email}" and displayName "${displayName}"`);

	if (fields.RelayState) {
		switch (fields.RelayState) {
		case 'web-login': { // If the user wanted to load a page from Joplin Server, we set the cookie for this session
			const session = await ctx.joplin.models.session().createUserSession(user.id);
			cookieSet(ctx, 'sessionId', session.id);

			return redirect(ctx, `${config().baseUrl}/home`);
		}

		case 'app-login': { // If the user came from a client, we display the authentication code
			await ctx.joplin.models.user().generateSsoCode(user);

			const view = defaultView('displaySsoCode', 'Login');

			view.content = {
				ssoCode: user.sso_auth_code.replace(/\B(?=(\d{3})+(?!\d))/g, '-'), // Split the code into blocks of three digits each
				organizationName: config().saml.enabled && config().saml.organizationDisplayName ? config().saml.organizationDisplayName : undefined,
			};

			return view;
		}
		}
	} else { // Otherwise, just return the authentication code
		await ctx.joplin.models.user().generateSsoCode(user);

		return { code: user.sso_auth_code };
	}
});

router.get('api/login_with_code/:id', async (path: SubPath, ctx: AppContext) => {
	const code = path.id;
	if (!code) {
		throw new ErrorBadRequest();
	}

	const user = await ctx.joplin.models.user().authCodeLogin(code);

	if (user) {
		const session = await ctx.joplin.models.session().createUserSession(user.id);

		return {
			id: session.id,
			user_id: session.user_id,
		};
	} else { // Invalid auth code
		throw new ErrorBadRequest();
	}
});

export default router;
