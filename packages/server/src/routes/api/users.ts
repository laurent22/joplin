import { User } from '../../services/database/types';
import { bodyFields, contextSessionId, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { AclAction } from '../../models/BaseModel';
import { uuidgen } from '../../utils/uuid';
import checkCanCreateUser from '../utils/checkCanCreateUser';
import limiterShareInvitations from '../../utils/request/limiterShareInvitations';

const router = new Router(RouteType.Api);

async function fetchUser(path: SubPath, ctx: AppContext): Promise<User> {
	const user = await ctx.joplin.models.user().load(path.id);
	if (!user) throw new ErrorNotFound(`No user with ID ${path.id}`);
	return user;
}

async function postedUserFromContext(ctx: AppContext): Promise<User> {
	return ctx.joplin.models.user().fromApiInput(await bodyFields<Partial<User>>(ctx.req));
}

router.get('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);
	return ctx.joplin.models.user().toApiOutput(user);
});

// "id" in this case is actually the email address. Only needed to invite someone to an encrypted shared notebook, so it
// requires a session and counts as an invitation, as it reveals whether the address has an account.
router.get('api/users/:id/public_key', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);
	await limiterShareInvitations(ctx.joplin.owner.id);

	const user = await ctx.joplin.models.user().loadByEmail(path.id);
	if (!user) return ''; // Don't throw an error to prevent polling the end point

	const ppk = await ctx.joplin.models.user().publicPrivateKey(user.id);
	if (!ppk) return '';

	return {
		id: ppk.id,
		publicKey: ppk.publicKey,
	};
});

router.post('api/users', async (_path: SubPath, ctx: AppContext) => {
	await checkCanCreateUser(ctx.joplin.services, ctx.joplin.models, ctx.joplin.owner);
	const user = await postedUserFromContext(ctx);

	// We set a random password because it's required, but user will have to
	// set it after clicking on the confirmation link.
	user.password = uuidgen();
	user.must_set_password = 1;
	user.email_confirmed = 0;
	const createdUser = await ctx.joplin.models.user().save(user);
	return ctx.joplin.models.user().toApiOutput(await ctx.joplin.models.user().load(createdUser.id));
});

router.get('api/users', async (_path: SubPath, ctx: AppContext) => {
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.List);

	return {
		items: await ctx.joplin.models.user().all(),
		has_more: false,
	};
});

router.del('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Delete, user);
	await ctx.joplin.models.user().delete(user.id);
});

router.patch('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	const fields = await bodyFields<Partial<User> & { current_password?: string }>(ctx.req);
	const postedUser = {
		...ctx.joplin.models.user().fromApiInput(fields),
		id: user.id,
	};
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Update, postedUser);

	// A non-admin changing their own email must confirm it from the new
	// address, as they would from the profile page. Otherwise the account
	// could be moved to an attacker-controlled address with no trace and no
	// notice to the original one.
	const newEmail = !ctx.joplin.owner.is_admin && postedUser.email ? await ctx.joplin.models.user().newEmailToConfirm(user, postedUser.email) : '';
	if (!ctx.joplin.owner.is_admin && (postedUser.password || newEmail)) await ctx.joplin.models.user().checkCurrentPassword(user.id, fields.current_password, ctx.joplin.services);

	if (newEmail) delete postedUser.email;
	await ctx.joplin.models.user().save({ id: user.id, ...postedUser });

	// After saving, since a password change cancels any pending email change
	if (newEmail) await ctx.joplin.models.user().initiateEmailChange(user.id, newEmail);

	// As on the profile page, other sessions and applications must not survive a password change
	if (postedUser.password) {
		await ctx.joplin.models.session().deleteByUserId(user.id, user.id === ctx.joplin.owner.id ? contextSessionId(ctx) : '');
		await ctx.joplin.models.application().deleteByUserId(user.id);
	}
});

export default router;
