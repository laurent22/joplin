import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext, HttpMethod } from '../../utils/types';
import { bodyFields, contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound, ErrorUnprocessableEntity } from '../../utils/errors';
import { User, UserFlag, Uuid } from '../../services/database/types';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
import { NotificationKey } from '../../models/NotificationModel';
import { AccountType, accountTypeOptions } from '../../models/UserModel';
import { confirmUrl, stripePortalUrl } from '../../utils/urlUtils';
import { updateCustomerEmail } from '../../utils/stripe';
import { createCsrfTag } from '../../utils/csrf';
import { formatDateTime } from '../../utils/time';
import { cookieSet } from '../../utils/cookies';
import { userFlagToString } from '../../models/UserFlagModel';
import { stopImpersonating } from '../admin/utils/users/impersonate';
import { _ } from '@joplin/lib/locale';

export interface CheckRepeatPasswordInput {
	password: string;
	password2: string;
}

export function checkRepeatPassword(fields: CheckRepeatPasswordInput, required: boolean): string {
	if (fields.password) {
		if (fields.password !== fields.password2) throw new ErrorUnprocessableEntity('Passwords do not match');
		return fields.password;
	} else {
		if (required) throw new ErrorUnprocessableEntity('Password is required');
	}

	return '';
}

function makeUser(userId: Uuid, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;

	const password = checkRepeatPassword(fields, false);
	if (password) user.password = password;

	user.id = userId;

	return user;
}

const router = new Router(RouteType.Web);

router.get('users/:id', async (path: SubPath, ctx: AppContext, formUser: User = null, error: any = null) => {
	const owner = ctx.joplin.owner;
	if (path.id !== 'me' && path.id !== owner.id) throw new ErrorForbidden();

	const models = ctx.joplin.models;
	const userId = owner.id;

	const user = await models.user().load(userId);

	await models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);

	const postUrl = `${config().baseUrl}/users/me`;

	interface UserFlagView extends UserFlag {
		message: string;
	}

	let userFlagViews: UserFlagView[] = (await models.userFlag().allByUserId(user.id)).map(f => {
		return {
			...f,
			message: userFlagToString(f),
		};
	});

	userFlagViews.sort((a, b) => {
		return a.created_time < b.created_time ? +1 : -1;
	});

	if (!owner.is_admin) userFlagViews = [];

	const subscription = await ctx.joplin.models.subscription().byUserId(userId);

	const view: View = defaultView('user', 'Profile');
	view.content.user = formUser ? formUser : user;
	view.content.buttonTitle = _('Update profile');
	view.content.error = error;
	view.content.postUrl = postUrl;
	view.content.csrfTag = await createCsrfTag(ctx);

	if (subscription) {
		const lastPaymentAttempt = models.subscription().lastPaymentAttempt(subscription);

		view.content.subscription = subscription;
		view.content.showUpdateSubscriptionBasic = user.account_type !== AccountType.Basic;
		view.content.showUpdateSubscriptionPro = user.account_type !== AccountType.Pro;
		view.content.subLastPaymentStatus = lastPaymentAttempt.status;
		view.content.subLastPaymentDate = formatDateTime(lastPaymentAttempt.time);
	}

	view.content.hasFlags = !!userFlagViews.length;
	view.content.userFlagViews = userFlagViews;
	view.content.stripePortalUrl = stripePortalUrl();

	view.jsFiles.push('zxcvbn');
	view.cssFiles.push('index/user');

	if (config().accountTypesEnabled) {
		view.content.showAccountTypes = true;
		view.content.accountTypes = accountTypeOptions().map((o: any) => {
			o.selected = user.account_type === o.value;
			return o;
		});
	}

	return view;
});

router.publicSchemas.push('users/:id/confirm');

router.get('users/:id/confirm', async (path: SubPath, ctx: AppContext, error: Error = null) => {
	const models = ctx.joplin.models;
	const userId = path.id;
	const token = ctx.query.token as string;

	if (!token) throw new ErrorBadRequest('Missing token');

	const beforeChangingEmailHandler = async (newEmail: string) => {
		if (config().stripe.enabled) {
			try {
				await updateCustomerEmail(models, userId, newEmail);
			} catch (error) {
				if (['no_sub', 'no_stripe_sub'].includes(error.code)) {
					// ok - the user just doesn't have a subscription
				} else {
					error.message = `Your Stripe subscription email could not be updated. As a result your account email has not been changed. Please try again or contact support. Error was: ${error.message}`;
					throw error;
				}
			}
		}
	};

	if (ctx.query.confirm_email !== '0') await models.user().processEmailConfirmation(userId, token, beforeChangingEmailHandler);

	const user = await models.user().load(userId);
	if (!user) throw new ErrorNotFound(`No such user: ${userId}`);

	if (user.must_set_password) {
		const view: View = {
			...defaultView('users/confirm', 'Confirmation'),
			content: {
				user,
				error,
				token,
				postUrl: confirmUrl(userId, token),
			},
			navbar: false,
		};

		view.jsFiles.push('zxcvbn');

		return view;
	} else {
		await models.token().deleteByValue(userId, token);
		await models.notification().add(userId, NotificationKey.EmailConfirmed);

		if (ctx.joplin.owner) {
			return redirect(ctx, `${config().baseUrl}/home`);
		} else {
			return redirect(ctx, `${config().baseUrl}/login`);
		}
	}
});

interface SetPasswordFormData {
	token: string;
	password: string;
	password2: string;
}

router.post('users/:id/confirm', async (path: SubPath, ctx: AppContext) => {
	const userId = path.id;

	try {
		const fields = await bodyFields<SetPasswordFormData>(ctx.req);
		await ctx.joplin.models.token().checkToken(userId, fields.token);

		const password = checkRepeatPassword(fields, true);

		await ctx.joplin.models.user().save({ id: userId, password, must_set_password: 0 });
		await ctx.joplin.models.token().deleteByValue(userId, fields.token);

		const session = await ctx.joplin.models.session().createUserSession(userId);
		cookieSet(ctx, 'sessionId', session.id);

		await ctx.joplin.models.notification().add(userId, NotificationKey.PasswordSet);

		return redirect(ctx, `${config().baseUrl}/home`);
	} catch (error) {
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id/confirm');
		return endPoint.handler(path, ctx, error);
	}
});

router.alias(HttpMethod.POST, 'users/:id', 'users');

interface FormFields {
	id: Uuid;
	post_button: string;
	update_subscription_basic_button: string;
	update_subscription_pro_button: string;
	stop_impersonate_button: string;
}

router.post('users', async (path: SubPath, ctx: AppContext) => {
	const owner = ctx.joplin.owner;

	if (path.id && path.id !== 'me' && path.id !== owner.id) throw new ErrorForbidden();

	const models = ctx.joplin.models;
	let user: User = null;

	try {
		const body = await formParse(ctx.req);
		const fields = body.fields as FormFields;

		if (fields.id && fields.id !== owner.id) throw new ErrorForbidden();

		user = makeUser(owner.id, fields);

		if (fields.post_button) {
			const userToSave: User = models.user().fromApiInput(user);
			await models.user().checkIfAllowed(owner, AclAction.Update, userToSave);

			if (userToSave.email && userToSave.email !== owner.email) {
				await models.user().initiateEmailChange(owner.id, userToSave.email);
				delete userToSave.email;
			}

			await models.user().save(userToSave, { isNew: false });

			// When changing the password, we also clear all session IDs for
			// that user, except the current one (otherwise they would be
			// logged out).
			if (userToSave.password) await models.session().deleteByUserId(userToSave.id, contextSessionId(ctx));
		} else if (fields.stop_impersonate_button) {
			await stopImpersonating(ctx);
			return redirect(ctx, config().baseUrl);
		} else {
			throw new Error('Invalid form button');
		}

		return redirect(ctx, `${config().baseUrl}/users/me`);
	} catch (error) {
		error.message = `Error: Your changes were not saved: ${error.message}`;
		if (error instanceof ErrorForbidden) throw error;
		const endPoint = router.findEndPoint(HttpMethod.GET, 'users/:id');
		return endPoint.handler(path, ctx, user, error);
	}
});

export default router;
