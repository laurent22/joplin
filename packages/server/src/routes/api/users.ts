import { User } from '../../db';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { AclAction } from '../../models/BaseModel';
import uuidgen from '../../utils/uuidgen';

const router = new Router();

async function fetchUser(path: SubPath, ctx: AppContext): Promise<User> {
	const user = await ctx.models.user().load(path.id);
	if (!user) throw new ErrorNotFound(`No user with ID ${path.id}`);
	return user;
}

async function postedUserFromContext(ctx: AppContext): Promise<User> {
	return ctx.models.user().fromApiInput(await bodyFields<any>(ctx.req));
}

router.get('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.models.user().checkIfAllowed(ctx.owner, AclAction.Read, user);
	return user;
});

router.post('api/users', async (_path: SubPath, ctx: AppContext) => {
	await ctx.models.user().checkIfAllowed(ctx.owner, AclAction.Create);
	const user = await postedUserFromContext(ctx);

	// We set a random password because it's required, but user will have to
	// set it by clicking on the confirmation link.
	user.password = uuidgen();
	const output = await ctx.models.user().save(user);
	return ctx.models.user().toApiOutput(output);
});

router.get('api/users', async (_path: SubPath, ctx: AppContext) => {
	await ctx.models.user().checkIfAllowed(ctx.owner, AclAction.List);

	return {
		items: await ctx.models.user().all(),
		has_more: false,
	};
});

router.del('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.models.user().checkIfAllowed(ctx.owner, AclAction.Delete, user);
	await ctx.models.user().delete(user.id);
});

router.patch('api/users/:id', async (path: SubPath, ctx: AppContext) => {
	const user = await fetchUser(path, ctx);
	await ctx.models.user().checkIfAllowed(ctx.owner, AclAction.Update, user);
	const postedUser = await postedUserFromContext(ctx);
	await ctx.models.user().save({ id: user.id, ...postedUser });
});

export default router;
