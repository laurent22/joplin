import { RouteHandler, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { forgotPasswordUrl, resetPasswordUrl } from '../../utils/urlUtils';
import { bodyFields } from '../../utils/requestUtils';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('index/password');

const router: Router = new Router(RouteType.Web);
router.public = true;

interface ForgotPasswordFields {
	email: string;
}

interface ResetPasswordFields {
	password: string;
	password2: string;
}

const subRoutes: Record<string, RouteHandler> = {
	forgot: async (_path: SubPath, ctx: AppContext) => {
		let confirmationMessage = '';

		if (ctx.method === 'POST') {
			const fields = await bodyFields<ForgotPasswordFields>(ctx.req);
			try {
				await ctx.joplin.models.user().sendResetPasswordEmail(fields.email || '');
			} catch (error) {
				logger.warn(`Could not send reset email for ${fields.email}`, error);
			}

			confirmationMessage = 'If we have an account that matches your email, you should receive an email with instructions on how to reset your password shortly.';
		}

		const view = defaultView('password/forgot', 'Reset password');
		view.content = {
			postUrl: forgotPasswordUrl(),
			confirmationMessage,
		};
		return view;
	},

	reset: async (_path: SubPath, ctx: AppContext) => {
		let successMessage = '';
		let error: Error = null;
		const token = ctx.query.token as string;

		if (ctx.method === 'POST') {
			const fields = await bodyFields<ResetPasswordFields>(ctx.req);

			try {
				await ctx.joplin.models.user().resetPassword(token, fields);
				successMessage = 'Your password was successfully reset.';
			} catch (e) {
				error = e;
			}
		}

		const view = defaultView('password/reset', 'Reset password');
		view.content = {
			postUrl: resetPasswordUrl(token),
			error,
			successMessage,
		};
		view.jsFiles.push('zxcvbn');
		return view;
	},
};

router.get('password/:id', async (path: SubPath, ctx: AppContext) => {
	if (!subRoutes[path.id]) throw new ErrorNotFound(`Not found: password/${path.id}`);
	return subRoutes[path.id](path, ctx);
});

router.post('password/:id', async (path: SubPath, ctx: AppContext) => {
	if (!subRoutes[path.id]) throw new ErrorNotFound(`Not found: password/${path.id}`);
	return subRoutes[path.id](path, ctx);
});

export default router;
