import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { checkPassword } from './users';
import { NotificationKey } from '../../models/NotificationModel';

function makeView(error: Error = null): View {
	const view = defaultView('signup');
	view.content.error = error;
	view.content.postUrl = `${config().baseUrl}/signup`;
	view.navbar = false;
	return view;
}

interface FormUser {
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
	try {
		const formUser = await bodyFields<FormUser>(ctx.req);
		const password = checkPassword(formUser, true);

		const user = await ctx.models.user().save({
			email: formUser.email,
			full_name: formUser.full_name,
			password,
		});

		const session = await ctx.models.session().createUserSession(user.id);
		ctx.cookies.set('sessionId', session.id);

		await ctx.models.notification().add(user.id, NotificationKey.ConfirmEmail);

		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		return makeView(error);
	}
});

export default router;
