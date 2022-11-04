import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { Knex } from 'knex';
import { AppContext, HttpMethod } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorForbidden, ErrorUnprocessableEntity } from '../../utils/errors';
import { User, UserFlag, UserFlagType, Uuid } from '../../services/database/types';
import config from '../../config';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { AclAction } from '../../models/BaseModel';
import { AccountType, accountTypeOptions, accountTypeToString } from '../../models/UserModel';
import uuidgen from '../../utils/uuidgen';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanShareFolder, totalSizeClass } from '../../models/utils/user';
import { yesNoDefaultOptions, yesNoOptions } from '../../utils/views/select';
import { stripePortalUrl, adminUserDeletionsUrl, adminUserUrl, adminUsersUrl, setQueryParameters } from '../../utils/urlUtils';
import { cancelSubscriptionByUserId, updateSubscriptionType } from '../../utils/stripe';
import { createCsrfTag } from '../../utils/csrf';
import { formatDateTime, Hour } from '../../utils/time';
import { startImpersonating, stopImpersonating } from './utils/users/impersonate';
import { userFlagToString } from '../../models/UserFlagModel';
import { _ } from '@joplin/lib/locale';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';

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

function boolOrDefaultToValue(fields: any, fieldName: string): number | null {
	if (fields[fieldName] === '') return null;
	const output = Number(fields[fieldName]);
	if (isNaN(output) || (output !== 0 && output !== 1)) throw new Error(`Invalid value for ${fieldName}`);
	return output;
}

function intOrDefaultToValue(fields: any, fieldName: string): number | null {
	if (fields[fieldName] === '') return null;
	const output = Number(fields[fieldName]);
	if (isNaN(output)) throw new Error(`Invalid value for ${fieldName}`);
	return output;
}

function makeUser(isNew: boolean, fields: any): User {
	const user: User = {};

	if ('email' in fields) user.email = fields.email;
	if ('full_name' in fields) user.full_name = fields.full_name;
	if ('is_admin' in fields) user.is_admin = fields.is_admin;
	if ('max_item_size' in fields) user.max_item_size = intOrDefaultToValue(fields, 'max_item_size');
	if ('max_total_item_size' in fields) user.max_total_item_size = intOrDefaultToValue(fields, 'max_total_item_size');
	if ('can_share_folder' in fields) user.can_share_folder = boolOrDefaultToValue(fields, 'can_share_folder');
	if ('can_upload' in fields) user.can_upload = intOrDefaultToValue(fields, 'can_upload');
	if ('account_type' in fields) user.account_type = Number(fields.account_type);

	const password = checkRepeatPassword(fields, false);
	if (password) user.password = password;

	if (!isNew) user.id = fields.id;

	if (isNew) {
		user.must_set_password = user.password ? 0 : 1;
		user.password = user.password ? user.password : uuidgen();
	}

	return user;
}

function defaultUser(): User {
	return {};
}

function userIsNew(path: SubPath): boolean {
	return path.id === 'new';
}

function userIsMe(path: SubPath): boolean {
	return path.id === 'me';
}

const router = new Router(RouteType.Web);

router.get('admin/users', async (_path: SubPath, ctx: AppContext) => {
	const userModel = ctx.joplin.models.user();
	await userModel.checkIfAllowed(ctx.joplin.owner, AclAction.List);

	const showDisabled = ctx.query.show_disabled === '1';
	const searchQuery = ctx.query.query || '';

	const pagination = makeTablePagination(ctx.query, 'full_name', PaginationOrderDir.ASC);
	pagination.limit = 1000;
	const page = await ctx.joplin.models.user().allPaginated(pagination, {
		queryCallback: (query: Knex.QueryBuilder) => {
			if (!showDisabled) {
				void query.where('enabled', '=', 1);
			}

			if (searchQuery) {
				void query.where(qb => {
					void qb.whereRaw('full_name like ?', [`%${searchQuery}%`]).orWhereRaw('email like ?', [`%${searchQuery}%`]);
				});
			}

			return query;
		},
	});

	const table: Table = {
		baseUrl: adminUsersUrl(),
		requestQuery: ctx.query,
		pageCount: page.page_count,
		pagination,
		headers: [
			{
				name: 'full_name',
				label: _('Full name'),
			},
			{
				name: 'email',
				label: _('Email'),
			},
			{
				name: 'account',
				label: _('Account'),
			},
			{
				name: 'max_item_size',
				label: _('Max Item Size'),
			},
			{
				name: 'total_size',
				label: _('Total Size'),
			},
			{
				name: 'max_total_size',
				label: _('Max Total Size'),
			},
			{
				name: 'can_share',
				label: _('Can Share'),
			},
		],
		rows: page.items.map(user => {
			const row: Row = {
				classNames: [user.enabled ? '' : 'is-disabled'],
				items: [
					{
						value: user.full_name ? user.full_name : '(not set)',
						url: adminUserUrl(user.id),
					},
					{
						value: user.email,
					},
					{
						value: accountTypeToString(user.account_type),
					},
					{
						value: formatMaxItemSize(user),
					},
					{
						value: `${formatTotalSize(user)} (${formatTotalSizePercent(user)})`,
						classNames: [totalSizeClass(user)],
					},
					{
						value: formatMaxTotalSize(user),
					},
					{
						value: yesOrNo(getCanShareFolder(user)),
					},
				],
			};

			return row;
		}),
	};

	const view = defaultView('admin/users', _('Users'));
	view.content = {
		userTable: makeTableView(table),
		queryArray: Object.entries(ctx.query).map(([name, value]) => {
			return { name, value };
		}).filter(e => e.name !== 'query'),
		query: searchQuery,
		searchUrl: setQueryParameters(adminUsersUrl(), ctx.query),
		csrfTag: await createCsrfTag(ctx),
		disabledToggleButtonLabel: showDisabled ? _('Hide disabled') : _('Show disabled'),
		disabledToggleButtonUrl: setQueryParameters(adminUsersUrl(), { ...ctx.query, show_disabled: showDisabled ? '0' : '1' }),
	};

	return view;
});

router.get('admin/users/:id', async (path: SubPath, ctx: AppContext, user: User = null, error: any = null) => {
	const owner = ctx.joplin.owner;
	const isMe = userIsMe(path);
	const isNew = userIsNew(path);
	const models = ctx.joplin.models;
	const userId = userIsMe(path) ? owner.id : path.id;

	user = !isNew ? user || await models.user().load(userId) : user;
	if (isNew && !user) user = defaultUser();

	await models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);

	let postUrl = '';

	if (isNew) {
		postUrl = adminUserUrl('new');
	} else if (isMe) {
		postUrl = adminUserUrl('me');
	} else {
		postUrl = adminUserUrl(user.id);
	}

	interface UserFlagView extends UserFlag {
		message: string;
	}

	const userFlagViews: UserFlagView[] = isNew ? [] : (await models.userFlag().allByUserId(user.id)).map(f => {
		return {
			...f,
			message: userFlagToString(f),
		};
	});

	userFlagViews.sort((a, b) => {
		return a.created_time < b.created_time ? +1 : -1;
	});

	const subscription = !isNew ? await ctx.joplin.models.subscription().byUserId(userId) : null;
	const isScheduledForDeletion = await ctx.joplin.models.userDeletion().isScheduledForDeletion(userId);

	const view: View = defaultView('admin/user', _('Profile'));
	view.content.user = user;
	view.content.isNew = isNew;
	view.content.buttonTitle = isNew ? _('Create user') : _('Update profile');
	view.content.error = error;
	view.content.postUrl = postUrl;
	view.content.showDisableButton = !isNew && owner.id !== user.id && user.enabled;
	view.content.csrfTag = await createCsrfTag(ctx);

	if (subscription) {
		const lastPaymentAttempt = models.subscription().lastPaymentAttempt(subscription);

		view.content.subscription = subscription;
		view.content.showManageSubscription = !isNew;
		view.content.showUpdateSubscriptionBasic = !isNew && user.account_type !== AccountType.Basic;
		view.content.showUpdateSubscriptionPro = !isNew && user.account_type !== AccountType.Pro;
		view.content.subLastPaymentStatus = lastPaymentAttempt.status;
		view.content.subLastPaymentDate = formatDateTime(lastPaymentAttempt.time);
	}

	view.content.showImpersonateButton = !isNew && user.enabled && user.id !== owner.id;
	view.content.showRestoreButton = !isNew && !user.enabled;
	view.content.showScheduleDeletionButton = !isNew && !isScheduledForDeletion;
	view.content.showResetPasswordButton = !isNew && user.enabled;
	view.content.canShareFolderOptions = yesNoDefaultOptions(user, 'can_share_folder');
	view.content.canUploadOptions = yesNoOptions(user, 'can_upload');
	view.content.hasFlags = !!userFlagViews.length;
	view.content.userFlagViews = userFlagViews;
	view.content.stripePortalUrl = stripePortalUrl();
	view.content.pageTitle = view.content.buttonTitle;

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

router.alias(HttpMethod.POST, 'admin/users/:id', 'admin/users');

interface FormFields {
	id: Uuid;
	post_button: string;
	disable_button: string;
	restore_button: string;
	cancel_subscription_button: string;
	send_account_confirmation_email: string;
	update_subscription_basic_button: string;
	update_subscription_pro_button: string;
	impersonate_button: string;
	stop_impersonate_button: string;
	delete_user_flags: string;
	schedule_deletion_button: string;
}

router.post('admin/users', async (path: SubPath, ctx: AppContext) => {
	let user: User = {};
	const owner = ctx.joplin.owner;
	let userId = userIsMe(path) ? owner.id : path.id;

	try {
		const body = await formParse(ctx.req);
		const fields = body.fields as FormFields;
		const isNew = userIsNew(path);
		if (userIsMe(path)) fields.id = userId;
		user = makeUser(isNew, fields);

		const models = ctx.joplin.models;

		if (fields.post_button) {
			const userToSave: User = models.user().fromApiInput(user);
			await models.user().checkIfAllowed(owner, isNew ? AclAction.Create : AclAction.Update, userToSave);

			if (isNew) {
				const savedUser = await models.user().save(userToSave);
				userId = savedUser.id;
			} else {
				await models.user().save(userToSave, { isNew: false });

				// When changing the password, we also clear all session IDs for
				// that user, except the current one (otherwise they would be
				// logged out).
				if (userToSave.password) await models.session().deleteByUserId(userToSave.id, contextSessionId(ctx));
			}
		} else if (fields.stop_impersonate_button) {
			await stopImpersonating(ctx);
			return redirect(ctx, config().baseUrl);
		} else if (fields.disable_button || fields.restore_button) {
			const user = await models.user().load(path.id);
			await models.user().checkIfAllowed(owner, AclAction.Delete, user);
			await models.userFlag().toggle(user.id, UserFlagType.ManuallyDisabled, !fields.restore_button);
		} else if (fields.send_account_confirmation_email) {
			const user = await models.user().load(path.id);
			await models.user().save({ id: user.id, must_set_password: 1 });
			await models.user().sendAccountConfirmationEmail(user);
		} else if (fields.impersonate_button) {
			await startImpersonating(ctx, userId);
			return redirect(ctx, config().baseUrl);
		} else if (fields.cancel_subscription_button) {
			await cancelSubscriptionByUserId(models, userId);
		} else if (fields.update_subscription_basic_button) {
			await updateSubscriptionType(models, userId, AccountType.Basic);
		} else if (fields.update_subscription_pro_button) {
			await updateSubscriptionType(models, userId, AccountType.Pro);
		} else if (fields.schedule_deletion_button) {
			const deletionDate = Date.now() + 24 * Hour;

			await models.userDeletion().add(userId, deletionDate, {
				processAccount: true,
				processData: true,
			});

			await models.notification().addInfo(owner.id, `User ${user.email} has been scheduled for deletion on ${formatDateTime(deletionDate)}. [View deletion list](${adminUserDeletionsUrl()})`);
		} else if (fields.delete_user_flags) {
			const userFlagTypes: UserFlagType[] = [];
			for (const key of Object.keys(fields)) {
				if (key.startsWith('user_flag_')) {
					const type = Number(key.substr(10));
					userFlagTypes.push(type);
				}
			}

			await models.userFlag().removeMulti(userId, userFlagTypes);
		} else {
			throw new Error('Invalid form button');
		}

		return redirect(ctx, adminUserUrl(userIsMe(path) ? '/me' : `/${userId}`));
	} catch (error) {
		error.message = `Error: Your changes were not saved: ${error.message}`;
		if (error instanceof ErrorForbidden) throw error;
		const endPoint = router.findEndPoint(HttpMethod.GET, 'admin/users/:id');
		return endPoint.handler(path, ctx, user, error);
	}
});

export default router;
