import { User } from '../../services/database/types';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { AclAction } from '../../models/BaseModel';
import uuidgen from '../../utils/uuidgen';

const router = new Router(RouteType.Api);

async function fetchUser(path: SubPath, ctx: AppContext): Promise<User> {
	const user = await ctx.joplin.models.user().load(path.id);
	if (!user) throw new ErrorNotFound(`No user with ID ${path.id}`);
	return user;
}

async function postedUserFromContext(ctx: AppContext): Promise<User> {
	return ctx.joplin.models.user().fromApiInput(await bodyFields<any>(ctx.req));
}

router.get('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Read, user);
	return user;
});

router.publicSchemas.push('api/users/:id/public_key');

// "id" in this case is actually the email address
router.get('api/users/:id/public_key', async (path: SubPath, ctx: AppContext) => {
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
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Create);
	const user = await postedUserFromContext(ctx);

	// We set a random password because it's required, but user will have to
	// set it after clicking on the confirmation link.
	user.password = uuidgen();
	user.must_set_password = 1;
	user.email_confirmed = 0;
	const output = await ctx.joplin.models.user().save(user);
	return ctx.joplin.models.user().toApiOutput(output);
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
	await ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, AclAction.Update, user);
	const postedUser = await postedUserFromContext(ctx);
	await ctx.joplin.models.user().save({ id: user.id, ...postedUser });
});

export default router;
