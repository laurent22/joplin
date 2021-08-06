import { SubPath, redirect, makeUrl, UrlType } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { checkRepeatPassword } from './users';
import { NotificationKey } from '../../models/NotificationModel';
import { AccountType } from '../../models/UserModel';
import { ErrorForbidden } from '../../utils/errors';

function makeView(error: Error = null): View {
	const view = defaultView('signup', 'Sign Up');
	view.content = {
		error,
		postUrl: makeUrl(UrlType.Signup),
		loginUrl: makeUrl(UrlType.Login),
	};
	return view;
}

export interface FormUser {
	full_name: string;
	email: string;
	password: string;
	password2: string;
}

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('signup', async (_path: SubPath, _ctx: AppContext) => {
	return makeView();
});

router.post('signup', async (_path: SubPath, ctx: AppContext) => {
	if (!config().signupEnabled) throw new ErrorForbidden('Signup is not enabled');

	try {
		const formUser = await bodyFields<FormUser>(ctx.req);
		const password = checkRepeatPassword(formUser, true);

		const user = await ctx.joplin.models.user().save({
			account_type: AccountType.Basic,
			email: formUser.email,
			full_name: formUser.full_name,
			password,
		});

		const session = await ctx.joplin.models.session().createUserSession(user.id);
		ctx.cookies.set('sessionId', session.id);

		await ctx.joplin.models.notification().add(user.id, NotificationKey.ConfirmEmail);

		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		return makeView(error);
	}
});

export default router;
